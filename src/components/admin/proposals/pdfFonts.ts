import type { jsPDF } from "jspdf";

// Proposal PDFs use EB Garamond (served from /fonts). Falls back to Times if it can't load.
let cache: Promise<[string, string] | null> | null = null;
function toB64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function load() {
  cache ??= Promise.all(["/fonts/EBGaramond-Regular.ttf", "/fonts/EBGaramond-Bold.ttf"].map(async (u) => {
    const r = await fetch(u);
    if (!r.ok) throw new Error("font");
    return toB64(await r.arrayBuffer());
  })).then((v) => v as [string, string]).catch(() => { cache = null; return null; });
  return cache;
}
/** Registers Garamond on the document and returns the font family name to use. */
export async function loadGaramond(doc: jsPDF): Promise<string> {
  const f = await load();
  if (!f) return "times";
  doc.addFileToVFS("EBGaramond-Regular.ttf", f[0]);
  doc.addFont("EBGaramond-Regular.ttf", "Garamond", "normal");
  doc.addFileToVFS("EBGaramond-Bold.ttf", f[1]);
  doc.addFont("EBGaramond-Bold.ttf", "Garamond", "bold");
  return "Garamond";
}
