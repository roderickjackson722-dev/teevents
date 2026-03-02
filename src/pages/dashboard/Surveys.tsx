import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Plus, Trash2, BarChart3, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Surveys() {
  const { org, loading: orgLoading } = useOrgContext();
  const queryClient = useQueryClient();
  const [selectedTournament, setSelectedTournament] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [questionDialog, setQuestionDialog] = useState(false);
  const [questionForm, setQuestionForm] = useState({ question: "", type: "rating" });

  const { data: tournaments } = useQuery({
    queryKey: ["tournaments", org?.orgId],
    queryFn: async () => {
      const { data } = await supabase.from("tournaments").select("id, title").eq("organization_id", org!.orgId).order("date", { ascending: false });
      return data || [];
    },
    enabled: !!org,
  });

  const { data: surveys } = useQuery({
    queryKey: ["surveys", selectedTournament],
    queryFn: async () => {
      const { data } = await supabase.from("tournament_surveys").select("*").eq("tournament_id", selectedTournament);
      return data || [];
    },
    enabled: !!selectedTournament,
  });

  const currentSurvey = surveys?.[0];

  const { data: questions } = useQuery({
    queryKey: ["survey-questions", currentSurvey?.id],
    queryFn: async () => {
      const { data } = await supabase.from("tournament_survey_questions").select("*").eq("survey_id", currentSurvey!.id).order("sort_order");
      return data || [];
    },
    enabled: !!currentSurvey,
  });

  const { data: responses } = useQuery({
    queryKey: ["survey-responses", currentSurvey?.id],
    queryFn: async () => {
      const { data } = await supabase.from("tournament_survey_responses").select("*").eq("survey_id", currentSurvey!.id);
      return data || [];
    },
    enabled: !!currentSurvey,
  });

  const createSurvey = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tournament_surveys").insert({
        tournament_id: selectedTournament,
        title: "Post-Event Survey",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      toast({ title: "Survey created!" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tournament_surveys").update({ is_active: !currentSurvey!.is_active }).eq("id", currentSurvey!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["surveys"] }),
  });

  const addQuestion = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tournament_survey_questions").insert({
        survey_id: currentSurvey!.id,
        question: questionForm.question,
        type: questionForm.type,
        sort_order: (questions?.length || 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setQuestionDialog(false);
      setQuestionForm({ question: "", type: "rating" });
      queryClient.invalidateQueries({ queryKey: ["survey-questions"] });
      toast({ title: "Question added!" });
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tournament_survey_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["survey-questions"] });
    },
  });

  const getResponsesForQuestion = (qId: string) => responses?.filter((r) => r.question_id === qId) || [];

  const getAverageRating = (qId: string) => {
    const qResponses = getResponsesForQuestion(qId);
    if (qResponses.length === 0) return null;
    const sum = qResponses.reduce((s, r) => s + parseFloat(r.answer), 0);
    return (sum / qResponses.length).toFixed(1);
  };

  const uniqueRespondents = new Set(responses?.map((r) => r.respondent_email) || []);

  if (orgLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Post-Event Survey & Analytics</h1>
        <p className="text-muted-foreground">Gather feedback and analyze results.</p>
      </div>

      <Select value={selectedTournament} onValueChange={setSelectedTournament}>
        <SelectTrigger className="w-[300px]"><SelectValue placeholder="Select a tournament" /></SelectTrigger>
        <SelectContent>
          {tournaments?.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
        </SelectContent>
      </Select>

      {selectedTournament && !currentSurvey && (
        <Card className="text-center py-12">
          <CardContent>
            <ClipboardList className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No survey created for this tournament yet.</p>
            <Button onClick={() => createSurvey.mutate()}>
              <Plus className="mr-2 h-4 w-4" /> Create Survey
            </Button>
          </CardContent>
        </Card>
      )}

      {currentSurvey && (
        <>
          <div className="flex items-center gap-4">
            <Card className="flex-1">
              <CardContent className="pt-6 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{currentSurvey.title}</p>
                  <p className="text-sm text-muted-foreground">{uniqueRespondents.size} responses</p>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-sm">Active</Label>
                  <Switch checked={currentSurvey.is_active || false} onCheckedChange={() => toggleActive.mutate()} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Questions</h2>
            <Dialog open={questionDialog} onOpenChange={setQuestionDialog}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-1 h-3 w-3" /> Add Question</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Survey Question</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Question</Label><Input value={questionForm.question} onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })} placeholder="How would you rate the event?" /></div>
                  <div>
                    <Label>Type</Label>
                    <Select value={questionForm.type} onValueChange={(v) => setQuestionForm({ ...questionForm, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rating">Rating (1-5)</SelectItem>
                        <SelectItem value="text">Free Text</SelectItem>
                        <SelectItem value="yes_no">Yes/No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => addQuestion.mutate()} disabled={!questionForm.question} className="w-full">Add Question</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {questions?.map((q, i) => {
              const qResponses = getResponsesForQuestion(q.id);
              const avg = getAverageRating(q.id);
              return (
                <Card key={q.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">Q{i + 1}.</span>
                          <span className="font-medium">{q.question}</span>
                          <Badge variant="outline" className="text-xs">{q.type}</Badge>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{qResponses.length} responses</span>
                          {q.type === "rating" && avg && (
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" /> {avg}/5
                            </span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteQuestion.mutate(q.id)} className="text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {questions?.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No questions yet. Add some to your survey.</p>
            )}
          </div>

          {responses && responses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" /> Recent Responses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead>Answer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.slice(0, 20).map((r) => {
                      const q = questions?.find((q) => q.id === r.question_id);
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm">{r.respondent_email}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{q?.question || "—"}</TableCell>
                          <TableCell className="font-medium">{r.answer}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
