// Client-side image validation + resize/compression for sponsor logos.

export interface ProcessImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  maxBytes?: number; // input size cap
  outputMime?: "image/png" | "image/jpeg" | "image/webp";
  quality?: number; // 0-1 for jpeg/webp
}

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export async function validateAndProcessLogo(
  file: File,
  opts: ProcessImageOptions = {},
): Promise<File> {
  const {
    maxWidth = 600,
    maxHeight = 300,
    maxBytes = 8 * 1024 * 1024, // 8 MB input cap
    outputMime = "image/png",
    quality = 0.92,
  } = opts;

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Unsupported file type. Use PNG, JPG, WebP, or SVG.");
  }
  if (file.size > maxBytes) {
    throw new Error(`File too large. Max ${Math.round(maxBytes / 1024 / 1024)}MB.`);
  }
  // SVG: pass through (vector, no resizing needed)
  if (file.type === "image/svg+xml") return file;

  const dataUrl: string = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const img: HTMLImageElement = await new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("Image could not be decoded."));
    im.src = dataUrl;
  });

  const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported in this browser.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  const blob: Blob = await new Promise((res, rej) => {
    canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error("Could not encode image."))),
      outputMime,
      quality,
    );
  });

  const ext = outputMime === "image/jpeg" ? "jpg" : outputMime === "image/webp" ? "webp" : "png";
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.${ext}`, { type: outputMime });
}
