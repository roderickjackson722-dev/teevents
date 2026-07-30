import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";

export default function Claim() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [demo, setDemo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", agree1: false, agree2: false, agree3: false });

  useEffect(() => {
    (async () => {
      if (!token) return;
      const { data } = await supabase.from("demo_tournaments").select("*").eq("conversion_token", token).maybeSingle();
      setDemo(data);
      if (data?.prospect_email) setForm((f) => ({ ...f, email: data.prospect_email || "" }));
      setLoading(false);
    })();
  }, [token]);

  async function handleClaim() {
    if (!form.email || !form.password) {
      toast({ title: "Email and password required", variant: "destructive" });
      return;
    }
    if (!form.agree1 || !form.agree2 || !form.agree3) {
      toast({ title: "Please accept all agreements", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    // 1. Sign up
    const { data: signUp, error: suErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (suErr && !suErr.message.toLowerCase().includes("already")) {
      setSubmitting(false);
      toast({ title: "Signup failed", description: suErr.message, variant: "destructive" });
      return;
    }
    // If account exists, sign in
    if (!signUp.session) {
      const { error: siErr } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      if (siErr) {
        setSubmitting(false);
        toast({ title: "Could not sign in", description: siErr.message, variant: "destructive" });
        return;
      }
    }
    // 2. Claim
    const { data, error } = await supabase.functions.invoke("claim-converted-tournament", {
      body: { conversion_token: token, organization_name: demo?.prospect_name },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast({ title: "Claim failed", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Tournament claimed!" });
    navigate("/dashboard/tournaments");
  }

  if (loading) return <div className="p-8">Loading…</div>;
  if (!demo) return <div className="p-8">Invalid or expired claim link.</div>;
  if (demo.status === "archived") return <div className="p-8">This tournament has already been claimed.</div>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <SEO title="Claim Your Tournament" description="Demo" noIndex />
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Claim Your Tournament</CardTitle>
          <CardDescription>You've been invited to manage <strong>{demo.tournament_name}</strong></CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={form.agree1} onCheckedChange={(v) => setForm({ ...form, agree1: !!v })} />
            <span>I agree to the <a href="/terms-of-service" target="_blank" className="underline">TeeVents Terms of Service</a></span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={form.agree2} onCheckedChange={(v) => setForm({ ...form, agree2: !!v })} />
            <span>I agree to the 5% platform fee per transaction</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={form.agree3} onCheckedChange={(v) => setForm({ ...form, agree3: !!v })} />
            <span>I confirm I am authorized to manage this tournament</span>
          </label>
          <Button
            onClick={handleClaim}
            disabled={submitting}
            className="w-full bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-semibold"
          >
            {submitting ? "Claiming…" : "Create Account & Claim Tournament"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
