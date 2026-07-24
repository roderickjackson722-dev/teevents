import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.split(" ")[1]?.trim();
    if (!token) return json({ error: "Unauthorized" }, 401);

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const transactionId: string | undefined = body?.transaction_id;
    if (!transactionId || typeof transactionId !== "string") {
      return json({ error: "transaction_id is required" }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tx, error: txErr } = await supabaseAdmin
      .from("platform_transactions")
      .select("id, organization_id, tournament_id, type, metadata")
      .eq("id", transactionId)
      .maybeSingle() as any;
    if (txErr || !tx) return json({ error: "Transaction not found" }, 404);

    // Authorize: user must be an admin OR an org member for the transaction's organization
    const [{ data: isAdmin }, { data: memberRow }] = await Promise.all([
      supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabaseAdmin
        .from("org_members")
        .select("id")
        .eq("organization_id", tx.organization_id)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    if (!isAdmin && !memberRow) return json({ error: "Forbidden" }, 403);

    // Best-effort: if this tx is tied to a sponsor registration, remove that too so
    // the sponsors list and revenue totals stay in sync.
    const sponsorRegId = tx?.metadata?.sponsor_registration_id;
    if (tx.type === "sponsorship" && sponsorRegId) {
      await supabaseAdmin
        .from("sponsor_registrations")
        .delete()
        .eq("id", sponsorRegId)
        .eq("tournament_id", tx.tournament_id);
    }

    const { error: delErr } = await supabaseAdmin
      .from("platform_transactions")
      .delete()
      .eq("id", transactionId);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ success: true });
  } catch (err) {
    console.error("[delete-organizer-transaction] error:", err);
    return json({ error: (err as Error).message || "Unknown error" }, 500);
  }
});
