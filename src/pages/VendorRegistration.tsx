import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Store } from "lucide-react";

interface FormQuestion {
  id: string;
  label: string;
  type: "text" | "textarea" | "dropdown" | "checkbox" | "yesno" | "file";
  options?: string[];
  required: boolean;
}

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

interface TournamentInfo {
  id: string;
  title: string;
  slug: string;
  vendor_booth_fee_cents: number | null;
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export default function VendorRegistration() {
  const { slug } = useParams<{ slug: string }>();
  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [formActive, setFormActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [vendorName, setVendorName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      const { data: t } = await supabase
        .from("tournaments")
        .select("id, title, slug, vendor_booth_fee_cents")
        .eq("slug", slug)
        .maybeSingle();
      if (!t) { setLoading(false); return; }
      setTournament(t as TournamentInfo);

      const { data: form } = await supabase
        .from("vendor_forms")
        .select("questions, is_active")
        .eq("tournament_id", (t as any).id)
        .maybeSingle();
      if (form) {
        setQuestions((((form as any).questions as FormQuestion[]) || []));
        setFormActive(!!(form as any).is_active);
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  const handleAnswer = (qid: string, value: any) => {
    setAnswers((a) => ({ ...a, [qid]: value }));
  };

  const handleFileUpload = async (qid: string, file: File) => {
    if (!tournament) return;
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({ title: "Unsupported file type", description: "Use PDF or an image (JPG, PNG, WEBP, HEIC).", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: "File too large", description: "Maximum size is 10 MB.", variant: "destructive" });
      return;
    }
    handleAnswer(qid, { uploading: true, name: file.name });
    const ext = file.name.split(".").pop() || "bin";
    const path = `${tournament.id}/${qid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("vendor-documents").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      handleAnswer(qid, null);
      return;
    }
    handleAnswer(qid, { path, name: file.name, size: file.size, type: file.type });
  };

  const validate = (): string | null => {
    if (!vendorName.trim()) return "Business name is required";
    if (!contactName.trim()) return "Contact name is required";
    if (!contactEmail.trim()) return "Email is required";
    if (!/.+@.+\..+/.test(contactEmail)) return "Enter a valid email";
    if (!businessType) return "Business type is required";
    for (const q of questions) {
      if (!q.required) continue;
      const a = answers[q.id];
      if (a == null || a === "" || (Array.isArray(a) && a.length === 0)) {
        return `${q.label} is required`;
      }
    }
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) { toast({ title: err, variant: "destructive" }); return; }
    if (!tournament) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("submit-vendor-registration", {
        body: {
          tournament_id: tournament.id,
          vendor_name: vendorName.trim(),
          contact_name: contactName.trim(),
          contact_email: contactEmail.trim(),
          contact_phone: contactPhone.trim() || undefined,
          business_type: businessType,
          answers,
        },
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader><CardTitle>Tournament not found</CardTitle></CardHeader>
        </Card>
      </div>
    );
  }

  if (!formActive) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Vendor applications closed</CardTitle>
            <CardDescription>
              Vendor applications for {tournament.title} are not currently being accepted.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <Card className="max-w-md text-center">
          <CardHeader>
            <div className="mx-auto rounded-full bg-emerald-100 p-3 w-fit">
              <CheckCircle2 className="h-8 w-8 text-emerald-700" />
            </div>
            <CardTitle className="mt-3">Application Submitted</CardTitle>
            <CardDescription>
              Thanks for applying to be a vendor at {tournament.title}. The organizer will review and
              email you shortly. A confirmation has been sent to {contactEmail}.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3 mb-3">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Become a Vendor</h1>
          <p className="text-muted-foreground mt-1">{tournament.title}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Vendor Registration Form</CardTitle>
            {tournament.vendor_booth_fee_cents ? (
              <CardDescription>
                Booth fee: <strong>{fmt(tournament.vendor_booth_fee_cents)}</strong> — payable after the organizer approves your application.
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Business Name *</Label>
              <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} maxLength={200} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Contact Person *</Label>
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} maxLength={200} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} maxLength={40} />
              </div>
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} maxLength={320} />
            </div>
            <div>
              <Label>Business Type *</Label>
              <Select value={businessType} onValueChange={setBusinessType}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Food">Food</SelectItem>
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Sponsor">Sponsor</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {questions.map((q) => (
              <div key={q.id}>
                <Label>{q.label} {q.required && "*"}</Label>
                {q.type === "text" && (
                  <Input value={answers[q.id] || ""} onChange={(e) => handleAnswer(q.id, e.target.value)} />
                )}
                {q.type === "textarea" && (
                  <Textarea value={answers[q.id] || ""} onChange={(e) => handleAnswer(q.id, e.target.value)} rows={3} />
                )}
                {q.type === "dropdown" && (
                  <Select value={answers[q.id] || ""} onValueChange={(v) => handleAnswer(q.id, v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {(q.options || []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {q.type === "checkbox" && (
                  <div className="space-y-1 mt-1">
                    {(q.options || []).map((o) => {
                      const arr: string[] = answers[q.id] || [];
                      const checked = arr.includes(o);
                      return (
                        <label key={o} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(c) => {
                              const next = c ? [...arr, o] : arr.filter((x) => x !== o);
                              handleAnswer(q.id, next);
                            }}
                          />
                          {o}
                        </label>
                      );
                    })}
                  </div>
                )}
                {q.type === "yesno" && (
                  <div className="flex gap-4 mt-1">
                    {["Yes", "No"].map((v) => (
                      <label key={v} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === v}
                          onChange={() => handleAnswer(q.id, v)}
                        />
                        {v}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <Button onClick={submit} disabled={submitting} className="w-full">
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : "Submit Registration"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">* Required fields</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
