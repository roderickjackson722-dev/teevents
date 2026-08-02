// deno-lint-ignore-file no-explicit-any
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const body = await req.json().catch(() => ({} as any));
    const token = (body?.token || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(token)) return json(400, { error: "Invalid token" });

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // 1. Resolve sample token -> tournament + org
    const { data: tournament, error: tErr } = await admin
      .from("tournaments")
      .select("id, organization_id, title, is_sample")
      .eq("sample_token", token)
      .maybeSingle();
    if (tErr) return json(500, { error: tErr.message });
    if (!tournament || !tournament.is_sample) {
      return json(404, { error: "This sample link is no longer active." });
    }

    // 2. Ensure the shared sample-viewer auth user exists
    let viewerId: string | null = null;
    const viewerPassword = Deno.env.get("SAMPLE_VIEWER_PASSWORD") ||
      "sample-viewer-shared-password-not-a-secret-2026";

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

    // 3. Attach viewer to the org ONLY when that org contains nothing but
    //    sample/demo tournaments. Never grant membership on a real org.
    const { data: attached, error: mErr } = await admin.rpc("attach_sample_viewer", {
      _org_id: tournament.organization_id,
      _viewer_id: viewerId,
    });
    if (mErr) return json(500, { error: `Failed to attach viewer: ${mErr.message}` });
    if (attached !== true) {
      return json(403, { error: "This sample link is no longer available." });
    }

    // 4. Sign in the viewer to mint access + refresh tokens
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const clientForAuth = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: signIn, error: sErr } = await clientForAuth.auth.signInWithPassword({
      email: SAMPLE_VIEWER_EMAIL,
      password: viewerPassword,
    });
    if (sErr || !signIn?.session) {
      return json(500, { error: sErr?.message || "Failed to mint session" });
    }

    // 5. Bump view count (non-blocking for dashboard access)
    const { error: bumpErr } = await admin.rpc("bump_sample_view", { _token: token });
    if (bumpErr) console.warn("bump_sample_view failed", bumpErr.message);

    return json(200, {
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
      organization_id: tournament.organization_id,
      tournament_id: tournament.id,
      tournament_title: tournament.title,
    });
  } catch (e) {
    return json(500, { error: (e as Error).message });
  }
});
