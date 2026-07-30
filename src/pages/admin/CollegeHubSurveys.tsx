import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Copy, ExternalLink, Trash2, Pencil, Download, Eye, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type Survey = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  is_active: boolean;
  notify_respondent: boolean;
  created_at: string;
  hero_image_url: string | null;
  tournament_id: string | null;
  cta_label: string | null;
  cta_description: string | null;
};
type CollegeTournament = { id: string; title: string };
type Question = {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: "text" | "textarea" | "dropdown" | "checkbox";
  display_order: number;
  is_required: boolean;
  options: string[] | null;
};
type ResponseRow = {
  id: string;
  respondent_name: string | null;
  respondent_email: string | null;
  respondent_school: string | null;
  respondent_year: string | null;
  respondent_major: string | null;
  respondent_career_goals: string | null;
  response_data: Record<string, string>;
  submitted_at: string;
};

const DEFAULT_QUESTIONS: Omit<Question, "id" | "survey_id">[] = [
  { question_text: "Name", question_type: "text", display_order: 1, is_required: true, options: null },
  { question_text: "Email", question_type: "text", display_order: 2, is_required: true, options: null },
  { question_text: "School", question_type: "text", display_order: 3, is_required: true, options: null },
  { question_text: "Current Year", question_type: "dropdown", display_order: 4, is_required: true, options: ["Freshman", "Sophomore", "Junior", "Senior", "Graduate"] },
  { question_text: "Current Major", question_type: "text", display_order: 5, is_required: true, options: null },
  { question_text: "Career Goals", question_type: "textarea", display_order: 6, is_required: true, options: null },
];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export default function CollegeHubSurveys() {
  const { toast } = useToast();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Survey | null>(null);
  const [responsesOpenFor, setResponsesOpenFor] = useState<Survey | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: s } = await (supabase as any).from("college_surveys").select("*").order("created_at", { ascending: false });
    setSurveys(s || []);
    if (s?.length) {
      const { data: rc } = await (supabase as any)
        .from("college_survey_responses").select("survey_id");
      const c: Record<string, number> = {};
      (rc || []).forEach((r: any) => { c[r.survey_id] = (c[r.survey_id] || 0) + 1; });
      setCounts(c);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const publicUrl = (slug: string) => `${window.location.origin}/s/${slug}`;

  const openNew = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (s: Survey) => { setEditing(s); setEditorOpen(true); };

  const remove = async (s: Survey) => {
    if (!confirm(`Delete survey "${s.title}"? All responses will be deleted.`)) return;
    const { error } = await (supabase as any).from("college_surveys").delete().eq("id", s.id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Survey deleted" }); load(); }
  };

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/admin" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to admin
          </Link>
          <h1 className="text-2xl font-bold mt-1">College Hub — Surveys</h1>
          <p className="text-sm text-muted-foreground">Create surveys with customizable questions, share them, and manage responses.</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Create Survey</Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3">Survey Title</th>
              <th className="text-left p-3">Responses</th>
              <th className="text-left p-3">Link</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="p-4 text-muted-foreground" colSpan={5}>Loading…</td></tr>}
            {!loading && surveys.length === 0 && <tr><td className="p-4 text-muted-foreground" colSpan={5}>No surveys yet. Click "Create Survey" to get started.</td></tr>}
            {surveys.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3 font-medium">{s.title}</td>
                <td className="p-3">{counts[s.id] || 0}</td>
                <td className="p-3 font-mono text-xs">/s/{s.slug}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={s.is_active}
                      onCheckedChange={async (checked) => {
                        const { error } = await supabase.from("college_surveys").update({ is_active: checked }).eq("id", s.id);
                        if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
                        toast({ title: checked ? "Survey turned on" : "Survey turned off", description: checked ? "Now visible on the college page." : "Hidden from the college page." });
                        load();
                      }}
                    />
                    <span className={s.is_active ? "text-green-700 text-xs" : "text-muted-foreground text-xs"}>{s.is_active ? "On" : "Off"}</span>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-1 flex-wrap">
                    <Button variant="ghost" size="sm" onClick={() => setResponsesOpenFor(s)}><Eye className="w-3.5 h-3.5 mr-1" />Responses</Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5 mr-1" />Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(publicUrl(s.slug)); toast({ title: "Link copied" }); }}><Copy className="w-3.5 h-3.5 mr-1" />Copy</Button>
                    <Button variant="ghost" size="sm" asChild><a href={publicUrl(s.slug)} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5 mr-1" />View</a></Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(s)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SurveyEditorDialog open={editorOpen} onOpenChange={setEditorOpen} survey={editing} onSaved={load} />
      <ResponsesDialog survey={responsesOpenFor} onOpenChange={(o) => !o && setResponsesOpenFor(null)} />
    </div>
  );
}

