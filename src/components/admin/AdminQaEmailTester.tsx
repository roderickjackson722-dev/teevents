import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Eye } from "lucide-react";
import { toast } from "sonner";

export default function AdminQaEmailTester() {
  const [mode, setMode] = useState<"tournament" | "league">("tournament");
  const [recipient, setRecipient] = useState("info@teevents.golf");
  const [sourceId, setSourceId] = useState("");
  const [loading, setLoading] = useState<"send" | "preview" | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const run = async (send: boolean) => {
    setLoading(send ? "send" : "preview");
    setPreview(null);
    try {
      const payload: Record<string, unknown> = { mode, send, recipient_email: recipient.trim() };
      const id = sourceId.trim();
      if (id) {
        if (mode === "tournament") payload.tournament_id = id;
        else payload.league_id = id;
      }
      const { data, error } = await supabase.functions.invoke("send-qa-test-email", { body: payload });
      if (error) {
        const details = (error as any)?.context ? await (error as any).context.text() : error.message;
        throw new Error(details);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      setPreview((data as any)?.preview_html || null);
      toast.success(send ? `Test confirmation sent to ${recipient}` : "Preview generated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate test email");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h3 className="font-semibold flex items-center gap-2">
          <Mail className="h-4 w-4" /> Q&A Confirmation Email Tester
        </h3>
        <p className="text-sm text-muted-foreground">
          Renders a confirmation email from the most recent real registration using the exact live
          template, so you can verify every question and answer before going live.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "tournament" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("tournament")}
            >
              Tournament
            </Button>
            <Button
              type="button"
              variant={mode === "league" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("league")}
            >
              League
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="qa-recipient">Send to</Label>
          <Input
            id="qa-recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="qa-source">
            {mode === "tournament" ? "Tournament ID (optional)" : "League ID (optional)"}
          </Label>
          <Input
            id="qa-source"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            placeholder="Leave blank for latest registration"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => run(true)} disabled={loading !== null}>
          {loading === "send" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
          Send test confirmation
        </Button>
        <Button variant="outline" onClick={() => run(false)} disabled={loading !== null}>
          {loading === "preview" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
          Preview only
        </Button>
      </div>

      {preview && (
        <div className="border rounded-md overflow-hidden">
          <iframe title="Confirmation email preview" srcDoc={preview} className="w-full h-[520px] bg-white" />
        </div>
      )}
    </Card>
  );
}
