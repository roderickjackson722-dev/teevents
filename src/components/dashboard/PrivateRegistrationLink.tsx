import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const newToken = () => {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

/** Private link that lets requested players register while public registration is closed. */
export default function PrivateRegistrationLink({ tournamentId, slug }: { tournamentId: string; slug: string | null }) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const db = supabase as any;

  useEffect(() => {
    if (!tournamentId) return;
    db.from("tournament_private_registration_links").select("token").eq("tournament_id", tournamentId).maybeSingle()
      .then(({ data }: any) => setToken(data?.token ?? null));
  }, [tournamentId]);

  const url = token && slug ? `https://www.teevents.golf/t/${slug}?invite=${token}#register` : "";

  const create = async () => {
    setBusy(true);
    const t = newToken();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await db.from("tournament_private_registration_links")
      .upsert({ tournament_id: tournamentId, token: t, created_by: u.user?.id ?? null, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) return toast.error("Could not create the link. Please try again.");
    setToken(t);
    toast.success(token ? "New link created. The old link no longer works." : "Private link created.");
  };

  const turnOff = async () => {
    setBusy(true);
    const { error } = await db.from("tournament_private_registration_links").delete().eq("tournament_id", tournamentId);
    setBusy(false);
    if (error) return toast.error("Could not turn off the link.");
    setToken(null);
    toast.success("Private link turned off.");
  };

  return (
    <div className="mt-4 p-3 rounded-lg border border-border bg-muted/20 space-y-2">
      <Label className="text-sm font-semibold">Private Registration Link</Label>
      <p className="text-xs text-muted-foreground">
        Share by request only. Anyone with this link can register even while registration is closed to the public.
      </p>
      {url ? (
        <>
          <div className="flex gap-2">
            <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="text-xs" />
            <Button type="button" size="sm" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copied"); }}>Copy</Button>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={create}>Create New Link</Button>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={turnOff}>Turn Off Link</Button>
          </div>
        </>
      ) : (
        <Button type="button" size="sm" variant="outline" disabled={busy || !slug} onClick={create}>Create Private Link</Button>
      )}
    </div>
  );
}
