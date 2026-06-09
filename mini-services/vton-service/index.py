"""
Virtual Try-On Mini Service
===========================
Uses a subprocess worker to communicate with HuggingFace Spaces
(IDM-VTON) via gradio_client. The subprocess isolation prevents
gradio_client crashes from taking down the service.

Port: 3031
"""

import os
import sys
import json
import time
import uuid
import base64
import subprocess
import threading
from pathlib import Path

sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

from flask import Flask, request, jsonify
from flask_cors import CORS

PORT = 3031
IDM_VTON_SPACE = "yisol/IDM-VTON"
MAX_JOB_AGE = 15 * 60
JOB_CLEANUP_INTERVAL = 5 * 60

app = Flask(__name__)
CORS(app, origins="*")

# Increase max content length for large base64 images (50MB)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

jobs = {}
jobs_lock = threading.Lock()


def cleanup_old_jobs():
    while True:
        try:
            time.sleep(JOB_CLEANUP_INTERVAL)
            now = time.time()
            with jobs_lock:
                expired = [jid for jid, job in jobs.items()
                           if now - job.get("created_at", 0) > MAX_JOB_AGE]
                for jid in expired:
                    del jobs[jid]
        except:
            pass


cleanup_thread = threading.Thread(target=cleanup_old_jobs, daemon=True)
cleanup_thread.start()


def data_url_to_file(data_url: str, suffix=".png"):
    """Convert a base64 data URL to a temporary file path."""
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


def process_try_on_subprocess(job_id: str, selfie_path: str, garment_path: str,
                               garment_desc: str, category_slug: str):
    """Run the virtual try-on in a subprocess for crash isolation."""
    try:
        with jobs_lock:
            if job_id in jobs:
                jobs[job_id]["progress"] = "AI is applying the garment to your photo..."

        # Create temp files for IPC
        tmp_dir = Path("/tmp/vton-jobs")
        tmp_dir.mkdir(exist_ok=True)
        input_file = tmp_dir / f"{job_id}_input.json"
        output_file = tmp_dir / f"{job_id}_output.json"

        # Write input for worker
        input_data = {
            "selfie_path": selfie_path,
            "garment_path": garment_path,
            "garment_desc": garment_desc,
        }
        with open(input_file, 'w') as f:
            json.dump(input_data, f)

        # Run the worker subprocess
        worker_script = Path(__file__).parent / "worker.py"
        venv_python = Path(__file__).parent / "venv" / "bin" / "python"

        cmd = [str(venv_python), str(worker_script), str(input_file), str(output_file)]
        print(f"[vton:{job_id}] Starting worker subprocess...", flush=True)

        try:
            proc_result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=200,  # 3 min 20s timeout
            )

            if proc_result.stdout:
                print(f"[vton:{job_id}] Worker stdout: {proc_result.stdout[:500]}", flush=True)
            if proc_result.returncode != 0 and proc_result.stderr:
                print(f"[vton:{job_id}] Worker stderr: {proc_result.stderr[:500]}", flush=True)

        except subprocess.TimeoutExpired:
            with jobs_lock:
                if job_id in jobs:
                    jobs[job_id]["status"] = "failed"
                    jobs[job_id]["error"] = "Worker timed out after 200 seconds"
                    jobs[job_id]["progress"] = "Failed"
            return
        except Exception as run_err:
            with jobs_lock:
                if job_id in jobs:
                    jobs[job_id]["status"] = "failed"
                    jobs[job_id]["error"] = f"Worker failed: {str(run_err)[:200]}"
                    jobs[job_id]["progress"] = "Failed"
            return

        # Read the result
        if output_file.exists():
            with open(output_file, 'r') as f:
                result = json.load(f)

            with jobs_lock:
                if job_id in jobs:
                    jobs[job_id]["status"] = result.get("status", "failed")
                    jobs[job_id]["progress"] = "Complete!" if result.get("status") == "completed" else "Failed"
                    if result.get("imageUrl"):
                        jobs[job_id]["imageUrl"] = result["imageUrl"]
                    if result.get("strategy"):
                        jobs[job_id]["strategy"] = result["strategy"]
                    if result.get("error"):
                        jobs[job_id]["error"] = result["error"]
                    if result.get("elapsed"):
                        jobs[job_id]["elapsed"] = result["elapsed"]

            print(f"[vton:{job_id}] Result: {result.get('status')}", flush=True)
        else:
            with jobs_lock:
                if job_id in jobs:
                    jobs[job_id]["status"] = "failed"
                    jobs[job_id]["error"] = "Worker did not produce output file"
                    jobs[job_id]["progress"] = "Failed"

    except Exception as e:
        print(f"[vton:{job_id}] Error: {e}", flush=True)
        with jobs_lock:
            if job_id in jobs:
                jobs[job_id]["status"] = "failed"
                jobs[job_id]["error"] = str(e)[:500]
                jobs[job_id]["progress"] = "Failed"

    finally:
        # Clean up temp files
        for path in [selfie_path, garment_path, str(input_file), str(output_file)]:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except:
                pass


