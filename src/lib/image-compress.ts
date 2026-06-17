/**
 * Compresses a base64 data URL image for gallery submission.
 * Reduces size to fit within Vercel's serverless function body limits (~4.5MB).
 */

interface CompressionResult {
  dataUrl: string;
  originalSizeKB: number;
  compressedSizeKB: number;
  compressionRatio: number;
}

function getDataUrlSizeKB(dataUrl: string): number {
  // Base64 is ~4/3 of the original binary size
  const base64 = dataUrl.split(',')[1] || '';
  return Math.round((base64.length * 3) / 4 / 1024);
}

export async function compressImageForGallery(
  dataUrl: string,
  maxDimension: number = 1024,
  targetSizeKB: number = 800
): Promise<CompressionResult> {
  const originalSizeKB = getDataUrlSizeKB(dataUrl);

  // If already small enough, return as-is
  if (originalSizeKB <= targetSizeKB) {
    return { dataUrl, originalSizeKB, compressedSizeKB: originalSizeKB, compressionRatio: 1 };
  }

  // SSR check
  if (typeof document === 'undefined') {
    return { dataUrl, originalSizeKB, compressedSizeKB: originalSizeKB, compressionRatio: 1 };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let width = img.naturalWidth;
      let height = img.naturalHeight;

      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ dataUrl, originalSizeKB, compressedSizeKB: originalSizeKB, compressionRatio: 1 });
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Try progressively lower quality levels
      const qualityLevels = [0.75, 0.6, 0.45, 0.3, 0.2];
      let result = dataUrl;
      let resultSizeKB = originalSizeKB;

      for (const quality of qualityLevels) {
        const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
        const sizeKB = getDataUrlSizeKB(jpegDataUrl);

        if (sizeKB <= targetSizeKB || quality === qualityLevels[qualityLevels.length - 1]) {
          result = jpegDataUrl;
          resultSizeKB = sizeKB;
          break;
        }
      }

      resolve({
        dataUrl: result,
        originalSizeKB,
        compressedSizeKB: resultSizeKB,
        compressionRatio: Math.round((resultSizeKB / originalSizeKB) * 100) / 100,
      });
    };

    img.onerror = () => {
      // If image loading fails, return original
      resolve({ dataUrl, originalSizeKB, compressedSizeKB: originalSizeKB, compressionRatio: 1 });
    };

    img.src = dataUrl;
  });
}
