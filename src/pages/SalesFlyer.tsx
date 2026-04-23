import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, Image } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import SEO from "@/components/SEO";

const leftFeatures = [
  "Custom tournament website – branded, live in 10 minutes",
  "Online registration with credit card, Apple Pay & Google Pay",
  "QR code check‑in – players scan from their phone",
  "Live leaderboard – real‑time gross & net scores",
  "Automatic payout to your bank account (Stripe Connect)",
  "Printable scorecards with player handicap strokes (dots per hole)",
];

const rightFeatures = [
  "USGA handicap calculation – course handicap, net scores, stroke allocation",
  "Sponsor portal – sponsors upload logos, download tax receipts, track ROI",
  "QR scoring – players enter their own scores via unique code (no app install)",
  "Volunteer shift scheduling & QR check‑in",
  "Test scoring simulator – practice running the event before go‑live",
  "Custom tournament URL – yourclub.teevents/classic",
];

const SalesFlyer = () => {
  const flyerRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const captureFlyer = async (scale: number) => {
    if (!flyerRef.current) return null;
    return html2canvas(flyerRef.current, {
      scale,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: flyerRef.current.scrollWidth,
      height: flyerRef.current.scrollHeight,
    });
  };

  const downloadPDF = async () => {
    setDownloading("pdf");
    try {
      const canvas = await captureFlyer(2);
      if (!canvas) return;
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "in", format: "letter" });
      pdf.addImage(imgData, "PNG", 0, 0, 8.5, 11);
      pdf.save("TeeVents-Sales-Flyer.pdf");
    } finally {
      setDownloading(null);
    }
  };

  const downloadPNG = async () => {
    setDownloading("png");
    try {
      const canvas = await captureFlyer(3);
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = "TeeVents-Sales-Flyer.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(null);
    }
  };

  const CheckItem = ({ text }: { text: string }) => (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 10 }}>
      <span style={{
        flexShrink: 0,
        width: 18, height: 18,
        borderRadius: 4,
        background: "#1a5c38",
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1,
        marginTop: 1,
      }}>✓</span>
      <span style={{ fontSize: 11.5, color: "#1F2937", lineHeight: 1.4 }}>{text}</span>
    </div>
  );

  return (
    <>
      <SEO title="Sales Flyer – TeeVents" description="Download the TeeVents one-page sales flyer." />

      {/* Download bar */}
      <div className="sticky top-0 z-50 bg-background border-b py-3 px-4 flex items-center justify-center gap-4 print:hidden">
        <Button onClick={downloadPDF} disabled={!!downloading} className="gap-2 bg-[#1a5c38] hover:bg-[#1a5c38]/90 text-white">
          <FileText className="h-4 w-4" />
          {downloading === "pdf" ? "Generating…" : "Download PDF"}
        </Button>
        <Button onClick={downloadPNG} disabled={!!downloading} variant="outline" className="gap-2 border-[#1a5c38] text-[#1a5c38] hover:bg-[#1a5c38] hover:text-white">
          <Image className="h-4 w-4" />
          {downloading === "png" ? "Generating…" : "Download PNG"}
        </Button>
      </div>

      {/* Flyer container – fixed letter-size aspect ratio */}
      <div className="flex justify-center py-8 px-4 print:p-0 bg-muted print:bg-transparent">
        <div
          ref={flyerRef}
          className="relative bg-white shadow-xl print:shadow-none overflow-hidden"
          style={{ width: 816, minHeight: 1056, fontFamily: "'Inter', 'Montserrat', sans-serif" }}
        >
          {/* Watermark */}
          <div
            className="absolute pointer-events-none select-none"
            style={{
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: "70%", opacity: 0.06,
              fontSize: 220, fontWeight: 900,
              color: "#1a5c38", lineHeight: 1,
              textAlign: "center", letterSpacing: "-0.04em",
            }}
          >
            TEEVENTS
          </div>

          {/* Content */}
          <div className="relative z-10" style={{ padding: "44px 52px 32px" }}>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <h1 style={{ fontSize: 38, fontWeight: 900, color: "#1a5c38", margin: 0, lineHeight: 1.05, letterSpacing: "-0.01em" }}>
                TEEVENTS GOLF
              </h1>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#1F2937", marginTop: 6 }}>
                Run Your Tournament Like a Pro
              </div>
            </div>

            {/* Tagline */}
            <div style={{
              textAlign: "center",
              fontSize: 22,
              fontWeight: 800,
              color: "#1a5c38",
              marginBottom: 8,
              letterSpacing: "-0.01em",
            }}>
              Start for free. Pay only when you get paid.
            </div>

            {/* Subhead */}
            <div style={{
              textAlign: "center",
              fontSize: 13,
              fontStyle: "italic",
              color: "#4B5563",
              marginBottom: 22,
              maxWidth: 620,
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: 1.4,
            }}>
              The all‑in‑one platform for golf tournaments. No upfront cost. No monthly fees. Just 5% per registration.
            </div>

            {/* Two-column checkbox grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 28px",
              marginBottom: 22,
              padding: "18px 22px",
              background: "#f9fafb",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
            }}>
              <div>
                {leftFeatures.map((f, i) => <CheckItem key={`l-${i}`} text={f} />)}
              </div>
              <div>
                {rightFeatures.map((f, i) => <CheckItem key={`r-${i}`} text={f} />)}
              </div>
            </div>

            {/* Comparison line */}
            <div style={{
              textAlign: "center",
              fontSize: 16,
              fontWeight: 700,
              fontStyle: "italic",
              color: "#1F2937",
              marginBottom: 22,
            }}>
              0 spreadsheets. 0 hassle. 100% all‑in‑one.
            </div>

            {/* CTA Button */}
            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <a
                href="https://www.teevents.golf/book"
                style={{
                  display: "inline-block",
                  background: "#F5A623",
                  color: "#1a5c38",
                  padding: "14px 36px",
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: 16,
                  textDecoration: "none",
                  boxShadow: "0 4px 12px rgba(245, 166, 35, 0.3)",
                }}
              >
                📅 Book a 30‑Min Demo
              </a>
            </div>

            {/* Footer */}
            <div style={{
              borderTop: "1px solid #e5e7eb",
              paddingTop: 14,
              textAlign: "center",
              fontSize: 11,
              color: "#1a5c38",
            }}>
              <div style={{ marginBottom: 3, fontWeight: 600 }}>
                No monthly fees. 5% platform fee per transaction. Free Base plan available.
              </div>
              <div style={{ color: "#6B7280" }}>teevents.golf/demo</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SalesFlyer;
