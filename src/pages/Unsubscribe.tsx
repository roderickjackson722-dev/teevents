import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const initial = params.get("e") || "";
  const token = params.get("t") || params.get("token") || "";
  const [email, setEmail] = useState(initial);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  useEffect(() => {
    if (initial || token) submit(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: string) => {
    if (!e && !token) return;
    setStatus("loading");
    // Newsletter list (token-based) and outreach list are separate — clear both.
    try {
      if (token || e) {
        await fetch("/api/public/newsletter-unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token || undefined, email: e || undefined }),
        });
      }
    } catch (_) { /* ignore */ }
    try {
      if (e) {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/outreach-unsubscribe?e=${encodeURIComponent(e)}`;
        await fetch(url);
      }
    } catch (_) { /* ignore */ }
    setStatus("done");
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-md text-center">
        <h1 className="text-2xl font-bold mb-3">Unsubscribe from TeeVents emails</h1>
        {status === "done" ? (
          <p className="text-muted-foreground">You've been unsubscribed. You won't receive further outreach emails from us.</p>
        ) : (
          <>
            <p className="text-muted-foreground mb-4">Confirm your email to stop receiving outreach messages.</p>
            <input
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="you@example.com"
              className="w-full border rounded px-3 py-2 mb-3"
            />
            <Button onClick={() => submit(email)} disabled={status === "loading" || !email}>
              {status === "loading" ? "Working…" : "Unsubscribe me"}
            </Button>
          </>
        )}
      </div>
    </Layout>
  );
}
