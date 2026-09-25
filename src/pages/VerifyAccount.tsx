import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import SEO from "@/components/SEO";
import logo from "@/assets/logo-black.png";
import { lookupVettingToken, submitVettingDocs } from "@/lib/vetting.functions";

export default function VerifyAccount() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [social, setSocial] = useState("");
  const [taxId, setTaxId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    lookupVettingToken({ data: { token } })
      .then(setInfo)
      .catch(() => setInfo({ found: false }))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async () => {
    setError("");
    if (!/^https?:\/\//i.test(social.trim())) return setError("Enter a full profile link starting with https://");
    if (taxId.trim().length < 2) return setError("Enter your business registration number or tax ID.");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("token", token);
      fd.set("social_url", social.trim());
      fd.set("tax_id", taxId.trim());
      if (file) fd.set("file", file);
      await submitVettingDocs({ data: fd });
      setDone(true);
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4 py-12">
      <SEO title="Verify Your Account — TeeVents" description="Submit your organization details to finish activating your TeeVents account." />
      <div className="w-full max-w-xl">
        <img src={logo} alt="TeeVents" className="h-12 mx-auto mb-6" />
        <Card>
          <CardContent className="p-8 space-y-5">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : !info?.found ? (
              <p className="text-center text-muted-foreground">This link is invalid or has expired. Contact info@teevents.golf for help.</p>
            ) : done || (info.submitted && info.status === "pending") ? (
              <div className="text-center space-y-3">
                <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
                <h1 className="text-2xl font-bold">Thank you!</h1>
                <p className="text-muted-foreground">We're reviewing your account. You'll receive an email once approved.</p>
              </div>
            ) : info.status === "approved" || info.status === "rejected" ? (
              <p className="text-center text-muted-foreground">This account has already been reviewed. Check your email for details.</p>
            ) : (
              <>
                <div className="text-center space-y-1">
                  <ShieldCheck className="h-10 w-10 text-primary mx-auto" />
                  <h1 className="text-2xl font-bold">Verify {info.organization || "your organization"}</h1>
                  <p className="text-muted-foreground text-sm">Hi {info.name}, please share the details below so we can activate your account.</p>
                </div>
                <div>
                  <Label htmlFor="social">Business social profile link <span className="text-destructive">*</span></Label>
                  <Input id="social" value={social} onChange={(e) => setSocial(e.target.value)} placeholder="https://www.linkedin.com/company/your-club" maxLength={300} />
                </div>
                <div>
                  <Label htmlFor="tax">Business registration number or tax ID <span className="text-destructive">*</span></Label>
                  <Input id="tax" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="e.g. 12-3456789" maxLength={60} />
                </div>
                <div>
                  <Label htmlFor="doc">Recent utility bill or bank statement in the organization's name</Label>
                  <Input id="doc" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  <p className="text-xs text-muted-foreground mt-1">PDF or image, up to 10MB.</p>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button className="w-full" onClick={submit} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Submit for Review
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
