"""
Virtual Try-On Worker Script — HTTP-based
==========================================
Uses direct HTTP requests to communicate with the IDM-VTON HuggingFace Space.
Avoids gradio_client download issues by capturing SSE data directly.

Usage: python worker.py <input_file> <output_file>

Input file format:
{
  "selfie_data": "data:image/jpeg;base64,...",
  "garment_data": "data:image/jpeg;base64,...",
  "garment_desc": "A blue shirt",
  "job_id": "vton_123_abc"
}

Output file format:
{
  "status": "completed" | "failed",
  "imageUrl": "data:image/png;base64,...",
  "strategy": "hf-idm-vton",
  "error": "error message",
  "elapsed": 12.5
}
"""

import json
import base64
import time
import sys
import os
import uuid
import traceback
from pathlib import Path

sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

import httpx

IDM_VTON_SPACE = "https://yisol-idm-vton.hf.space"


def data_url_to_file(data_url: str) -> str:
    """Convert a base64 data URL to a temporary file path."""
    suffix = ".png"
    if "," in data_url:
        header, b64_data = data_url.split(",", 1)
        if "image/jpeg" in header or "image/jpg" in header:
            suffix = ".jpg"
        elif "image/webp" in header:
            suffix = ".webp"
    else:
        b64_data = data_url

    image_data = base64.b64decode(b64_data)
    tmp_dir = Path("/tmp/vton-uploads")
    tmp_dir.mkdir(exist_ok=True)
    tmp_path = tmp_dir / f"{uuid.uuid4().hex}{suffix}"
    tmp_path.write_bytes(image_data)
    return str(tmp_path)


def upload_image(filepath: str) -> str:
    """Upload an image to the Gradio Space and return the server file path."""
    with open(filepath, 'rb') as f:
        files = {'files': (os.path.basename(filepath), f, 'image/jpeg')}
        resp = httpx.post(f"{IDM_VTON_SPACE}/upload", files=files, timeout=30)
    result = resp.json()
    if isinstance(result, list) and len(result) > 0:
        return result[0]
    raise Exception(f"Upload failed: {resp.text[:200]}")


