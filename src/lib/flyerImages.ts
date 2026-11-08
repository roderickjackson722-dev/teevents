export async function flyerImages(file: File): Promise<string[]> {
  if (file.type === "application/pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const pdf = await task.promise;
    try {
      if (pdf.numPages > 10) throw new Error("This flyer has too many pages to read safely. Enter the details by hand.");
      const images: string[] = [];
      for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
        const page = await pdf.getPage(pageNo);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(2, 2000 / Math.max(base.width, base.height)) });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        const canvasContext = canvas.getContext("2d");
        if (!canvasContext) throw new Error("PDF preview unavailable");
        await page.render({ canvas, canvasContext, viewport }).promise;
        images.push(canvas.toDataURL("image/jpeg", .9));
        page.cleanup();
      }
      return images;
    } finally { await task.destroy(); }
  }
  if (!["image/jpeg", "image/png"].includes(file.type)) throw new Error("Choose a JPG, PNG or PDF flyer.");
  return [await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Unreadable flyer")); reader.onerror = () => reject(new Error("Unreadable flyer")); reader.readAsDataURL(file); })];
}