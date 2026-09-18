import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Gift, Handshake, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

const PARTNERS = [
  { name: "Course & club suppliers", body: "Tee gifts, signage and on-course prizing from vetted partners." },
  { name: "Payment processing", body: "Card, Apple Pay and Google Pay on every sign-up, paid straight to your account." },
  { name: "Print & apparel", body: "Banners, cart signs and team apparel produced from your event branding." },
];

const WHATS_NEW = [
  { date: "This month", body: "Enterprise dashboard with single round, multi-round, Ryder Cup, bracket and round robin events." },
  { date: "This month", body: "Scorecard templates with scan-to-score QR codes, birdie circles and a skins strip." },
  { date: "Recently", body: "Spreadsheet import with column mapping and TBD players." },
];

export default function EnterpriseResources() {
  const { section } = useParams<{ section: string }>();
  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState("");

  const titleMap: Record<string, { title: string; description: string }> = {
    partners: { title: "Partners", description: "Companies we work with to make your events easier to run." },
    "whats-new": { title: "What's New", description: "Recent additions to your enterprise dashboard." },
    feedback: { title: "Feedback", description: "Tell us what would make this easier — we read every note." },
    "earn-300": { title: "Earn $300", description: "Refer another club or organization and earn $300 when they run their first event." },
  };
  const key = section && titleMap[section] ? section : "partners";
  const meta = titleMap[key];

  return (
    <EnterpriseLayout title={meta.title} description={meta.description} crumbs={[{ label: "Resources" }, { label: meta.title }]}>
      {key === "partners" && (
        <div className="grid gap-4 sm:grid-cols-3">
          {PARTNERS.map((p) => (
            <Card key={p.name}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base"><Handshake className="h-4 w-4 text-secondary" /> {p.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{p.body}</p>
                <Button asChild variant="outline" size="sm"><Link to="/contact">Ask about this</Link></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {key === "whats-new" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-secondary" /> Latest updates</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {WHATS_NEW.map((n, i) => (
              <div key={i} className="py-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{n.date}</p>
                <p className="text-sm">{n.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {key === "feedback" && (
        <Card className="max-w-xl">
          <CardHeader className="pb-3"><CardTitle className="text-base">Send us a note</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Textarea rows={5} placeholder="What would make this easier?" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
            <Button
              className="bg-secondary text-primary hover:bg-secondary/90"
              onClick={() => {
                if (!feedback.trim()) { toast.error("Add a note first."); return; }
                window.location.href = `mailto:info@teevents.golf?subject=${encodeURIComponent("Enterprise feedback")}&body=${encodeURIComponent(`${feedback}\n\nFrom: ${email}`)}`;
              }}
            >
              <Send className="mr-1.5 h-4 w-4" /> Send feedback
            </Button>
          </CardContent>
        </Card>
      )}

      {key === "earn-300" && (
        <Card className="max-w-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Gift className="h-4 w-4 text-secondary" /> Refer and earn $300</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Know another course, club or organization running tournaments? Introduce us and you earn $300 once they run their first paid event.</p>
            <Button asChild className="bg-secondary text-primary hover:bg-secondary/90">
              <Link to="/contact">Send an introduction</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </EnterpriseLayout>
  );
}