def try_on(input_file: str, output_file: str):
    """Main try-on processing function."""
    with open(input_file) as f:
        job_data = json.load(f)

    selfie_path = data_url_to_file(job_data["selfie_data"])
    garment_path = data_url_to_file(job_data["garment_data"])
    garment_desc = job_data.get("garment_desc", "A garment")

    result = {"status": "failed", "error": "Unknown error"}

    try:
        # Step 1: Upload images
        print(f"[worker] Uploading images...", flush=True)
        human_server_path = upload_image(selfie_path)
        garment_server_path = upload_image(garment_path)
        print(f"[worker] Human: {human_server_path}", flush=True)
        print(f"[worker] Garment: {garment_server_path}", flush=True)

        # Step 2: Submit prediction using queue/join with session_hash
        session_hash = f"s_{uuid.uuid4().hex[:12]}"

        submit_payload = {
            "data": [
                {
                    "background": {"path": human_server_path, "meta": {"_type": "gradio.FileData"}},
                    "layers": [],
                    "composite": None
                },
                {"path": garment_server_path, "meta": {"_type": "gradio.FileData"}},
                garment_desc,
                True,   # auto-masking
                False,  # no crop
                30,     # denoise steps
                42,     # seed
            ],
            "fn_index": 0,
            "session_hash": session_hash,
        }

        print(f"[worker] Submitting prediction (session: {session_hash})...", flush=True)
        submit_resp = httpx.post(
            f"{IDM_VTON_SPACE}/queue/join",
            json=submit_payload,
            headers={"x-gradio-user": "api"},
            timeout=30,
        )

        if submit_resp.status_code != 200:
            result = {"status": "failed", "error": f"Submit failed ({submit_resp.status_code}): {submit_resp.text[:200]}"}
            return

        event_id = submit_resp.json().get("event_id")
        print(f"[worker] Event ID: {event_id}", flush=True)

        # Step 3: Stream SSE results
        print(f"[worker] Streaming SSE results...", flush=True)
        start_time = time.time()

        with httpx.stream(
            "GET",
            f"{IDM_VTON_SPACE}/queue/data",
            params={"session_hash": session_hash},
            headers={"x-gradio-user": "api"},
            timeout=200,
        ) as response:
            buffer = ""
            for chunk in response.iter_text():
                buffer += chunk

                # Process complete SSE events (separated by double newlines)
                while "\n\n" in buffer:
                    event_text, buffer = buffer.split("\n\n", 1)
                    for line in event_text.split("\n"):
                        if line.startswith("data: "):
                            try:
                                data = json.loads(line[6:])
                                msg = data.get("msg", "")

                                if msg == "process_completed":
                                    print(f"[worker] Process completed! success={data.get('success')}", flush=True)
                                    output = data.get("output", {})

                                    if data.get("success") and output:
                                        output_data = output.get("data", [])
                                        if output_data and len(output_data) > 0:
                                            image_info = output_data[0]

                                            # Try to get the image URL/path
                                            image_url = None
                                            if isinstance(image_info, dict):
                                                image_url = image_info.get("url") or image_info.get("path")
                                            elif isinstance(image_info, str):
                                                image_url = image_info

                                            if image_url:
                                                # Build full URL
                                                if not image_url.startswith("http"):
                                                    if image_url.startswith("/"):
                                                        full_url = f"{IDM_VTON_SPACE}{image_url}"
                                                    else:
                                                        full_url = f"{IDM_VTON_SPACE}/file={image_url}"
                                                else:
                                                    full_url = image_url

                                                print(f"[worker] Downloading from: {full_url[:100]}...", flush=True)

                                                # Try to download the result image
                                                try:
                                                    img_resp = httpx.get(full_url, timeout=30, follow_redirects=True)
                                                    if img_resp.status_code == 200:
                                                        img_data = img_resp.content
                                                        b64 = base64.b64encode(img_data).decode()
                                                        ct = img_resp.headers.get("content-type", "image/png")
                                                        mime = ct.split(";")[0].strip()

                                                        result = {
                                                            "status": "completed",
                                                            "imageUrl": f"data:{mime};base64,{b64}",
                                                            "strategy": "hf-idm-vton",
                                                            "elapsed": time.time() - start_time,
                                                        }
                                                        print(f"[worker] SUCCESS! Image: {len(img_data)} bytes", flush=True)
                                                    else:
                                                        result = {"status": "failed", "error": f"Download failed ({img_resp.status_code})"}
                                                except Exception as dl_err:
                                                    result = {"status": "failed", "error": f"Download error: {str(dl_err)[:200]}"}
                                            else:
                                                result = {"status": "failed", "error": "No image URL in output"}
                                        else:
                                            result = {"status": "failed", "error": "No output data in response"}
                                    else:
                                        error_msg = output.get("error") or "Model processing failed (success=false)"
                                        result = {"status": "failed", "error": str(error_msg)[:300]}

                                elif msg == "unexpected_error":
                                    result = {"status": "failed", "error": data.get("message", "Unexpected error")[:300]}

                            except json.JSONDecodeError:
                                pass

        if time.time() - start_time > 180:
            result = {"status": "failed", "error": "Timeout after 180 seconds"}

    except Exception as e:
        result = {"status": "failed", "error": str(e)[:500]}
        traceback.print_exc(file=sys.stderr)
    finally:
        # Clean up temp files
        for path in [selfie_path, garment_path]:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except:
                pass

    # Write result
    with open(output_file, 'w') as f:
        json.dump(result, f)
    print(f"[worker] Result written to {output_file}", flush=True)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python worker.py <input_file> <output_file>", file=sys.stderr)
        sys.exit(1)
    try_on(sys.argv[1], sys.argv[2])
