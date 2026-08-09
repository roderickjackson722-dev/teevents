import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { sendAgeRequestEmails } from "@/lib/ageRequestEmail.functions";
import { useTournamentIdParam } from "@/hooks/useTournamentIdParam";
import { AGE_REQUEST_DEFAULTS, AGE_REQUEST_VARIABLES, buildAgeRequestHtml, type AgeRequestConfig } from "@/lib/ageRequestEmail.shared";
import { parseAge } from "@/lib/ageGroups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mail, Save, Send, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";

interface Tournament { id: string; title: string; slug: string | null }

interface Reg {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  created_at: string;
  custom_answers: { label?: string; answer?: unknown }[] | null;
}

const ageAnswer = (r: Reg): unknown => {
  const hit = (r.custom_answers || []).find((a) => String(a?.label || "").toLowerCase().includes("age"));
  return hit?.answer;
};

const MissingAges = () => {
  const [tournamentId, setTournamentId] = useTournamentIdParam();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [regs, setRegs] = useState<Reg[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AgeRequestConfig>(AGE_REQUEST_DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [manualAge, setManualAge] = useState<Record<string, string>>({});
  const [testEmail, setTestEmail] = useState("");
  const send = useServerFn(sendAgeRequestEmails);

  useEffect(() => {
    supabase
      .from("tournaments")
      .select("id, title, slug")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        const list = (data as Tournament[]) || [];
        setTournaments(list);
        if (!tournamentId && list[0]) setTournamentId(list[0].id);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = () => {
    if (!tournamentId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      supabase
        .from("tournament_registrations")
        .select("id, first_name, last_name, email, created_at, custom_answers")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: true }),
      supabase.from("tournaments").select("age_request_email_config").eq("id", tournamentId).maybeSingle(),
    ]).then(([regRes, tRes]) => {
      setRegs(((regRes.data as unknown) as Reg[]) || []);
      const cfg = (tRes.data as any)?.age_request_email_config;
      setConfig({ ...AGE_REQUEST_DEFAULTS, ...(cfg || {}) });
      setSelected({});
      setLoading(false);
    });
  };

  useEffect(load, [tournamentId]);

  const missing = useMemo(
    () => regs.filter((r) => parseAge(ageAnswer(r)) === null),
    [regs],
  );

  const selectedIds = useMemo(
    () => missing.filter((r) => selected[r.id] && r.email).map((r) => r.id),
    [missing, selected],
  );

  const saveTemplate = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("tournaments")
      .update({ age_request_email_config: config as any })
      .eq("id", tournamentId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Age Verification Request template saved");
  };

  const doSend = async (ids: string[] | "all", test?: string) => {
    setSending(true);
    try {
      const res: any = await send({
        data: {
          tournamentId,
          registrationIds: ids === "all" ? [] : ids,
          testEmail: test || "",
        },
      });
      if (res?.sent) toast.success(`Sent ${res.sent} email${res.sent === 1 ? "" : "s"}${res.failed ? `, ${res.failed} failed` : ""}`);
      else toast.error(res?.results?.[0]?.error || "No emails were sent");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send");
    }
    setSending(false);
  };

  const saveManualAge = async (r: Reg, value: string) => {
    const age = parseAge(value);
    if (age === null) { toast.error("Enter an age between 3 and 100"); return; }
    const kept = (r.custom_answers || []).filter((a) => !String(a?.label || "").toLowerCase().includes("age"));
    const next = [...kept, { field_id: "_age", label: "Age", field_type: "number", answer: String(age) }];
    const { error } = await supabase
      .from("tournament_registrations")
      .update({ custom_answers: next as any })
      .eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Age saved for ${r.first_name} ${r.last_name}`);
    setRegs((prev) => prev.map((x) => (x.id === r.id ? { ...x, custom_answers: next } : x)));
  };

  const previewHtml = useMemo(
    () =>
      buildAgeRequestHtml(config, {
        first_name: "John",
        last_name: "Smith",
        player_name: "John Smith",
        event_name: tournaments.find((t) => t.id === tournamentId)?.title || "Your Tournament",
        link_to_age_update_form: "#",
      }, "#"),
    [config, tournamentId, tournaments],
  );

  const field = (key: keyof AgeRequestConfig, label: string, multiline = false) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {multiline ? (
        <Textarea
          rows={5}
          value={String(config[key] ?? "")}
          onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
        />
      ) : (
        <Input
          value={String(config[key] ?? "")}
          onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Missing Age Records</h1>
          <p className="text-sm text-muted-foreground">
            Find registrations without a valid age, request it by email, or enter it yourself.
          </p>
        </div>
        <div className="w-full sm:w-[320px]">
          <Label className="text-xs">Tournament</Label>
          <Select value={tournamentId} onValueChange={setTournamentId}>
            <SelectTrigger><SelectValue placeholder="Select a tournament" /></SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="records">
          <TabsList>
            <TabsTrigger value="records">Records ({missing.length})</TabsTrigger>
            <TabsTrigger value="template">Email Template</TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="space-y-4 pt-4">
            <div className="rounded-lg border border-secondary/30 bg-secondary/10 p-4 text-sm">
              <p className="font-semibold text-foreground mb-1">
                {missing.length} of {regs.length} registrations are missing a valid age
              </p>
              <p className="text-muted-foreground">
                Each email contains a private link that lets the player submit only their age — no other
                registration data is visible or editable through it.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => doSend("all")} disabled={sending || missing.length === 0}>
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Email all missing ({missing.filter((r) => r.email).length})
              </Button>
              <Button
                variant="outline"
                onClick={() => doSend(selectedIds)}
                disabled={sending || selectedIds.length === 0}
              >
                <Mail className="h-4 w-4 mr-2" /> Email selected ({selectedIds.length})
              </Button>
              <Button variant="ghost" size="sm" onClick={load}>Refresh</Button>
            </div>

            {missing.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-lg border border-border">
                <UserRoundCheck className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-muted-foreground">Every registration has a valid age on file.</p>
              </div>
            ) : (
              <div className="bg-card rounded-lg border border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-3 py-3 w-10">
                        <Checkbox
                          checked={selectedIds.length > 0 && selectedIds.length === missing.filter((r) => r.email).length}
                          onCheckedChange={(v) => {
                            const next: Record<string, boolean> = {};
                            if (v) missing.forEach((r) => { if (r.email) next[r.id] = true; });
                            setSelected(next);
                          }}
                        />
                      </th>
                      <th className="text-left font-semibold px-4 py-3">Player</th>
                      <th className="text-left font-semibold px-4 py-3">Email</th>
                      <th className="text-left font-semibold px-4 py-3">Registered</th>
                      <th className="text-left font-semibold px-4 py-3">Answer on file</th>
                      <th className="text-left font-semibold px-4 py-3">Enter age manually</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {missing.map((r) => (
                      <tr key={r.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-3">
                          <Checkbox
                            disabled={!r.email}
                            checked={!!selected[r.id]}
                            onCheckedChange={(v) => setSelected((s) => ({ ...s, [r.id]: !!v }))}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                          {r.first_name} {r.last_name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{r.email || "— no email —"}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {String(ageAnswer(r) ?? "") || "blank"}
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            className="w-24"
                            value={manualAge[r.id] || ""}
                            onChange={(e) => setManualAge((m) => ({ ...m, [r.id]: e.target.value }))}
                            placeholder="Age"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => saveManualAge(r, manualAge[r.id] || "")}
                          >
                            Save
                          </Button>
                          {r.email && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={sending}
                              onClick={() => doSend([r.id])}
                            >
                              Email
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="template" className="pt-4">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                {field("subject", "Subject line")}
                {field("header_title", "Header title")}
                {field("greeting", "Greeting")}
                {field("body_text", "Body (HTML allowed)", true)}
                {field("closing_text", "Closing note", true)}
                {field("footer_text", "Footer note")}
                {field("button_text", "Button label")}

                <div className="grid grid-cols-2 gap-3">
                  {field("header_bg_color", "Header background")}
                  {field("header_text_color", "Header text color")}
                </div>

                <div className="rounded-md border border-border p-3 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground mb-1">Available variables</p>
                  <div className="flex flex-wrap gap-1.5">
                    {AGE_REQUEST_VARIABLES.map((v) => (
                      <code key={v} className="bg-muted px-1.5 py-0.5 rounded">{`{{${v}}}`}</code>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={saveTemplate} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save template
                  </Button>
                  <Input
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-[220px]"
                  />
                  <Button
                    variant="outline"
                    disabled={sending || !testEmail}
                    onClick={() => doSend([], testEmail)}
                  >
                    Send test
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Live preview</Label>
                <iframe
                  title="Age request email preview"
                  className="w-full h-[640px] rounded-lg border border-border bg-white"
                  srcDoc={previewHtml}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default MissingAges;