function SurveyEditorDialog({ open, onOpenChange, survey, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; survey: Survey | null; onSaved: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [notifyRespondent, setNotifyRespondent] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [tournamentId, setTournamentId] = useState<string | "">("");
  const [tournaments, setTournaments] = useState<CollegeTournament[]>([]);
  const [questions, setQuestions] = useState<(Question | (Omit<Question, "id" | "survey_id"> & { id?: string }))[]>([]);
  const [saving, setSaving] = useState(false);
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaDescription, setCtaDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: ts } = await (supabase as any).from("college_tournaments").select("id, title").order("created_at", { ascending: false });
      setTournaments(ts || []);
      if (survey) {
        setTitle(survey.title);
        setDescription(survey.description || "");
        setSlug(survey.slug);
        setIsActive(survey.is_active);
        setNotifyRespondent(survey.notify_respondent);
        setHeroImageUrl(survey.hero_image_url || null);
        setTournamentId(survey.tournament_id || "");
        setCtaLabel(survey.cta_label || "");
        setCtaDescription(survey.cta_description || "");
        const { data } = await (supabase as any).from("college_survey_questions").select("*").eq("survey_id", survey.id).order("display_order");
        setQuestions(data || []);
      } else {
        setTitle(""); setDescription(""); setSlug(""); setIsActive(true); setNotifyRespondent(false);
        setHeroImageUrl(null); setTournamentId(""); setCtaLabel(""); setCtaDescription("");
        setQuestions(DEFAULT_QUESTIONS.map((q) => ({ ...q })));
      }
    })();
  }, [open, survey]);

  const uploadHero = async (file: File) => {
    setUploadingHero(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `college-surveys/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("tournament-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("tournament-assets").getPublicUrl(path);
      setHeroImageUrl(data.publicUrl);
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploadingHero(false);
    }
  };

  useEffect(() => {
    if (!survey && title && !slug) setSlug(slugify(title));
  }, [title]); // eslint-disable-line

  const updateQ = (i: number, patch: Partial<Question>) => {
    setQuestions((qs) => qs.map((q, idx) => idx === i ? { ...q, ...patch } : q));
  };
  const addQ = () => setQuestions((qs) => [...qs, { question_text: "", question_type: "text", display_order: qs.length + 1, is_required: true, options: null }]);
  const removeQ = (i: number) => setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  const moveQ = (i: number, dir: -1 | 1) => setQuestions((qs) => {
    const j = i + dir; if (j < 0 || j >= qs.length) return qs;
    const copy = [...qs]; [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy.map((q, idx) => ({ ...q, display_order: idx + 1 }));
  });

  const save = async () => {
    if (!title.trim() || !slug.trim()) { toast({ title: "Title and slug are required", variant: "destructive" }); return; }
    if (questions.some((q) => !q.question_text.trim())) { toast({ title: "All questions need text", variant: "destructive" }); return; }
    setSaving(true);
    try {
      let surveyId = survey?.id;
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        slug: slugify(slug),
        is_active: isActive,
        notify_respondent: notifyRespondent,
        hero_image_url: heroImageUrl,
        tournament_id: tournamentId || null,
        cta_label: ctaLabel.trim() || null,
        cta_description: ctaDescription.trim() || null,
      };
      if (surveyId) {
        const { error } = await (supabase as any).from("college_surveys").update(payload).eq("id", surveyId);
        if (error) throw error;
        await (supabase as any).from("college_survey_questions").delete().eq("survey_id", surveyId);
      } else {
        const { data, error } = await (supabase as any).from("college_surveys").insert(payload).select("id").single();
        if (error) throw error;
        surveyId = data.id;
      }
      const rows = questions.map((q, i) => ({
        survey_id: surveyId,
        question_text: q.question_text.trim(),
        question_type: q.question_type,
        display_order: i + 1,
        is_required: q.is_required,
        options: q.options && q.options.length ? q.options : null,
      }));
      if (rows.length) {
        const { error } = await (supabase as any).from("college_survey_questions").insert(rows);
        if (error) throw error;
      }
      toast({ title: "Survey saved" });
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{survey ? "Edit Survey" : "Create Survey"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Survey Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="2026 Student Survey" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Survey Card Label</Label>
            <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Take Our Survey" />
            <p className="text-xs text-muted-foreground mt-1">Shown above the survey title on the tournament page (e.g., "Take Our Survey").</p>
          </div>
          <div>
            <Label>Survey Card Description</Label>
            <Textarea value={ctaDescription} onChange={(e) => setCtaDescription(e.target.value)} rows={2} placeholder="Share your feedback — it only takes a minute." />
            <p className="text-xs text-muted-foreground mt-1">Shown below the survey title on the tournament page.</p>
          </div>
          <div>
            <Label>Custom URL Slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/s/</span>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="student-survey-2026" />
            </div>
          </div>
          <div>
            <Label>Hero Image (optional)</Label>
            {heroImageUrl && (
              <div className="mb-2 relative inline-block">
                <img src={heroImageUrl} alt="Survey hero" className="max-h-40 rounded border" />
                <Button size="sm" variant="ghost" className="absolute top-1 right-1 h-6 text-destructive bg-background/80" onClick={() => setHeroImageUrl(null)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
            <Input type="file" accept="image/*" disabled={uploadingHero} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadHero(f); }} />
            {uploadingHero && <p className="text-xs text-muted-foreground mt-1">Uploading…</p>}
          </div>
          <div>
            <Label>Connect to College Hub Tournament (optional)</Label>
            <select className="w-full border rounded px-2 py-2 bg-background text-sm" value={tournamentId} onChange={(e) => setTournamentId(e.target.value)}>
              <option value="">— Not connected —</option>
              {tournaments.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <p className="text-xs text-muted-foreground mt-1">When connected, this survey will appear on the tournament's College Hub page.</p>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm"><Switch checked={isActive} onCheckedChange={setIsActive} /> Active</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={notifyRespondent} onCheckedChange={setNotifyRespondent} /> Email respondent a thank-you</label>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Questions</h3>
              <Button size="sm" variant="outline" onClick={addQ}><Plus className="w-3.5 h-3.5 mr-1" />Add Question</Button>
            </div>
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/30">
                  <div className="flex gap-2 items-start">
                    <div className="flex flex-col gap-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveQ(i, -1)}><ArrowUp className="w-3 h-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveQ(i, 1)}><ArrowDown className="w-3 h-3" /></Button>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input value={q.question_text} onChange={(e) => updateQ(i, { question_text: e.target.value })} placeholder={`Question ${i + 1}`} />
                      <div className="flex flex-wrap gap-3 items-center text-sm">
                        <select className="border rounded px-2 py-1 bg-background" value={q.question_type} onChange={(e) => updateQ(i, { question_type: e.target.value as any, options: ["radio", "dropdown", "checkbox"].includes(e.target.value) ? (q.options && q.options.length ? q.options : ["Option 1", "Option 2"]) : null })}>
                          <option value="text">Short text</option>
                          <option value="textarea">Long text</option>
                          <option value="radio">Multiple choice (pick one)</option>
                          <option value="checkbox">Multiple choice (pick many)</option>
                          <option value="dropdown">Dropdown</option>
                        </select>
                        <label className="flex items-center gap-1"><input type="checkbox" checked={q.is_required} onChange={(e) => updateQ(i, { is_required: e.target.checked })} /> Required</label>
                        <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => removeQ(i)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                      {(q.question_type === "dropdown" || q.question_type === "checkbox" || q.question_type === "radio") && (
                        <div className="space-y-2">
                          <Label className="text-xs">Answer choices</Label>
                          {(q.options || []).map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <Input
                                value={opt}
                                placeholder={`Choice ${oi + 1}`}
                                onChange={(e) => {
                                  const next = [...(q.options || [])];
                                  next[oi] = e.target.value;
                                  updateQ(i, { options: next });
                                }}
                              />
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => updateQ(i, { options: (q.options || []).filter((_, x) => x !== oi) })}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ))}
                          <Button size="sm" variant="outline" onClick={() => updateQ(i, { options: [...(q.options || []), ""] })}>
                            Add choice
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Survey"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function csvEscape(v: any) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function ResponsesDialog({ survey, onOpenChange }: { survey: Survey | null; onOpenChange: (o: boolean) => void }) {
  const [rows, setRows] = useState<ResponseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<ResponseRow | null>(null);

  useEffect(() => {
    if (!survey) { setRows([]); return; }
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any).from("college_survey_responses").select("*").eq("survey_id", survey.id).order("submitted_at", { ascending: false });
      setRows(data || []);
      setLoading(false);
    })();
  }, [survey]);

  const extraKeys = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => Object.keys(r.response_data || {}).forEach((k) => set.add(k)));
    return Array.from(set);
  }, [rows]);

  const exportCsv = () => {
    if (!survey) return;
    const header = ["Name", "Email", "School", "Current Year", "Current Major", "Career Goals", ...extraKeys, "Submitted At"];
    const body = rows.map((r) => [
      r.respondent_name, r.respondent_email, r.respondent_school, r.respondent_year, r.respondent_major, r.respondent_career_goals,
      ...extraKeys.map((k) => (r.response_data || {})[k] || ""),
      new Date(r.submitted_at).toLocaleString(),
    ].map(csvEscape).join(","));
    const csv = [header.join(","), ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${survey.slug}-responses.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={!!survey} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Responses — {survey?.title}</span>
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="w-4 h-4 mr-1" />Export CSV</Button>
          </DialogTitle>
        </DialogHeader>
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No responses yet.</p>
        ) : (
          <div className="overflow-x-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">School</th>
                  <th className="text-left p-2">Year</th>
                  <th className="text-left p-2">Major</th>
                  <th className="text-left p-2">Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{i + 1}</td>
                    <td className="p-2">{r.respondent_name || "—"}</td>
                    <td className="p-2">{r.respondent_email || "—"}</td>
                    <td className="p-2">{r.respondent_school || "—"}</td>
                    <td className="p-2">{r.respondent_year || "—"}</td>
                    <td className="p-2">{r.respondent_major || "—"}</td>
                    <td className="p-2">{new Date(r.submitted_at).toLocaleString()}</td>
                    <td className="p-2 text-right"><Button size="sm" variant="ghost" onClick={() => setViewing(r)}>View</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Full Response — {viewing?.respondent_name || "Anonymous"}</DialogTitle></DialogHeader>
            {viewing && (
              <div className="space-y-2 text-sm">
                {Object.entries(viewing.response_data || {}).map(([k, v]) => (
                  <div key={k}><strong>{k}:</strong> <span className="whitespace-pre-wrap">{String(v ?? "")}</span></div>
                ))}
                <p className="text-xs text-muted-foreground pt-2">Submitted {new Date(viewing.submitted_at).toLocaleString()}</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
