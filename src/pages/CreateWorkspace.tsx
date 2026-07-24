import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Flag, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";

type Interest = "tournament" | "league";

export default function CreateWorkspace() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const preset = (params.get("type") as Interest) || null;
  const reason = params.get("reason");

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [interest, setInterest] = useState<Interest | null>(preset);
  const [name, setName] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate("/get-started?mode=signin"); return; }
      setUserId(session.user.id);
      const email = session.user.email || "";
      setUserEmail(email);
      setContactEmail((prev) => prev || email);
      const meta: any = session.user.user_metadata || {};
      setContactName((prev) => prev || meta.full_name || meta.name || "");
      setContactPhone((prev) => prev || meta.phone || "");
    });
    // Prefill from pending workspace from signup
    try {
      const raw = localStorage.getItem("teevents.pendingWorkspace");
      if (raw) {
        const p = JSON.parse(raw);
        if (!preset && p?.interest_area) setInterest(p.interest_area);
        if (p?.organization_name) setName(p.organization_name);
      }
    } catch {}
  }, []);

  const create = async () => {
    if (!interest || !name.trim() || !userId) {
      toast({ title: "Missing info", description: "Choose a workspace type and enter a name.", variant: "destructive" });
      return;
    }
    if (interest === "league") {
      if (!contactName.trim() || !contactEmail.trim() || !contactPhone.trim()) {
        toast({ title: "Contact info required", description: "Please provide your name, email, and phone to sign up for Golf Leagues.", variant: "destructive" });
        return;
      }
    }
    setLoading(true);
    try {
      const subdomain = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6);
      const orgId = crypto.randomUUID();
      const { error: orgErr } = await supabase.from("organizations").insert({
        id: orgId,
        name: name.trim(),
        subdomain,
        plan: "free",
        workspace_type: interest,
      } as any);
      if (orgErr) throw orgErr;
      const { error: memErr } = await supabase.from("org_members").insert({
        user_id: userId,
        organization_id: orgId,
        role: "owner",
      });
      if (memErr) throw memErr;

      try { localStorage.removeItem("teevents.pendingWorkspace"); } catch {}

      if (interest === "league") {
        // Send to Stripe checkout for $199/year
        const { data, error } = await (supabase as any).functions.invoke("create-league-subscription", {
          body: {
            organization_id: orgId,
            subscription_type: "flat_fee",
            promo_code: promoCode.trim() || undefined,
            contact_name: contactName.trim(),
            contact_email: contactEmail.trim(),
            contact_phone: contactPhone.trim(),
            league_name: name.trim(),
          },
        });
        if (error || !data?.url) {
          toast({
            title: "Workspace created",
            description: "Complete your subscription to activate the league.",
          });
          navigate("/golf-leagues");
          return;
        }
        window.location.href = data.url;
        return;
      }

      toast({ title: "Workspace created", description: "Let's set up your first tournament." });
      navigate(`/dashboard?admin_org=${orgId}`);
    } catch (e: any) {
      toast({ title: "Could not create workspace", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <SEO title="Create Workspace — TeeVents" description="Start a new tournament or league workspace." />
      <div className="w-full max-w-2xl">
        <Card>
          <CardContent className="p-8 space-y-6">
            {reason === "switch" && (
              <div className="rounded-lg border border-secondary/40 bg-secondary/10 p-4 text-sm">
                <p className="font-semibold text-foreground">
                  You don't have a {preset === "league" ? "league" : "tournament"} workspace yet.
                </p>
                <p className="text-muted-foreground mt-1">
                  Switch Workspace can only toggle between dashboards you already own.
                  Create a {preset === "league" ? "league" : "tournament"} workspace below and the
                  Switch Workspace button will jump straight between it and your existing account.
                </p>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">Create a new workspace</h1>
              <p className="text-muted-foreground text-sm">Choose what you want to manage and give it a name.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setInterest("tournament")}
                className={`text-left border-2 rounded-xl p-5 transition-all hover:shadow-md ${interest === "tournament" ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold">Tournament</h3>
                <p className="text-xs text-muted-foreground mt-1">One-off event, single/multi-day.</p>
              </button>
              <button
                type="button"
                onClick={() => setInterest("league")}
                className={`text-left border-2 rounded-xl p-5 transition-all hover:shadow-md ${interest === "league" ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center mb-2">
                  <Flag className="h-5 w-5 text-secondary" />
                </div>
                <h3 className="font-bold">League</h3>
                <p className="text-xs text-muted-foreground mt-1">Season-long play. $199/year.</p>
              </button>
            </div>

            <div>
              <Label htmlFor="wsname">{interest === "league" ? "League name" : "Organization / tournament name"}</Label>
              <Input id="wsname" value={name} onChange={(e) => setName(e.target.value)} placeholder={interest === "league" ? "Weekend Warriors League" : "Acme Charity Classic"} />
            </div>

            {interest === "league" && (
              <>
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-sm">League Manager Contact Info</h3>
                    <p className="text-xs text-muted-foreground">Required — used for account recovery and league support.</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="contactName">Full name</Label>
                      <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jane Smith" />
                    </div>
                    <div>
                      <Label htmlFor="contactPhone">Phone</Label>
                      <Input id="contactPhone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="(555) 123-4567" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="contactEmail">Email</Label>
                    <Input id="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@example.com" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="promo">Promo code (optional)</Label>
                  <Input
                    id="promo"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter promo code"
                    className="uppercase"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Applied automatically at checkout. Leave blank if you don't have one.
                  </p>
                </div>
              </>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="ghost" asChild>
                <Link to="/select-workspace"><ArrowLeft className="h-4 w-4 mr-1" /> Back to workspaces</Link>
              </Button>
              <Button onClick={create} disabled={loading || !interest || !name.trim()}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {interest === "league" ? "Continue to payment" : "Create workspace"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
