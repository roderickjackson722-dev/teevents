import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2, QrCode } from "lucide-react";
import { openPrintWindow, downloadHtmlAsPdf } from "./printUtils";
import { getPrimaryColor } from "./types";
import type { Tournament } from "./types";

export interface PrintableAddon {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  is_active: boolean;
}

interface Props {
  tournament: (Tournament & { slug?: string | null }) | null;
  addons: PrintableAddon[];
  loading: boolean;
  /** Which QR codes the organizer enabled in Printables Options. */
  enabled: { walkup: boolean; donation: boolean; addonIds: string[] };
}

const BASE = "https://www.teevents.golf";

export function walkupRegistrationUrl(slug?: string | null) {
  return slug ? `${BASE}/t/${slug}#register` : BASE;
}

export function addonPurchaseUrl(slug: string | null | undefined, addonId: string) {
  return slug ? `${BASE}/t/${slug}?addon=${addonId}#register` : BASE;
}

/** Donation page for the event; falls back to the organization's generic donation page. */
export function donationUrl(slug?: string | null) {
  return slug ? `${BASE}/t/${slug}#donation` : `${BASE}/donate`;
}

function qrImg(url: string, size = 320) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(url)}`;
}

const money = (c: number) => `$${(c / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function QRCodesTab({ tournament, addons, loading, enabled }: Props) {
  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const slug = tournament?.slug || null;
  const color = getPrimaryColor(tournament);

  const cards: { title: string; subtitle: string; url: string }[] = [];
  if (enabled.walkup) {
    cards.push({
      title: "Walk-Up Registration",
      subtitle: "Scan to register on event day",
      url: walkupRegistrationUrl(slug),
    });
  }
  if (enabled.donation) {
    cards.push({
      title: "Donate",
      subtitle: "Scan to support our mission",
      url: donationUrl(slug),
    });
  }
  for (const a of addons) {
    if (!enabled.addonIds.includes(a.id)) continue;
    cards.push({
      title: a.name,
      subtitle: `${money(a.price_cents)} · Scan to purchase`,
      url: addonPurchaseUrl(slug, a.id),
    });
  }


  const printHtml = `
    <h1 style="font-size:22px;margin-bottom:4px;">${tournament?.title ?? ""}</h1>
    <p style="color:#666;font-size:13px;margin-bottom:24px;">Event Day QR Codes</p>
    <div style="display:flex;flex-wrap:wrap;gap:24px;">
      ${cards.map((c) => `
        <div style="width:300px;border:2px solid ${color};border-radius:10px;padding:18px;text-align:center;page-break-inside:avoid;">
          <div style="font-size:18px;font-weight:700;color:${color};margin-bottom:4px;">${c.title}</div>
          <div style="font-size:12px;color:#666;margin-bottom:12px;">${c.subtitle}</div>
          <img src="${qrImg(c.url)}" width="240" height="240" alt="QR code" style="display:block;margin:0 auto;" />
          <div style="font-size:10px;color:#888;margin-top:10px;word-break:break-all;">${c.url}</div>
        </div>
      `).join("")}
    </div>`;

  if (cards.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-lg border border-border">
        <QrCode className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">
          No QR codes selected. Turn on Walk-Up Registration or an add-on in <strong>Printables Options</strong> above.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end gap-2 mb-4">
        <Button variant="outline" onClick={() => downloadHtmlAsPdf(`QR Codes - ${tournament?.title}`, printHtml)}>
          <Download className="h-4 w-4 mr-2" /> Save as PDF
        </Button>
        <Button onClick={() => openPrintWindow(`QR Codes - ${tournament?.title}`, printHtml)}>
          <Printer className="h-4 w-4 mr-2" /> Print QR Codes
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.url} className="bg-card rounded-lg border border-border p-5 text-center">
            <h3 className="font-display font-bold text-foreground">{c.title}</h3>
            <p className="text-xs text-muted-foreground mb-3">{c.subtitle}</p>
            <img src={qrImg(c.url, 220)} alt={`QR code for ${c.title}`} className="mx-auto h-40 w-40" loading="lazy" />
            <p className="text-[10px] text-muted-foreground mt-3 break-all">{c.url}</p>
          </div>
        ))}
      </div>
    </>
  );
}
