import { useEffect, useState } from "react";
import { KeyRound, Search, Copy, Send, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type FoundUser = {
  id: string;
  email: string;
  confirmed: boolean;
  banned: boolean;
  last_sign_in_at: string | null;
  organizations?: string[];
};

type LogRow = {
  id: string;
  target_email: string;
  emailed: boolean;
  created_at: string;
  expires_at: string;
  used_at: string | null;
};

const AdminPasswordResetHelper = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<FoundUser[] | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [generated, setGenerated] = useState<{ email: string; link: string } | null>(null);
  const [log, setLog] = useState<LogRow[]>([]);

  const invoke = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-password-reset-helper", {
      body: payload,
    });
    if (error) throw new Error(error.message);
    if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
    return data as Record<string, any>;
  };

  const loadLog = async () => {
    try {
      const data = await invoke({ action: "log" });
      setLog((data.log ?? []) as LogRow[]);
    } catch {
      /* non-blocking */
    }
  };

  useEffect(() => {
    loadLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setGenerated(null);
    try {
      const data = await invoke({ action: "search", email: email.trim() });
      setResults((data.users ?? []) as FoundUser[]);
    } catch (err) {
      toast({ title: "Search failed", description: (err as Error).message, variant: "destructive" });
    }
    setSearching(false);
  };

  const handleGenerate = async (target: FoundUser, sendEmail: boolean) => {
    setGeneratingFor(target.id + (sendEmail ? "-send" : ""));
    try {
      const data = await invoke({
        action: "generate",
        email: target.email,
        name: target.organizations?.[0] ?? "",
        send_email: sendEmail,
      });
      setGenerated({ email: target.email, link: data.link as string });
      toast({
        title: sendEmail ? (data.emailed ? "Reset email sent" : "Link created (email not sent)") : "Reset link generated",
        description: sendEmail && !data.emailed
          ? "Copy the link below and send it manually."
          : `Expires in 24 hours.`,
      });
      loadLog();
    } catch (err) {
      toast({ title: "Could not generate link", description: (err as Error).message, variant: "destructive" });
    }
    setGeneratingFor(null);
  };

  const copyLink = async () => {
    if (!generated) return;
    await navigator.clipboard.writeText(generated.link);
    toast({ title: "Link copied", description: "One-time reset link copied to clipboard." });
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-display font-bold text-foreground">Password Reset Helper</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          This tool generates a one-time password reset link for any organizer. Links expire in 24 hours
          and every generated link is logged below for security.
        </p>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Organizer email (or part of it)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={searching || email.trim().length < 3}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </Button>
        </form>
      </div>

      {results && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border font-semibold text-foreground">
            Search Results ({results.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3 font-semibold">Name / Organization</th>
                  <th className="p-3 font-semibold">Email</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="p-3">{u.organizations?.length ? u.organizations.join(", ") : "—"}</td>
                    <td className="p-3 break-all">{u.email}</td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          u.banned
                            ? "bg-destructive/10 text-destructive"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {u.banned ? "Suspended" : u.confirmed ? "Active" : "Unconfirmed"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleGenerate(u, false)}
                          disabled={generatingFor !== null}
                        >
                          {generatingFor === u.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <KeyRound className="h-3.5 w-3.5" />
                          )}
                          Generate Reset Link
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerate(u, true)}
                          disabled={generatingFor !== null}
                        >
                          {generatingFor === u.id + "-send" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          Send to Organizer
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      No accounts found for that email.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {generated && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-3">
          <div className="font-semibold text-foreground">Generated Link — {generated.email}</div>
          <div className="bg-muted rounded-md p-3 text-xs break-all font-mono">{generated.link}</div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={copyLink}>
              <Copy className="h-3.5 w-3.5" /> Copy Link
            </Button>
            <span className="text-xs text-muted-foreground">Expires in: 24 hours · one-time use</span>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2 font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" /> Reset Audit Log
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-semibold">Organizer Email</th>
                <th className="p-3 font-semibold">Generated</th>
                <th className="p-3 font-semibold">Expires</th>
                <th className="p-3 font-semibold">Emailed</th>
              </tr>
            </thead>
            <tbody>
              {log.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="p-3 break-all">{row.target_email}</td>
                  <td className="p-3">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="p-3">{new Date(row.expires_at).toLocaleString()}</td>
                  <td className="p-3">{row.emailed ? "Yes" : "No"}</td>
                </tr>
              ))}
              {log.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    No admin-generated resets yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPasswordResetHelper;
