/**
 * Image processing utilities for high-fidelity logo uploads and PDF generation.
 * Guarantees zero distortion, preserved natural aspect ratio, and flawless cross-format compatibility (PNG, JPG, WebP, SVG).
 */

export interface ImageInfo {
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
  format: 'PNG' | 'JPEG';
}

/**
 * Normalizes an uploaded image file into a high-quality, distortion-free PNG Data URL.
 * Preserves transparency and natural aspect ratio while constraining maximum dimension
 * to prevent localStorage overflows and jsPDF CRC / encoding bugs.
 */
export async function processUploadedImageFile(
  file: File | Blob,
  maxDimension = 1200
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem.'));
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      if (!rawDataUrl) {
        return reject(new Error('Imagem vazia ou inválida.'));
      }

      if (typeof window === 'undefined' || typeof Image === 'undefined') {
        return resolve(rawDataUrl);
      }

      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;

        if (!w || !h) {
          return resolve(rawDataUrl);
        }

        try {
          // Calculate contained scale
          const scale = Math.min(1, maxDimension / Math.max(w, h));
          const targetW = Math.max(1, Math.round(w * scale));
          const targetH = Math.max(1, Math.round(h * scale));

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            return resolve(rawDataUrl);
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetW, targetH);

          // Convert to clean PNG format supported 100% by jsPDF
          const cleanPng = canvas.toDataURL('image/png');
          resolve(cleanPng);
        } catch {
          // Fallback to original data URL if canvas has issues
          resolve(rawDataUrl);
        }
      };

      img.onerror = () => {
        // Return raw data URL as fallback
        resolve(rawDataUrl);
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Preloads and inspects any image (data URL or web URL) to extract its true natural dimensions
 * and normalize it for jsPDF without distortion.
 */
export async function prepareImageForPdf(
  src?: string | null,
  maxDimension = 1200
): Promise<ImageInfo | null> {
  if (!src || typeof src !== 'string' || !src.trim()) {
    return null;
  }
  const cleanSrc = src.trim();

  if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const naturalW = img.naturalWidth || img.width;
        const naturalH = img.naturalHeight || img.height;

        if (!naturalW || !naturalH || naturalW <= 0 || naturalH <= 0) {
          return resolve(null);
        }

        const aspect = naturalW / naturalH;

        try {
          const scale = Math.min(1, maxDimension / Math.max(naturalW, naturalH));
          const targetW = Math.max(1, Math.round(naturalW * scale));
          const targetH = Math.max(1, Math.round(naturalH * scale));

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, targetW, targetH);
            const pngData = canvas.toDataURL('image/png');

            return resolve({
              dataUrl: pngData,
              width: targetW,
              height: targetH,
              aspectRatio: aspect,
              format: 'PNG',
            });
          }
        } catch {
          // If canvas fails (e.g. cross-origin taint on external URLs)
        }

        // Return direct image info with detected natural aspect ratio
        resolve({
          dataUrl: cleanSrc,
          width: naturalW,
          height: naturalH,
          aspectRatio: aspect,
          format: cleanSrc.includes('image/jpeg') || cleanSrc.includes('image/jpg') ? 'JPEG' : 'PNG',
        });
      };

      img.onerror = () => resolve(null);
      img.src = cleanSrc;
    });
  }

  // Fallback for SSR / Node
  const binaryDim = decodeBinaryDimensions(cleanSrc);
  if (binaryDim && binaryDim.width > 0 && binaryDim.height > 0) {
    return {
      dataUrl: cleanSrc,
      width: binaryDim.width,
      height: binaryDim.height,
      aspectRatio: binaryDim.width / binaryDim.height,
      format: cleanSrc.includes('image/jpeg') || cleanSrc.includes('image/jpg') ? 'JPEG' : 'PNG',
    };
  }

  return null;
}

/**
 * Pure binary header parser for PNG, GIF, JPEG and WebP as an offline/Node fallback.
 */
function decodeBinaryDimensions(dataUrl: string): { width: number; height: number } | null {
  try {
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    const binary = atob(base64);
    const len = binary.length;

    // PNG
    if (
      binary.charCodeAt(0) === 0x89 &&
      binary.charCodeAt(1) === 0x50 &&
      binary.charCodeAt(2) === 0x4e &&
      binary.charCodeAt(3) === 0x47
    ) {
      const width =
        ((binary.charCodeAt(16) & 0xff) << 24) |
        ((binary.charCodeAt(17) & 0xff) << 16) |
        ((binary.charCodeAt(18) & 0xff) << 8) |
        (binary.charCodeAt(19) & 0xff);
      const height =
        ((binary.charCodeAt(20) & 0xff) << 24) |
        ((binary.charCodeAt(21) & 0xff) << 16) |
        ((binary.charCodeAt(22) & 0xff) << 8) |
        (binary.charCodeAt(23) & 0xff);
      if (width > 0 && height > 0) return { width: Math.abs(width), height: Math.abs(height) };
    }

    // GIF
    if (binary.charCodeAt(0) === 0x47 && binary.charCodeAt(1) === 0x49 && binary.charCodeAt(2) === 0x46) {
      const width = (binary.charCodeAt(6) & 0xff) | ((binary.charCodeAt(7) & 0xff) << 8);
      const height = (binary.charCodeAt(8) & 0xff) | ((binary.charCodeAt(9) & 0xff) << 8);
      if (width > 0 && height > 0) return { width, height };
    }

    // JPEG
    if (binary.charCodeAt(0) === 0xff && binary.charCodeAt(1) === 0xd8) {
      let offset = 2;
      while (offset < len - 8) {
        if (binary.charCodeAt(offset) !== 0xff) {
          offset++;
          continue;
        }
        const marker = binary.charCodeAt(offset + 1);
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          const height = ((binary.charCodeAt(offset + 5) & 0xff) << 8) | (binary.charCodeAt(offset + 6) & 0xff);
          const width = ((binary.charCodeAt(offset + 7) & 0xff) << 8) | (binary.charCodeAt(offset + 8) & 0xff);
          if (width > 0 && height > 0) return { width, height };
        }
        const blockLen = ((binary.charCodeAt(offset + 2) & 0xff) << 8) | (binary.charCodeAt(offset + 3) & 0xff);
        offset += 2 + blockLen;
      }
    }

    // WebP
    if (binary.substring(0, 4) === 'RIFF' && binary.substring(8, 12) === 'WEBP') {
      if (binary.substring(12, 16) === 'VP8 ') {
        const width = ((binary.charCodeAt(26) & 0xff) | ((binary.charCodeAt(27) & 0xff) << 8)) & 0x3fff;
        const height = ((binary.charCodeAt(28) & 0xff) | ((binary.charCodeAt(29) & 0xff) << 8)) & 0x3fff;
        if (width > 0 && height > 0) return { width, height };
      } else if (binary.substring(12, 16) === 'VP8L') {
        const b0 = binary.charCodeAt(21) & 0xff;
        const b1 = binary.charCodeAt(22) & 0xff;
        const b2 = binary.charCodeAt(23) & 0xff;
        const b3 = binary.charCodeAt(24) & 0xff;
        const width = 1 + (((b1 & 0x3f) << 8) | b0);
        const height = 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
        if (width > 0 && height > 0) return { width, height };
      }
    }
  } catch {
    // ignore
  }
  return null;
}
