import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor, sanitizeHtml } from "@/components/ui/rich-text-editor";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Save, RotateCcw, Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const DEFAULT_CONTENT = `<h1>Demo Agenda – 15 Minute Screen Share</h1>
<h2>Opening (2 minutes) – Addressing Current Pain Points</h2>
<p><em>"I noticed you're currently using [Google Sheets / Eventbrite / another platform]. Those tools work for basic needs, but they weren't built for golf tournaments. Here's what you're missing:"</em></p>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%">
  <thead><tr><th>Pain Point</th><th>TeeVents Solution</th></tr></thead>
  <tbody>
    <tr><td>Spreadsheets / Google Forms</td><td>Automated registration, player database, CSV export</td></tr>
    <tr><td>Eventbrite (no golf features)</td><td>Live leaderboard, hole sponsors, volunteer check-in, pairings</td></tr>
    <tr><td>Manual payment tracking</td><td>Stripe integration – automatic checkout, instant payouts</td></tr>
    <tr><td>No professional website</td><td>Branded tournament site – live in 10 minutes</td></tr>
    <tr><td>No live scoring</td><td>Players enter scores via QR code – leaderboard updates live</td></tr>
    <tr><td>No sponsor management</td><td>Sponsor portal, asset delivery, ROI tracking</td></tr>
  </tbody>
</table>
<p><em>"Let me show you how TeeVents solves all of this in one platform."</em></p>
<h2>Demo – 10 Minutes (Start to Finish)</h2>
<h3>1. Tournament Setup (2 minutes)</h3>
<ul>
  <li><strong>Tournament Details</strong> – name, date, location, fees, pass-to-golfer toggle</li>
  <li><strong>Registration Management</strong> – Custom fields, promo codes, waitlist</li>
  <li><strong>Sponsorship Management</strong> – Sponsor tiers, pricing, benefits</li>
  <li><strong>Players &amp; Pairings</strong> – Import, drag-and-drop pairings, tee times</li>
</ul>
<h3>2. Event Day (3 minutes)</h3>
<ul>
  <li><strong>Live Leaderboard</strong> – Real-time scoring, gross/net toggle, sponsor logos</li>
  <li><strong>Day of Event Page</strong> – Welcome message, tee time, group, announcements</li>
  <li><strong>Scoring</strong> – Players enter scores via QR code – no app download</li>
  <li><strong>Check-In</strong> – Scan QR codes from any phone or tablet</li>
</ul>
<h3>3. Operations (2 minutes)</h3>
<ul>
  <li><strong>Waitlist</strong> – Auto-notify when spots open</li>
  <li><strong>Volunteers</strong> – Shift scheduling, QR check-in</li>
  <li><strong>Messages</strong> – Email and SMS blasts</li>
</ul>
<h3>4. Finance (2 minutes)</h3>
<ul>
  <li><strong>Finances</strong> – Transaction history, fee breakdown, net to organizer</li>
  <li><strong>Payout Settings</strong> – Stripe Connect – automatic payouts</li>
</ul>
<h3>5. Promotion &amp; Post-Event (1 minute)</h3>
<ul>
  <li><strong>Share &amp; Promote</strong> – QR codes, short URLs, social templates</li>
  <li><strong>Flyer Studio</strong> – Canva-integrated templates</li>
  <li><strong>Photo Gallery</strong> – Upload event photos</li>
</ul>
<h2>Closing (3 minutes) – Next Steps</h2>
<p><em>"That's TeeVents in 10 minutes. You get a branded website, automated registration, live scoring, sponsor management, and automatic payouts – all in one place."</em></p>
<h3>Key Takeaways</h3>
<ul>
  <li>✅ <strong>Free to start</strong> – no credit card required</li>
  <li>✅ <strong>No long-term contract</strong> – pay per tournament when you need Pro features</li>
  <li>✅ <strong>5% platform fee</strong> – only when you collect payments</li>
</ul>
<h3>Call to Action</h3>
<ul>
  <li><strong>Option A:</strong> <em>"I can set up your tournament right now in under 5 minutes. Shall we do that?"</em></li>
  <li><strong>Option B:</strong> <em>"I'll send you a link to start your free tournament. You'll have a live website in 10 minutes."</em></li>
</ul>
<h3>Follow-up Email</h3>
<pre>Subject: Your TeeVents demo – next steps

Hi [Name],

Thanks for your time today.

Start your free tournament: https://teevents.golf/get-started
Sample dashboard: https://teevents.golf/sample-dashboard
Book a follow-up: [Calendly link]

Best,
Rod</pre>`;

export default function DemoAgendaEditor() {
  const [content, setContent] = useState("");
  const [rowId, setRowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("demo_agenda" as any)
        .select("id, content")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setRowId((data as any).id);
        setContent((data as any).content || DEFAULT_CONTENT);
      } else {
        setContent(DEFAULT_CONTENT);
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const clean = sanitizeHtml(content);
    const payload: any = { content: clean, updated_by: user?.id, updated_at: new Date().toISOString() };
    let error;
    if (rowId) {
      ({ error } = await supabase.from("demo_agenda" as any).update(payload).eq("id", rowId));
    } else {
      const { data, error: insErr } = await supabase
        .from("demo_agenda" as any).insert(payload).select("id").single();
      error = insErr;
      if (data) setRowId((data as any).id);
    }
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Saved", description: "Demo agenda updated." });
  };

  const handleReset = () => {
    if (confirm("Restore the original template? Your current content will be replaced (you can still Save or not).")) {
      setContent(DEFAULT_CONTENT);
    }
  };

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(previewRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "letter");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 36;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = margin;
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (imgHeight - heightLeft);
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }
      const pageCount = (pdf as any).internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setTextColor(120);
        pdf.text(`TeeVents Demo Agenda — ${new Date().toLocaleDateString()}`, margin, 20);
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 12, { align: "right" });
      }
      pdf.save(`teevents-demo-agenda-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-golf-cream p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-4">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Admin
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Demo Agenda</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" /> Reset to Default
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={downloading}>
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download PDF
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <RichTextEditor value={content} onChange={setContent} />
          </CardContent>
        </Card>

        {/* Hidden render target for PDF generation (styled like the final PDF) */}
        <div className="fixed -left-[10000px] top-0" aria-hidden>
          <div
            ref={previewRef}
            style={{
              width: "720px",
              padding: "32px",
              background: "#ffffff",
              color: "#1a1a1a",
              fontFamily: "Helvetica, Arial, sans-serif",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            <style>{`
              .pdf-body h1 { color:#1a5c38; font-size:24px; margin:0 0 12px; border-bottom:2px solid #1a5c38; padding-bottom:6px; }
              .pdf-body h2 { color:#1a5c38; font-size:18px; margin:20px 0 8px; }
              .pdf-body h3 { color:#1a5c38; font-size:15px; margin:14px 0 6px; }
              .pdf-body p { margin: 6px 0; }
              .pdf-body ul, .pdf-body ol { margin: 6px 0 6px 22px; }
              .pdf-body table { border-collapse: collapse; width: 100%; margin: 8px 0; }
              .pdf-body th, .pdf-body td { border: 1px solid #1a5c38; padding: 6px 8px; text-align: left; vertical-align: top; }
              .pdf-body th { background: #1a5c38; color: #fff; }
              .pdf-body pre { background:#f4f4f4; padding:10px; border-radius:4px; white-space:pre-wrap; font-size:12px; }
            `}</style>
            <div className="pdf-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Tip: changes save to the database — they're shared across admin users.
        </div>
      </div>
    </div>
  );
}
