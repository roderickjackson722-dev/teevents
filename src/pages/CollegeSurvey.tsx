import { useEffect, useState } from "react";
import { useParams } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Survey = { id: string; title: string; description: string | null; slug: string; is_active: boolean; hero_image_url: string | null };
type Question = { id: string; question_text: string; question_type: string; display_order: number; is_required: boolean; options: string[] | null };

export default function CollegeSurvey({ slugOverride }: { slugOverride?: string } = {}) {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const slug = slugOverride ?? routeSlug;
  const { toast } = useToast();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      if (!slug) {
        setLoading(false);
        return;
      }
      try {
        const { data: s } = await (supabase as any).from("college_surveys").select("id, title, description, slug, is_active, hero_image_url").eq("slug", slug).eq("is_active", true).maybeSingle();
        if (s) {
          const { data: qs } = await (supabase as any).from("college_survey_questions").select("*").eq("survey_id", s.id).order("display_order");
          setSurvey(s);
          setQuestions(qs || []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const setAns = (id: string, val: any) => setAnswers((a) => ({ ...a, [id]: val }));

  const submit = async () => {
    if (!survey) return;
    // validate
    for (const q of questions) {
      const v = answers[q.id];
      if (q.is_required) {
        if (q.question_type === "checkbox") {
          if (!Array.isArray(v) || v.length === 0) { toast({ title: `"${q.question_text}" is required`, variant: "destructive" }); return; }
        } else if (!v || String(v).trim() === "") {
          toast({ title: `"${q.question_text}" is required`, variant: "destructive" }); return;
        }
      }
    }
    setSubmitting(true);
    try {
      const response_data: Record<string, string> = {};
      questions.forEach((q) => {
        const v = answers[q.id];
        response_data[q.question_text] = Array.isArray(v) ? v.join(", ") : (v ?? "");
      });
      const { data, error } = await supabase.functions.invoke("submit-college-survey", {
        body: { slug: survey.slug, response_data },
      });
      if (error || !(data as any)?.ok) throw new Error((data as any)?.error || error?.message || "Submission failed");
      setDone(true);
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (!survey) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">This survey link is invalid or no longer active.</div>;

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-primary" />
            <h1 className="text-xl font-semibold mb-2">Thank you!</h1>
            <p className="text-sm text-muted-foreground">Your response has been recorded.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="overflow-hidden">
          {survey.hero_image_url && (
            <img src={survey.hero_image_url} alt={survey.title} className="w-full max-h-64 object-cover" />
          )}
          <CardHeader>
            <CardTitle className="text-2xl">{survey.title}</CardTitle>
            {survey.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-2">{survey.description}</p>}
          </CardHeader>
          <CardContent className="space-y-5">
            {questions.map((q, i) => (
              <div key={q.id} className="space-y-2">
                <Label>{i + 1}. {q.question_text}{q.is_required && <span className="text-destructive ml-1">*</span>}</Label>
                {q.question_type === "textarea" ? (
                  <Textarea rows={3} value={answers[q.id] || ""} onChange={(e) => setAns(q.id, e.target.value)} />
                ) : q.question_type === "dropdown" ? (
                  <select className="w-full border rounded-md px-3 py-2 bg-background" value={answers[q.id] || ""} onChange={(e) => setAns(q.id, e.target.value)}>
                    <option value="">Select…</option>
                    {(q.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : q.question_type === "radio" ? (
                  <div className="space-y-1">
                    {(q.options || []).map((opt) => (
                      <label key={opt} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === opt}
                          onChange={() => setAns(q.id, opt)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                ) : q.question_type === "checkbox" ? (
                  <div className="space-y-1">
                    {(q.options || []).map((opt) => {
                      const cur: string[] = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                      const checked = cur.includes(opt);
                      return (
                        <label key={opt} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={checked} onChange={(e) => {
                            const next = e.target.checked ? [...cur, opt] : cur.filter((x) => x !== opt);
                            setAns(q.id, next);
                          }} />
                          {opt}
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <Input value={answers[q.id] || ""} onChange={(e) => setAns(q.id, e.target.value)} type={q.question_text.toLowerCase().includes("email") ? "email" : "text"} />
                )}
              </div>
            ))}
            <Button onClick={submit} disabled={submitting} className="w-full">
              <Send className="mr-2 h-4 w-4" /> {submitting ? "Submitting…" : "Submit Survey"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
