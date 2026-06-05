/**
 * Client-side watermark utility — NO sharp dependency.
 *
 * Adds a "3BOXES GIFTS" watermark to an image using the Canvas API.
 * This replaces the previous server-side Sharp-based watermark to avoid
 * the Vercel 250MB serverless function limit caused by sharp's native binary.
 *
 * The watermark is placed at the bottom-right corner with some padding.
 *
 * @param imageDataUrl - Base64 data URL of the image (e.g., "data:image/png;base64,...")
 * @returns Watermarked image as a base64 data URL
 */
export async function addWatermark(imageDataUrl: string): Promise<string> {
  try {
    // Load the image into an HTMLImageElement (works in browser/JSdom)
    const img = await loadImage(imageDataUrl);
    const width = img.naturalWidth || 800;
    const height = img.naturalHeight || 1000;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('[watermark] Canvas not available, returning original');
      return imageDataUrl;
    }

    // Draw the original image
    ctx.drawImage(img, 0, 0, width, height);

    // ── Draw watermark at the bottom-right ──
    const wmWidth = Math.max(Math.floor(width * 0.35), 150);
    const wmHeight = Math.max(Math.floor(height * 0.08), 40);
    const padding = Math.max(Math.floor(height * 0.02), 10);
    const wmX = Math.max(width - wmWidth - padding, 0);
    const wmY = Math.max(height - wmHeight - padding, 0);

    // Background rectangle
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.roundRect(wmX, wmY, wmWidth, wmHeight, 4);
    ctx.fill();
    ctx.restore();

    // Main text: "3BOXES GIFTS"
    const fontSize = Math.max(Math.floor(wmHeight * 0.55), 14);
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#daa520';
    ctx.fillText('3BOXES GIFTS', wmX + wmWidth / 2, wmY + wmHeight * 0.42 + fontSize * 0.35);
    ctx.restore();

    // Sub text: "AI Style Preview"
    const subFontSize = Math.max(Math.floor(wmHeight * 0.3), 8);
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.font = `${subFontSize}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#daa520';
    ctx.fillText('AI Style Preview', wmX + wmWidth / 2, wmY + wmHeight * 0.78 + subFontSize * 0.35);
    ctx.restore();

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('[watermark] Failed to add watermark, returning original:', err);
    return imageDataUrl;
  }
}

/** Helper: Load an image from a data URL */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image for watermark`));
    img.src = src;
  });
}
