// deno-lint-ignore-file no-explicit-any
// Public: verify a prospect's email against a demo access token and mint a
// read-only sample-viewer session for the demo tournament's dashboard.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SAMPLE_VIEWER_EMAIL = "sample-viewer@teevents.internal";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const DENIED = "This link has expired or the email is not authorized. Please contact the tournament organizer.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const body = await req.json().catch(() => ({} as any));
    const token = (body?.token || "").trim();
    const identifier = (body?.email || body?.identifier || "").trim().toLowerCase();
    const identifierDigits = identifier.replace(/[^0-9]/g, "");
    if (!/^[0-9a-f-]{36}$/i.test(token) || !identifier) return json(403, { error: DENIED });

    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    const { data: access } = await admin
      .from("demo_access")
      .select("id, tournament_id, prospect_email, prospect_name, expires_at, revoked_at, access_count")
      .eq("access_token", token)
      .maybeSingle();

    if (!access) return json(403, { error: DENIED });
    if (access.revoked_at) return json(403, { error: DENIED });
    if (new Date(access.expires_at) < new Date()) return json(403, { error: DENIED });
    if ((access.prospect_email || "").toLowerCase() !== email) return json(403, { error: DENIED });

    const { data: tournament } = await admin
      .from("tournaments")
      .select("id, title, organization_id")
      .eq("id", access.tournament_id)
      .maybeSingle();
    if (!tournament) return json(403, { error: DENIED });

    // Ensure the shared sample-viewer auth user exists
    const viewerPassword = Deno.env.get("SAMPLE_VIEWER_PASSWORD") ||
      "sample-viewer-shared-password-not-a-secret-2026";
    let viewerId: string | null = null;
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = existing?.users?.find((u: any) => u.email === SAMPLE_VIEWER_EMAIL);
    if (found) {
      viewerId = found.id;
    } else {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: SAMPLE_VIEWER_EMAIL,
        password: viewerPassword,
        email_confirm: true,
        user_metadata: { role: "sample_viewer", display_name: "Sample Viewer" },
      });
      if (cErr || !created?.user) return json(500, { error: cErr?.message || "Failed to create viewer" });
      viewerId = created.user.id;
    }

    // Attach viewer to the org ONLY when that org contains nothing but
    // sample/demo tournaments. Never grant membership on a real org.
    const { data: attached, error: mErr } = await admin.rpc("attach_sample_viewer", {
      _org_id: tournament.organization_id,
      _viewer_id: viewerId,
    });
    if (mErr) return json(500, { error: `Failed to attach viewer: ${mErr.message}` });
    if (attached !== true) return json(403, { error: DENIED });

    const clientForAuth = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { persistSession: false },
    });
    const { data: signIn, error: sErr } = await clientForAuth.auth.signInWithPassword({
      email: SAMPLE_VIEWER_EMAIL,
      password: viewerPassword,
    });
    if (sErr || !signIn?.session) return json(500, { error: sErr?.message || "Failed to mint session" });

    // Track engagement
    await admin
      .from("demo_access")
      .update({
        access_count: (access.access_count || 0) + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq("id", access.id);

    return json(200, {
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
      organization_id: tournament.organization_id,
      tournament_id: tournament.id,
      tournament_title: tournament.title,
      expires_at: access.expires_at,
      prospect_name: access.prospect_name,
    });
  } catch (e) {
    return json(500, { error: (e as Error).message });
  }
});
