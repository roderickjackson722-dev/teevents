import { useEffect, useState } from "react";
import { useParams } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Target {
  registration_id: string;
  player_name: string;
  tournament_name: string;
  tournament_slug: string | null;
  current_age: string | null;
}

/** Public, token-gated form where a player supplies only their age. */
export default function UpdateAge() {
  const params = useParams() as Record<string, string | undefined>;
  const token = params.token || "";
  const isPreview = token.toLowerCase() === "preview";
  const [loading, setLoading] = useState(!isPreview);
  const [target, setTarget] = useState<Target | null>(
    isPreview
      ? {
          registration_id: "preview",
          player_name: "Test Player",
          tournament_name: "Sample Tournament",
          tournament_slug: null,
          current_age: null,
        }
      : null,
  );
  const [age, setAge] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token || isPreview) { setLoading(false); return; }
    let cancelled = false;
    (supabase as any)
      .rpc("get_age_update_target", { _token: token })
      .then(({ data }: any) => {
        if (cancelled) return;
        const row = Array.isArray(data) ? data[0] : data;
        if (row) {
          setTarget(row as Target);
          if (row.current_age) setAge(String(row.current_age));
        }
        setLoading(false);
      }, () => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, isPreview]);

  const submit = async () => {
    const n = Number(age);
    if (!Number.isFinite(n) || n < 3 || n > 100) {
      toast.error("Please enter an age between 3 and 100");
      return;
    }
    if (isPreview) {
      toast.success("Preview only — nothing was saved.");
      setDone(true);
      return;
    }
    setSaving(true);
    const { data, error } = await (supabase as any).rpc("submit_age_update", {
      _token: token,
      _age: Math.floor(n),
    });
    setSaving(false);
    if (error || data === false) {
      toast.error(error?.message || "We couldn't save your age. Please try the link from your email again.");
      return;
    }
    setDone(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!target) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">This link has expired or isn't valid</h1>
          <p className="text-sm text-muted-foreground">
            Age update links are unique to each player. Please use the exact link from your email,
            or reply to the organizer with your age.
          </p>
          <Button asChild variant="outline" className="mt-2">
            <a href="/">Go to TeeVents home</a>
          </Button>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-lg overflow-hidden">
        <div className="bg-primary px-6 py-5">
          <h1 className="text-lg font-bold text-primary-foreground">
            Update Your Age — {target.tournament_name}
          </h1>
        </div>

        {isPreview && (
          <div className="bg-accent/40 border-b border-border px-6 py-3 text-xs text-muted-foreground">
            Preview mode — this is what players see. Nothing entered here is saved.
          </div>
        )}



        {done ? (
          <div className="p-6 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
            <p className="font-semibold text-foreground">Thank you — your age has been saved.</p>
            <p className="text-sm text-muted-foreground">
              Nothing else is needed. Your registration record is now complete.
            </p>
            {target.tournament_slug && (
              <Button asChild variant="outline" className="mt-2">
                <a href={`/t/${target.tournament_slug}`}>Back to the event page</a>
              </Button>
            )}
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <p className="text-sm text-muted-foreground">
              Player: <span className="font-semibold text-foreground">{target.player_name}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="age">Please provide your age</Label>
              <Input
                id="age"
                type="number"
                min={3}
                max={100}
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 42"
              />
              <p className="text-xs text-muted-foreground">
                This takes less than a minute. No other information needs to be changed.
              </p>
            </div>
            <Button onClick={submit} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Submit
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
