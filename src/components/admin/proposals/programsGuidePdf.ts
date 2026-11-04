import { jsPDF } from "jspdf";
import logoUrl from "@/assets/logo-black.png";
import { addonNames, footerNote, templates } from "@/lib/proposals";

// Admin-only "Programs & Services" proposal template. Built from the same
// proposal package terms, so wording always matches what proposals quote.
const WEBSITE = "www.teevents.golf";
const EMAIL = "info@teevents.golf";
const PHONE = "(602) 413-1338";
const green = [26, 92, 56] as const;
const gold = [245, 166, 35] as const;
const muted = [70, 80, 74] as const;

const programs: { name: string; tagline: string }[] = [
  { name: "No Cost to Start", tagline: "Launch your tournament with nothing due up front." },
  { name: "Per Event", tagline: "One flat price for a single tournament, with no platform fee." },
  { name: "Per League", tagline: "Season-long tools for league play." },
  { name: "Enterprise", tagline: "An annual plan for golf courses running a full calendar of events." },
  { name: "Hybrid Managed", tagline: "Our team manages your tournament alongside your group." },
  { name: "Full Service Planning", tagline: "We plan and run the event from agreement through event day." },
];

async function loadLogo(): Promise<string | null> {
  try {
    const img = new Image();
    img.src = logoUrl;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext("2d")!.drawImage(img, 0, 0);
    return c.toDataURL("image/png");
  } catch {
    return null;
  }
}

export async function programsGuidePdf(): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const logo = await loadLogo();
  let y = 0;

  const header = () => {
    doc.setFillColor(...green);
    doc.rect(0, 0, W, 16, "F");
    if (logo) doc.addImage(logo, "PNG", 16, 3, 10, 10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text("TeeVents", logo ? 29 : 16, 10.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(WEBSITE, W - 16, 10.5, { align: "right" });
    y = 30;
  };
  const newPage = () => { doc.addPage(); header(); };
  const write = (value: string, size = 10.5, bold = false, color: readonly number[] = muted, indent = 0) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(value, W - 32 - indent) as string[];
    for (const line of lines) {
      if (y > H - 22) newPage();
      doc.text(line, 16 + indent, y);
      y += size * 0.45 + 1.2;
    }
  };
  const label = (value: string) => { y += 3; write(value.toUpperCase(), 9, true, green); y += 0.5; };
  const bullets = (value: string) => {
    for (const part of value.split(/,\s+(?![^()]*\))/).map((s) => s.trim()).filter(Boolean)) {
      if (y > H - 22) newPage();
      doc.setFillColor(...gold);
      doc.circle(18, y - 1.3, 0.9, "F");
      write(part.charAt(0).toUpperCase() + part.slice(1), 10.5, false, muted, 5);
    }
  };

  // Cover
  doc.setFillColor(...green);
  doc.rect(0, 0, W, H, "F");
  if (logo) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(W / 2 - 22, 50, 44, 44, 6, 6, "F");
    doc.addImage(logo, "PNG", W / 2 - 17, 55, 34, 34);
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.text("TeeVents", W / 2, 118, { align: "center" });
  doc.setFontSize(15);
  doc.setTextColor(...gold);
  doc.text("Golf Tournament Programs & Services", W / 2, 130, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(doc.splitTextToSize("Every program includes a dedicated TeeVents rep who builds your event for you.", 140), W / 2, 145, { align: "center" });
  doc.setFillColor(...gold);
  doc.rect(W / 2 - 25, 160, 50, 0.8, "F");
  doc.setFontSize(11);
  doc.text("Prepared for: ______________________________", W / 2, 180, { align: "center" });
  doc.text("Event: ______________________________", W / 2, 190, { align: "center" });
  doc.text("Date: ______________________________", W / 2, 200, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text(WEBSITE, W / 2, H - 30, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(`${EMAIL}  |  ${PHONE}`, W / 2, H - 23, { align: "center" });

  // About & overview
  newPage();
  write("About TeeVents", 20, true, green);
  y += 3;
  write("TeeVents is a golf tournament and event management platform, built for organizers who want one branded page for the whole event, from registration and sponsorships to pairings, live scoring, and check in.");
  y += 2;
  write("We are a team of golf tournament directors, and every plan includes a dedicated rep who builds your event page for you, so you are live in 7 days or less.");
  label("Every program includes");
  bullets("A dedicated TeeVents rep, branded event page built for you, online registration and payments, sponsor tiers, pairings and check in, sponsor and auction tools, live budget tracking");
  label("Programs at a glance");
  for (const p of programs) {
    const t = templates[p.name];
    write(p.name, 11.5, true, green);
    write(`${t.Price}${t["Platform fee"] ? `  —  ${t["Platform fee"].split(".")[0]}` : ""}`, 10, false, muted, 0);
    y += 1.5;
  }

  // One page per program
  for (const p of programs) {
    const t = templates[p.name];
    newPage();
    write(p.name, 22, true, green);
    write(p.tagline, 11.5, false, muted);
    y += 2;
    doc.setFillColor(253, 244, 225);
    const priceLines = doc.splitTextToSize(t.Price, W - 44) as string[];
    const boxH = 8 + priceLines.length * 6;
    doc.roundedRect(16, y, W - 32, boxH, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...green);
    doc.text(priceLines, 22, y + 8);
    y += boxH + 4;
    if (t["Platform fee"]) { label("Platform fee"); write(t["Platform fee"]); }
    if (t.Includes) { label("Includes"); bullets(t.Includes); }
    if (t["Minimum field and lead time"]) { label("Minimum field and lead time"); write(t["Minimum field and lead time"]); }
    if (t.Scope) { label("What we provide"); bullets(t.Scope); }
    if (t["Group handles"]) { label("Your group handles"); bullets(t["Group handles"]); }
    if (t.Limits) { label("Limits"); write(t.Limits); }
    if (t["Payment schedule"]) { label("Payment schedule"); write(t["Payment schedule"]); }
    if (t.Cancellation) { label("Cancellation"); write(t.Cancellation); }
  }

  // Add-ons & next steps
  newPage();
  write("Add-ons", 22, true, green);
  write("Optional upgrades, each $99 one-time per event.", 11.5);
  y += 2;
  for (const a of addonNames) {
    doc.setFillColor(...gold);
    doc.circle(18, y - 1.3, 0.9, "F");
    write(a === "Live Leaderboard and Mobile Scoring" ? `${a} (included with Per Event and up)` : a, 10.5, false, muted, 5);
  }
  y += 3;
  write("Stripe processing is separate: 2.9% plus $0.30, and applies in all cases.", 10);
  y += 8;
  write("Next steps", 18, true, green);
  y += 1;
  bullets("Choose the program that fits your event, schedule a call with your dedicated rep, send your logo and tournament details, we build your page and you are live in 7 days or less");
  y += 6;
  write("Contact", 14, true, green);
  write(`Website: ${WEBSITE}`);
  write(`Email: ${EMAIL}`);
  write(`Phone: ${PHONE}`);
  y += 8;
  write(footerNote, 8.5);

  const count = doc.getNumberOfPages();
  for (let n = 2; n <= count; n++) {
    doc.setPage(n);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(`TeeVents  |  ${WEBSITE}  |  ${EMAIL}`, 16, H - 10);
    doc.text(`${n} / ${count}`, W - 16, H - 10, { align: "right" });
  }
  doc.setProperties({ title: "TeeVents Programs & Services", author: "TeeVents" });
  return doc.output("blob");
}

export async function downloadProgramsGuide() {
  const blob = await programsGuidePdf();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "TeeVents-Programs-and-Services.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
