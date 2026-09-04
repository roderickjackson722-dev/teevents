import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCents } from "@/lib/formatCurrency";
import {
  confirmRfpRegistrationPayment,
  getRfpPublicSeason,
  submitRfpRegistration,
} from "@/lib/rfpPrograms.functions";

/**
 * Unlisted program sign-up page for the county pilot. It is reachable only by
 * its exact link, is marked no-index, and is never linked from navigation.
 */
export default function RfpPublicRegistration() {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");

  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [form, setForm] = useState<any>(null);
  const [done, setDone] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState({
    participant_name: "",
    participant_email: "",
    participant_phone: "",
    date_of_birth: "",
    team_id: "",
    waiver_signed: false,
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const result: any = await getRfpPublicSeason({ data: { slug } } as any);
        setProgram(result.season);
        setTeams(result.teams || []);
        setForm(result.form);
        if (result.season) document.title = `${result.season.name} — Registration`;
      } catch {
        setProgram(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const result: any = await confirmRfpRegistrationPayment({ data: { sessionId } } as any);
        if (result.paid) setDone(result.name || "");
      } catch {
        /* leave the form visible if confirmation fails */
      }
    })();
  }, [sessionId]);

  const submit = async () => {
    if (!values.waiver_signed) return toast.error("Please accept the waiver to continue");
    setSubmitting(true);
    try {
      const result: any = await submitRfpRegistration({
        data: {
          slug,
          participant_name: values.participant_name.trim(),
          participant_email: values.participant_email.trim(),
          participant_phone: values.participant_phone || null,
          date_of_birth: values.date_of_birth || null,
          team_id: values.team_id || null,
          waiver_signed: true,
          responses: answers,
          origin: window.location.origin,
        },
      } as any);
      if (result.checkoutUrl) window.location.href = result.checkoutUrl;
      else setDone(values.participant_name);
    } catch (error: any) {
      toast.error(error?.message || "Could not complete registration");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!program) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center">
        <div className="max-w-sm space-y-2">
          <h1 className="text-lg font-semibold text-foreground">Registration unavailable</h1>
          <p className="text-sm text-muted-foreground">This program is not accepting sign-ups right now.</p>
        </div>
      </div>
    );
  }

  if (done !== null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md p-6 text-center space-y-3">
          <CheckCircle2 className="h-8 w-8 mx-auto text-primary" />
          <h1 className="text-xl font-bold text-foreground">You&apos;re registered</h1>
          <p className="text-sm text-muted-foreground">Thanks{done ? `, ${done}` : ""} — a confirmation email is on its way with your program details.</p>
        </Card>
      </div>
    );
  }

  const waivers: string[] = form?.form_config?.waivers || [];
  const questions: string[] = form?.form_config?.fields || [];
  const documents: string[] = form?.form_config?.documents || [];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{program.name}</h1>
          {program.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{program.description}</p>}
          <p className="text-sm text-muted-foreground">
            {program.start_date ? `${program.start_date}${program.end_date ? ` – ${program.end_date}` : ""} · ` : ""}
            {program.registration_fee_cents > 0 ? `Fee ${formatCents(program.registration_fee_cents)}` : "No fee"}
          </p>
        </header>

        <Card className="p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label>Participant name</Label><Input value={values.participant_name} onChange={(e) => setValues({ ...values, participant_name: e.target.value })} maxLength={120} /></div>
            <div className="space-y-1"><Label>Email</Label><Input type="email" value={values.participant_email} onChange={(e) => setValues({ ...values, participant_email: e.target.value })} maxLength={255} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={values.participant_phone} onChange={(e) => setValues({ ...values, participant_phone: e.target.value })} maxLength={40} /></div>
            <div className="space-y-1"><Label>Date of birth</Label><Input type="date" value={values.date_of_birth} onChange={(e) => setValues({ ...values, date_of_birth: e.target.value })} /></div>
            {teams.length > 0 && (
              <div className="space-y-1 sm:col-span-2"><Label>Team (optional)</Label>
                <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={values.team_id} onChange={(e) => setValues({ ...values, team_id: e.target.value })}>
                  <option value="">No preference</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.team_name}{t.division ? ` — ${t.division}` : ""}</option>)}
                </select>
              </div>
            )}
          </div>

          {questions.length > 0 && (
            <div className="space-y-3 border-t border-border pt-4">
              {questions.map((q) => (
                <div key={q} className="space-y-1">
                  <Label>{q}</Label>
                  <Input value={answers[q] || ""} maxLength={1000} onChange={(e) => setAnswers({ ...answers, [q]: e.target.value })} />
                </div>
              ))}
            </div>
          )}

          {documents.length > 0 && (
            <div className="border-t border-border pt-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Please bring or email these documents:</p>
              <ul className="list-disc pl-5 mt-1">{documents.map((d) => <li key={d}>{d}</li>)}</ul>
            </div>
          )}

          <div className="border-t border-border pt-4 space-y-2">
            {waivers.map((w) => <p key={w} className="text-xs text-muted-foreground">{w}</p>)}
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={values.waiver_signed} onCheckedChange={(v) => setValues({ ...values, waiver_signed: !!v })} />
              <span>I have read and accept the waiver and consent terms for this program.</span>
            </label>
          </div>

          <Button
            className="w-full"
            disabled={submitting || !values.participant_name || !values.participant_email || !values.waiver_signed}
            onClick={() => void submit()}
          >
            {submitting ? "Submitting" : program.registration_fee_cents > 0 ? `Register and pay ${formatCents(program.registration_fee_cents)}` : "Complete registration"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
