import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2, Eye, ArrowRight } from "lucide-react";

interface SampleModePanelProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tournamentId: string;
  tournamentTitle: string;
  onChanged?: () => void;
}

interface SampleState {
  is_sample: boolean;
  sample_token: string | null;
  sample_view_count: number;
  sample_last_viewed: string | null;
  is_converted_from_sample: boolean;
}

export default function SampleModePanel({ open, onOpenChange, tournamentId, tournamentTitle, onChanged }: SampleModePanelProps) {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<SampleState | null>(null);
  const [toggling, setToggling] = useState(false);
  const [organizerEmail, setOrganizerEmail] = useState("");
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tournaments")
        .select("is_sample, sample_token, sample_view_count, sample_last_viewed, is_converted_from_sample")
        .eq("id", tournamentId)
        .maybeSingle();
      setState((data as any) || null);
      setLoading(false);
    })();
  }, [open, tournamentId]);

  const sampleLink = state?.sample_token
    ? `${window.location.origin}/sample/dashboard/${state.sample_token}`
    : "";

  async function toggleSample(enabled: boolean) {
    setToggling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const patch: any = { is_sample: enabled };
      if (enabled) {
        if (!state?.sample_token) patch.sample_token = crypto.randomUUID();
        patch.sample_created_by = user?.id ?? null;
      }
      const { data, error } = await supabase
        .from("tournaments")
        .update(patch)
        .eq("id", tournamentId)
        .select("is_sample, sample_token, sample_view_count, sample_last_viewed, is_converted_from_sample")
        .maybeSingle();
      if (error) throw error;
      setState(data as any);
      toast.success(enabled ? "Sample mode enabled" : "Sample mode disabled");
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message || "Failed to update sample mode");
    } finally {
      setToggling(false);
    }
  }

  async function copyLink() {
    if (!sampleLink) return;
    try {
      await navigator.clipboard.writeText(sampleLink);
      toast.success("Sample link copied");
    } catch {
      toast.error("Copy failed — select and copy manually");
    }
  }

  async function convertToLive() {
    const email = organizerEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid organizer email");
      return;
    }
    if (!confirm(`Convert "${tournamentTitle}" to a LIVE tournament and assign ${email} as the organizer?`)) return;
    setConverting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-convert-sample-tournament", {
        body: { tournament_id: tournamentId, email },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const res = data as any;
      if (res.temp_password) {
        window.prompt(
          `Account created for ${email}. Copy this temporary password and share with the organizer:`,
          res.temp_password,
        );
      }
      toast.success(`Converted to live tournament. ${email} is now the owner.`);
      onChanged?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to convert tournament");
    } finally {
      setConverting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Eye className="h-4 w-4" />Sample Mode — Sales Tool</DialogTitle>
          <DialogDescription>
            Share a read-only preview of <strong>{tournamentTitle}</strong> with a prospect. Convert to live when they're ready.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading…</div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm font-medium">Enable Sample Mode</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When on, anyone with the link can view this tournament's dashboard without logging in.
                </p>
              </div>
              <Switch
                checked={!!state?.is_sample}
                onCheckedChange={toggleSample}
                disabled={toggling}
              />
            </div>

            {state?.is_sample && sampleLink && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Sample Link</Label>
                <div className="flex gap-2">
                  <Input value={sampleLink} readOnly className="text-xs font-mono" />
                  <Button size="icon" variant="outline" onClick={copyLink} title="Copy link"><Copy className="h-4 w-4" /></Button>
                  <Button size="icon" variant="outline" asChild title="Open in new tab">
                    <a href={sampleLink} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground flex gap-4">
                  <span>Views: <strong>{state.sample_view_count}</strong></span>
                  <span>Last viewed: <strong>{state.sample_last_viewed ? new Date(state.sample_last_viewed).toLocaleString() : "Never"}</strong></span>
                </div>
              </div>
            )}

            <div className="border-t pt-4 space-y-2">
              <Label className="text-sm font-medium">Convert to Live Tournament</Label>
              <p className="text-xs text-muted-foreground">
                Assign an organizer as owner. They receive a login email with a temporary password and full admin access.
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="organizer@example.com"
                  value={organizerEmail}
                  onChange={(e) => setOrganizerEmail(e.target.value)}
                  disabled={converting}
                />
                <Button onClick={convertToLive} disabled={converting || !organizerEmail}>
                  {converting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-1" />}
                  Convert
                </Button>
              </div>
              {state?.is_converted_from_sample && (
                <p className="text-xs text-emerald-600">This tournament was previously converted from a sample.</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
