import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getStripeConnectInvite, sendStripeConnectInvite } from "@/lib/stripeConnectInvite.functions";

export default function StripeConnectInvite({ tournamentId }: { tournamentId: string }) {
  const getStatus = useServerFn(getStripeConnectInvite);
  const sendInvite = useServerFn(sendStripeConnectInvite);
  const [status, setStatus] = useState<{ connected: boolean; sentAt: string | null; recipient: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try { setStatus(await getStatus({ data: { tournamentId } })); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not read invite status."); }
  }, [getStatus, tournamentId]);
  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(onFocus, 30000);
    return () => { window.removeEventListener("focus", onFocus); window.clearInterval(timer); };
  }, [refresh]);
  async function send() {
    setBusy(true);
    try {
      await sendInvite({ data: { tournamentId } });
      await refresh();
      toast.success("Stripe connect invite sent to the organizer on file.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not send invite."); }
    finally { setBusy(false); }
  }
  return <div className="mb-4 space-y-2 border-t border-border pt-3 text-sm">
    <p className="font-medium">Organizer contact: <span className="font-normal text-muted-foreground">{status?.recipient || (error ? "Unavailable" : status ? "No single organizer on file" : "Loading…")}</span></p>
    {error ? <p className="text-destructive" role="alert">{error}</p> : <p role="status">{status?.connected ? "Connected" : "Not yet connected"}{status?.sentAt && <span className="ml-3 text-muted-foreground">Invite sent: {new Date(status.sentAt).toLocaleString()}</span>}</p>}
    <Button variant="outline" size="sm" onClick={send} disabled={busy || !status?.recipient || status.connected}>
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
      {status?.sentAt ? "Resend" : "Send Stripe Connect Invite"}
    </Button>
  </div>;
}