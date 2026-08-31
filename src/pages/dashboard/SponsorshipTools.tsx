import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Award, CheckCircle2, Copy, Loader2, Mail, Megaphone, QrCode, Sparkles,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { pickTournamentId } from "@/hooks/useTournamentIdParam";
import { formatCents } from "@/lib/formatCurrency";
import { toast } from "sonner";
import {
  createDigitalSponsorCheckout,
  getDigitalSponsorStatus,
  verifyDigitalSponsorPayment,
} from "@/lib/digitalSponsor.functions";

interface TournamentRow {
  id: string;
  title: string;
  date: string | null;
  slug: string | null;
}

type Status = {
  tournament_id: string;
  title: string;
  purchased: boolean;
  purchased_at: string | null;
  amount_cents: number;
};

const packageIncludes = [
  "Presenting-sponsor logo on the live leaderboard and mobile scoring pages",
  "Logo and link on your public tournament website header",
  "Sponsor logo on digital scorecards, cart signs, and name badges",
  "Rotating leaderboard banner plus scrolling sponsor ticker placement",
  "Logo in registration confirmation and event-day emails",
  "Sponsor-branded QR code for signage, social posts, and printed material",
  "Post-event recap report with impressions and engagement to send your sponsor",
];

const SponsorshipTools = () => {
  const { org } = useOrgContext();
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const tournament = tournaments.find((t) => t.id === selected) || null;

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title, date, slug")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const t = ((data || []) as unknown as TournamentRow[]);
        setTournaments(t);
        if (t.length > 0) setSelected(pickTournamentId(t as any));
        setLoading(false);
      });
  }, [org]);

  const loadStatus = async (id: string) => {
    try {
      setStatus((await getDigitalSponsorStatus({ data: { tournamentId: id } })) as Status);
    } catch (e: any) {
      setStatus(null);
      toast.error(e?.message || "Could not load the Digital Sponsor status");
    }
  };

  useEffect(() => {
    if (selected) loadStatus(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Confirm a Stripe return.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("digital_sponsor_session_id");
    const canceled = params.get("digital_sponsor_canceled");
    if (!sid && !canceled) return;
    (async () => {
      if (sid) {
        try {
          const res: any = await verifyDigitalSponsorPayment({ data: { sessionId: sid } });
          if (res?.verified) {
            toast.success("Digital Sponsor package is active for this event.");
            if (res.tournament_id) await loadStatus(res.tournament_id);
          } else {
            toast.message("Payment is still processing. Refresh in a moment.");
          }
        } catch (e: any) {
          toast.error(e?.message || "Could not confirm the payment");
        }
      } else {
        toast.message("Checkout canceled — no charge was made.");
      }
      params.delete("digital_sponsor_session_id");
      params.delete("digital_sponsor_canceled");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePurchase = async () => {
    if (!selected) return;
    setPurchasing(true);
    try {
      const res: any = await createDigitalSponsorCheckout({
        data: {
          tournamentId: selected,
          origin: window.location.origin,
          returnPath: window.location.pathname,
        },
      });
      if (!res?.url) throw new Error("No checkout URL returned");
      window.location.href = res.url;
    } catch (e: any) {
      toast.error(e?.message || "Could not start checkout");
      setPurchasing(false);
    }
  };

  const eventUrl = useMemo(
    () =>
      tournament?.slug
        ? `https://teevents.golf/t/${tournament.slug}`
        : "https://teevents.golf",
    [tournament],
  );

  const emailTemplate = useMemo(() => {
    const name = tournament?.title || "[Event Name]";
    const dateText = tournament?.date
      ? new Date(tournament.date + "T12:00:00").toLocaleDateString("en-US", {
          month: "long", day: "numeric", year: "numeric",
        })
      : "[Event Date]";
    return `Subject: Put Your Brand Front and Center at ${name}

Hi [Sponsor Name],

We're finalizing sponsors for ${name} on ${dateText}, and I wanted to offer you first look at our Presenting Digital Sponsorship — the most visible placement we have.

Unlike a sign on a tee box that a golfer walks past once, this package puts your brand on every screen our players and their networks look at all day:

• Your logo on the live leaderboard every golfer refreshes from their phone
• Your logo on our tournament website, registration pages, and confirmation emails
• Your brand on digital scorecards, cart signs, and event-day communications
• A rotating leaderboard banner and scrolling sponsor ticker during play
• A branded QR code we push out on social and on-course signage
• A post-event recap report showing impressions and engagement

Our event page: ${eventUrl}

Investment: $[5,000–10,000]

The presenting slot is exclusive — only one brand gets it. If ${name} looks like the right audience for you, I'd love 15 minutes this week to walk you through it.

Thank you for considering it,

[Your Name]
[Title], [Organization]
[Phone] · [Email]`;
  }, [tournament, eventUrl]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed — select the text manually");
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" /> Sponsorship Tools
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Resell a turnkey digital sponsorship package for $5,000–$10,000. You pay a one-time $799.
          </p>
        </div>
        {tournaments.length > 0 && (
          <div className="w-full md:w-72">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger><SelectValue placeholder="Select a tournament" /></SelectTrigger>
              <SelectContent>
                {tournaments.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {tournaments.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          Create a tournament first to use the Sponsorship Tools.
        </CardContent></Card>
      ) : (
        <>
          {/* Digital Sponsor package */}
          <Card className="border-2 border-secondary/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <Sparkles className="h-5 w-5 text-secondary" />
                Digital Sponsor Package — {formatCents(status?.amount_cents ?? 79900)} flat fee
                {status?.purchased && (
                  <Badge className="gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Active</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Everything you need to package, pitch, and deliver a premium digital sponsorship for{" "}
                <span className="font-semibold text-foreground">{tournament?.title}</span>. Most organizers
                resell this placement to a title sponsor for <span className="font-semibold text-foreground">$5,000–$10,000</span>.
              </p>

              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                {packageIncludes.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground/90">
                    <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-2">
                {status?.purchased ? (
                  <p className="text-sm font-semibold text-secondary flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Purchased
                    {status.purchased_at
                      ? ` on ${new Date(status.purchased_at).toLocaleDateString()}`
                      : ""}
                    .
                  </p>
                ) : (
                  <Button size="lg" onClick={handlePurchase} disabled={purchasing}>
                    {purchasing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Purchase Digital Sponsor — {formatCents(status?.amount_cents ?? 79900)}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Email template */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" /> Sponsor Outreach Email Template
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Pre-filled with your event details. Replace the bracketed fields, then send it to your
                prospective sponsor.
              </p>
              <Textarea value={emailTemplate} readOnly rows={22} className="font-mono text-xs" />
              <Button variant="outline" onClick={() => copy(emailTemplate, "Email template")}>
                <Copy className="h-4 w-4 mr-2" /> Copy Email Template
              </Button>
            </CardContent>
          </Card>

          {/* QR + asset kit */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" /> Sponsor QR Code &amp; Asset Kit
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-[auto,1fr] gap-6 items-start">
              <div className="bg-white p-4 rounded-lg border inline-block">
                <QRCodeSVG value={eventUrl} size={168} level="M" />
              </div>
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  Put this QR code on sponsor signage, social posts, and printed material. It points to{" "}
                  <span className="font-mono text-xs text-foreground">{eventUrl}</span>.
                </p>
                <ul className="space-y-1.5 text-foreground/90">
                  <li>• Upload your sponsor's logo under Sponsors → Leaderboard Branding.</li>
                  <li>• Sponsor logos flow into printables, cart signs, and confirmation emails.</li>
                  <li>• Send the post-event recap report as proof of impressions.</li>
                </ul>
                <Button variant="outline" onClick={() => copy(eventUrl, "Event link")}>
                  <Copy className="h-4 w-4 mr-2" /> Copy Event Link
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default SponsorshipTools;
