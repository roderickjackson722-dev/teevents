/**
 * Removes a solid/near-solid logo background in the browser with a canvas.
 * Flood-fills from the image edges using the corner color, so it works on
 * every browser (including iPhone Safari) with no AI model download.
 */
export async function removeLogoBackground(imageUrl: string, tolerance = 40): Promise<Blob> {
  const res = await fetch(imageUrl, { mode: "cors" });
  if (!res.ok) throw new Error("Couldn't load the logo image.");
  const bitmapUrl = URL.createObjectURL(await res.blob());
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Couldn't read the logo image."));
      el.src = bitmapUrl;
    });
    const w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) throw new Error("The logo image is empty.");
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser couldn't process the image.");
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;

    // Background color = average of the four corners.
    const corners = [0, w - 1, (h - 1) * w, h * w - 1];
    let br = 0, bg = 0, bb = 0;
    for (const c of corners) { br += px[c * 4]; bg += px[c * 4 + 1]; bb += px[c * 4 + 2]; }
    br /= 4; bg /= 4; bb /= 4;
    const tol2 = tolerance * tolerance * 3;
    const isBg = (i: number) => {
      if (px[i * 4 + 3] < 10) return true;
      const dr = px[i * 4] - br, dg = px[i * 4 + 1] - bg, db = px[i * 4 + 2] - bb;
      return dr * dr + dg * dg + db * db <= tol2;
    };

    const seen = new Uint8Array(w * h);
    const stack: number[] = [];
    for (let x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x); }
    for (let y = 0; y < h; y++) { stack.push(y * w, y * w + w - 1); }
    while (stack.length) {
      const i = stack.pop()!;
      if (seen[i]) continue;
      seen[i] = 1;
      if (!isBg(i)) continue;
      px[i * 4 + 3] = 0;
      const x = i % w, y = (i - x) / w;
      if (x > 0) stack.push(i - 1);
      if (x < w - 1) stack.push(i + 1);
      if (y > 0) stack.push(i - w);
      if (y < h - 1) stack.push(i + w);
    }
    ctx.putImageData(data, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't save the image."))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}
