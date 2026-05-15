import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, CheckCircle, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SurveyContext {
  registration_id: string;
  tournament_id: string;
  player_name: string;
  tournament_title: string;
  message: string | null;
  early_signup_enabled: boolean;
  early_signup_label: string | null;
  already_completed: boolean;
  questions: { id: string; question: string; type: string; survey_id: string }[];
}

export default function Survey() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [ctx, setCtx] = useState<SurveyContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [signupOptIn, setSignupOptIn] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) return;
      const { data: reg } = await supabase
        .from("tournament_registrations")
        .select("id, tournament_id, first_name, last_name, email, survey_completed_at")
        .eq("survey_response_token", token)
        .maybeSingle();
      if (!reg) { setLoading(false); return; }

      const [{ data: t }, { data: surveys }] = await Promise.all([
        supabase.from("tournaments").select("title, post_event_survey_message, early_signup_enabled, early_signup_label").eq("id", reg.tournament_id).maybeSingle(),
        supabase.from("tournament_surveys").select("id, tournament_survey_questions(id, question, type, sort_order, survey_id)").eq("tournament_id", reg.tournament_id).eq("is_active", true).limit(1),
      ]);
      const survey = surveys?.[0] as any;
      const questions = ((survey?.tournament_survey_questions as any[]) || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setCtx({
        registration_id: reg.id,
        tournament_id: reg.tournament_id,
        player_name: `${reg.first_name || ""} ${reg.last_name || ""}`.trim(),
        tournament_title: t?.title || "Tournament",
        message: t?.post_event_survey_message || null,
        early_signup_enabled: !!t?.early_signup_enabled,
        early_signup_label: t?.early_signup_label || null,
        already_completed: !!reg.survey_completed_at,
        questions,
      });
      setSignupEmail(reg.email || "");
      setLoading(false);
    })();
  }, [token]);

  const handleSubmit = async () => {
    if (!ctx) return;
    setSubmitting(true);
    if (ctx.questions.length > 0) {
      const inserts = ctx.questions.map((q) => ({
        survey_id: q.survey_id,
        question_id: q.id,
        respondent_email: signupEmail || `player-${ctx.registration_id}@anon`,
        answer: answers[q.id] || "",
      }));
      await supabase.from("tournament_survey_responses").insert(inserts);
    }
    if (signupOptIn && signupEmail) {
      await supabase.from("early_signups").insert({
        tournament_id: ctx.tournament_id,
        email: signupEmail,
        name: ctx.player_name || null,
        source: "survey",
      });
    }
    await supabase
      .from("tournament_registrations")
      .update({ survey_completed_at: new Date().toISOString() })
      .eq("id", ctx.registration_id);
    setSubmitted(true);
    setSubmitting(false);
    toast({ title: "Thank you for your feedback!" });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!ctx) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">This survey link is invalid or expired.</div>;

  if (submitted || ctx.already_completed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-primary" />
            <h1 className="text-xl font-semibold mb-2">Thanks for your feedback!</h1>
            <p className="text-sm text-muted-foreground">Your response has been recorded.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{ctx.tournament_title} — Post-Event Survey</CardTitle>
            {ctx.player_name && <p className="text-sm text-muted-foreground">Hi {ctx.player_name}!</p>}
            {ctx.message && <p className="text-sm mt-3 whitespace-pre-wrap">{ctx.message}</p>}
          </CardHeader>
          <CardContent className="space-y-5">
            {ctx.questions.length === 0 && (
              <p className="text-sm text-muted-foreground">No survey questions configured.</p>
            )}
            {ctx.questions.map((q) => (
              <div key={q.id} className="space-y-2">
                <Label>{q.question}</Label>
                {q.type === "rating" ? (
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setAnswers({ ...answers, [q.id]: String(n) })}
                        className={`p-2 rounded-md border ${answers[q.id] === String(n) ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                        <Star className={`h-5 w-5 ${answers[q.id] && parseInt(answers[q.id]) >= n ? "fill-current" : ""}`} />
                      </button>
                    ))}
                  </div>
                ) : q.type === "yes_no" ? (
                  <div className="flex gap-2">
                    {["Yes", "No"].map((opt) => (
                      <Button key={opt} size="sm" variant={answers[q.id] === opt ? "default" : "outline"} onClick={() => setAnswers({ ...answers, [q.id]: opt })}>{opt}</Button>
                    ))}
                  </div>
                ) : (
                  <Textarea value={answers[q.id] || ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} rows={2} />
                )}
              </div>
            ))}

            {ctx.early_signup_enabled && (
              <div className="border-t pt-4 space-y-2">
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={signupOptIn} onChange={(e) => setSignupOptIn(e.target.checked)} className="mt-1" />
                  <span>{ctx.early_signup_label || "Yes, please notify me when registration opens for next year's tournament."}</span>
                </label>
                {signupOptIn && (
                  <Input type="email" placeholder="Email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} />
                )}
              </div>
            )}

            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              <Send className="mr-2 h-4 w-4" /> Submit Feedback
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