def get_garment_description(category_slug: str, product_name: str) -> str:
    cat = (category_slug or "").lower()
    name = (product_name or "").lower()

    if "saree" in cat:
        return f"A beautiful {name} saree"
    if "shirt" in cat or "tshirt" in cat or "t-shirt" in cat:
        return f"A {name} shirt"
    if "dress" in cat or "fashion" in cat:
        return f"A {name} dress/outfit"
    if "kurta" in cat:
        return f"A {name} kurta"
    if "jacket" in cat or "coat" in cat:
        return f"A {name} jacket"
    return f"A {name} garment"


# ── API Endpoints ──────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "vton-service",
        "active_jobs": len([j for j in jobs.values() if j.get("status") == "processing"]),
    })


@app.route("/api/try-on", methods=["POST"])
def submit_try_on():
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "No JSON body provided"}), 400

        selfie_data = data.get("selfieData")
        product_image_data = data.get("productImageBase64")
        product_name = data.get("productName", "Product")
        category_slug = data.get("categorySlug", "")

        if not selfie_data:
            return jsonify({"error": "selfieData is required"}), 400
        if not product_image_data:
            return jsonify({"error": "productImageBase64 is required"}), 400

        print(f"[vton] Converting images to files...", flush=True)
        selfie_path = data_url_to_file(selfie_data)
        garment_path = data_url_to_file(product_image_data)
        print(f"[vton] Selfie: {selfie_path}, Garment: {garment_path}", flush=True)

        garment_desc = get_garment_description(category_slug, product_name)

        job_id = f"vton_{int(time.time())}_{uuid.uuid4().hex[:6]}"
        with jobs_lock:
            jobs[job_id] = {
                "status": "processing",
                "progress": "Uploading images to AI model...",
                "productName": product_name,
                "categorySlug": category_slug,
                "created_at": time.time(),
            }

        # Start processing in background thread
        thread = threading.Thread(
            target=process_try_on_subprocess,
            args=(job_id, selfie_path, garment_path, garment_desc, category_slug),
            daemon=True,
        )
        thread.start()

        return jsonify({
            "jobId": job_id,
            "status": "processing",
            "productName": product_name,
            "categorySlug": category_slug,
        })

    except Exception as e:
        print(f"[vton] Submit error: {e}", flush=True)
        return jsonify({"error": str(e)[:300]}), 500


@app.route("/api/try-on", methods=["GET"])
def get_job_status():
    job_id = request.args.get("jobId")
    if not job_id:
        return jsonify({"error": "jobId parameter required"}), 400

    with jobs_lock:
        job = jobs.get(job_id)

    if not job:
        return jsonify({"error": "Job not found", "status": "not_found"}), 404

    response = {
        "jobId": job_id,
        "status": job.get("status", "unknown"),
        "progress": job.get("progress"),
        "productName": job.get("productName"),
        "categorySlug": job.get("categorySlug"),
        "strategy": job.get("strategy"),
    }

    if job.get("imageUrl"):
        response["imageUrl"] = job["imageUrl"]
    if job.get("error"):
        response["error"] = job["error"]

    return jsonify(response)


@app.route("/api/try-on/status", methods=["GET"])
def service_status():
    # Check if gradio_client is importable
    try:
        import gradio_client
        return jsonify({
            "available": True,
            "service": "vton-service",
            "model": IDM_VTON_SPACE,
        })
    except:
        return jsonify({
            "available": False,
            "service": "vton-service",
            "error": "gradio_client not installed",
        })


if __name__ == "__main__":
    print(f"[vton] Starting Virtual Try-On service on port {PORT}", flush=True)
    print(f"[vton] Using model: {IDM_VTON_SPACE}", flush=True)
    print("[vton] Worker subprocess isolation enabled", flush=True)
    app.run(host="0.0.0.0", port=PORT, debug=False, threaded=True)
