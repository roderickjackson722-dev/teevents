import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, Image } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import SEO from "@/components/SEO";

const features = [
  { icon: "🏌️", title: "Live Leaderboard", desc: "Real‑time scoring, embed on your website" },
  { icon: "🏆", title: "Sponsor Portal", desc: "Asset delivery, ROI tracking, tax receipts" },
  { icon: "👥", title: "Volunteer Check‑in", desc: "QR codes, shift scheduling, automated reminders" },
  { icon: "📊", title: "Financial Dashboard", desc: "Track registrations, fees, and payouts in real time" },
  { icon: "🔗", title: "Share & Promote", desc: "QR codes, short URLs, social media templates" },
  { icon: "💰", title: "Automatic Payouts", desc: "Payments split at checkout — funds go directly to your Stripe account" },
  { icon: "📱", title: "Mobile Friendly", desc: "Golfers register and pay from any device" },
  { icon: "🎨", title: "Branded Website", desc: "Your logo, your colors, your custom domain" },
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
              width: "70%", opacity: 0.08,
              fontSize: 220, fontWeight: 900,
              color: "#1a5c38", lineHeight: 1,
              textAlign: "center", letterSpacing: "-0.04em",
            }}
          >
            TEEVENTS
          </div>

          {/* Content */}
          <div className="relative z-10" style={{ padding: "40px 48px 32px" }}>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 4, color: "#1a5c38", marginBottom: 4 }}>
                TEEVENTS.GOLF
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: "#1a5c38", margin: "8px 0 16px", lineHeight: 1.15 }}>
                Run Your Golf Tournament Like a Pro
              </h1>
              <div style={{
                display: "inline-block",
                background: "linear-gradient(135deg, #F5A623, #e8960e)",
                color: "#1a5c38",
                padding: "10px 32px",
                borderRadius: 8,
                fontSize: 18,
                fontWeight: 700,
              }}>
                ✨ Start for Free. No money up front. ✨
              </div>
            </div>

            {/* Features Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px 24px",
              marginBottom: 24,
            }}>
              {features.map((f) => (
                <div key={f.title} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{f.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a5c38", marginBottom: 1 }}>{f.title}</div>
                    <div style={{ fontSize: 11.5, color: "#444", lineHeight: 1.35 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cash Flow Box */}
            <div style={{
              background: "#f0faf4",
              border: "2px solid #1a5c38",
              borderRadius: 12,
              padding: "20px 28px",
              textAlign: "center",
              marginBottom: 24,
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#1a5c38", marginBottom: 6 }}>
                JUST $5 PER REGISTRATION
              </div>
              <div style={{ fontSize: 14, color: "#333", marginBottom: 4 }}>
                Payments split automatically at checkout. We never hold your money.
              </div>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 12 }}>
                Stripe sends net proceeds directly to your connected account.
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                maxWidth: 500,
                margin: "0 auto",
                fontSize: 12,
              }}>
                <div style={{ background: "#fff", borderRadius: 8, padding: "12px 16px", border: "1px solid #e0e0e0" }}>
                  <div style={{ fontWeight: 700, color: "#b91c1c", marginBottom: 4 }}>Eventbrite</div>
                  <div style={{ color: "#555" }}>~$8.49 on a $100 reg</div>
                  <div style={{ fontSize: 10, color: "#888" }}>3.5% + $1.79 + processing</div>
                </div>
                <div style={{ background: "#fff", borderRadius: 8, padding: "12px 16px", border: "2px solid #1a5c38" }}>
                  <div style={{ fontWeight: 700, color: "#1a5c38", marginBottom: 4 }}>TeeVents</div>
                  <div style={{ color: "#555" }}>$5 flat + Stripe ($3.20)</div>
                  <div style={{ fontSize: 10, color: "#1a5c38", fontWeight: 600 }}>Save more as prices go up</div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1a5c38", marginBottom: 14 }}>
                Ready to run your best tournament yet?
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
                <a
                  href="https://www.teevents.golf/get-started"
                  style={{
                    display: "inline-block",
                    background: "#1a5c38",
                    color: "#fff",
                    padding: "12px 28px",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 14,
                    textDecoration: "none",
                  }}
                >
                  Start Free Trial
                </a>
                <a
                  href="https://www.teevents.golf/contact"
                  style={{
                    display: "inline-block",
                    background: "#F5A623",
                    color: "#1a5c38",
                    padding: "12px 28px",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 14,
                    textDecoration: "none",
                  }}
                >
                  Book a Live Demo
                </a>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              borderTop: "1px solid #ddd",
              paddingTop: 14,
              textAlign: "center",
              fontSize: 11,
              color: "#888",
            }}>
              <div style={{ marginBottom: 2 }}>
                <span style={{ fontWeight: 600, color: "#1a5c38" }}>www.teevents.golf</span>
                {" · "}
                <span>info@teevents.golf</span>
              </div>
              <div>Professional Golf Tournament Management Software</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SalesFlyer;
