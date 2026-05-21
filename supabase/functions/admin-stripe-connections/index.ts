import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) throw new Error("Unauthorized");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabaseClient.auth.getUser();
    if (!userData.user) throw new Error("Unauthorized");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const sendDigest = !!body.send_digest;

    // Pull every org and join payout methods + tournaments
    const { data: orgs } = await supabaseAdmin
      .from("organizations")
      .select("id, name, created_at, stripe_account_id")
      .order("name");

    const { data: payouts } = await supabaseAdmin
      .from("organization_payout_methods")
      .select("organization_id, stripe_account_id, stripe_account_status, stripe_onboarding_complete, is_verified, stripe_account_last4, stripe_account_brand, connection_notified_at, updated_at");

    const { data: tournaments } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, slug, organization_id, site_published, date");

    const payoutMap = new Map<string, any>();
    for (const p of payouts || []) payoutMap.set(p.organization_id, p);

    const tournamentMap = new Map<string, any[]>();
    for (const t of tournaments || []) {
      const arr = tournamentMap.get(t.organization_id) || [];
      arr.push(t);
      tournamentMap.set(t.organization_id, arr);
    }

    const rows = (orgs || []).map((o: any) => {
      const p = payoutMap.get(o.id);
      const stripeId = p?.stripe_account_id || o.stripe_account_id || null;
      return {
        organization_id: o.id,
        organization_name: o.name,
        created_at: o.created_at,
        stripe_account_id: stripeId,
        connected: !!stripeId,
        onboarding_complete: !!p?.stripe_onboarding_complete,
        charges_enabled: p?.stripe_account_status === "active",
        payouts_enabled: !!p?.is_verified,
        bank_last4: p?.stripe_account_last4 || null,
        bank_brand: p?.stripe_account_brand || null,
        connection_notified_at: p?.connection_notified_at || null,
        tournaments: (tournamentMap.get(o.id) || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          slug: t.slug,
          published: !!t.site_published,
          date: t.date,
        })),
      };
    });

    const total = rows.length;
    const connected = rows.filter((r) => r.connected).length;
    const fullyActive = rows.filter((r) => r.charges_enabled && r.payouts_enabled).length;
    const notConnected = total - connected;

    if (sendDigest) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const connectedRows = rows.filter((r) => r.connected);
        const missingRows = rows.filter((r) => !r.connected);

        const connectedHtml = connectedRows.map((r) => {
          const ts = (r.tournaments || []).map((t: any) => t.title).join(", ") || "—";
          return `<tr><td style="padding:6px;border-bottom:1px solid #eee;">${r.organization_name}</td><td style="padding:6px;border-bottom:1px solid #eee;font-family:monospace;font-size:11px;">${r.stripe_account_id || ""}</td><td style="padding:6px;border-bottom:1px solid #eee;">${r.charges_enabled ? "✅ Active" : "⚠️ Pending"}</td><td style="padding:6px;border-bottom:1px solid #eee;font-size:12px;">${ts}</td></tr>`;
        }).join("");

        const missingHtml = missingRows.map((r) => {
          const ts = (r.tournaments || []).map((t: any) => t.title + (t.published ? " (published)" : "")).join(", ") || "—";
          return `<tr><td style="padding:6px;border-bottom:1px solid #eee;">${r.organization_name}</td><td style="padding:6px;border-bottom:1px solid #eee;font-size:12px;">${ts}</td></tr>`;
        }).join("");

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "TeeVents Golf Management <info@notifications.teevents.golf>",
            to: ["info@teevents.golf"],
            reply_to: "info@teevents.golf",
            subject: `📊 Stripe Connect Backfill — ${connected}/${total} organizations connected`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:720px;margin:auto;padding:24px;">
                <h2 style="color:#1a5c38;">Stripe Connect Status Backfill</h2>
                <p>Snapshot of all organizations and their Stripe connection status.</p>
                <div style="display:flex;gap:12px;margin:16px 0;">
                  <div style="flex:1;background:#f3f4f6;padding:12px;border-radius:6px;text-align:center;"><div style="font-size:24px;font-weight:bold;color:#1a5c38;">${total}</div><div style="font-size:12px;color:#666;">Total Orgs</div></div>
                  <div style="flex:1;background:#dcfce7;padding:12px;border-radius:6px;text-align:center;"><div style="font-size:24px;font-weight:bold;color:#15803d;">${connected}</div><div style="font-size:12px;color:#666;">Connected</div></div>
                  <div style="flex:1;background:#fef3c7;padding:12px;border-radius:6px;text-align:center;"><div style="font-size:24px;font-weight:bold;color:#a16207;">${fullyActive}</div><div style="font-size:12px;color:#666;">Fully Active</div></div>
                  <div style="flex:1;background:#fee2e2;padding:12px;border-radius:6px;text-align:center;"><div style="font-size:24px;font-weight:bold;color:#b91c1c;">${notConnected}</div><div style="font-size:12px;color:#666;">Not Connected</div></div>
                </div>
                <h3 style="color:#1a5c38;">✅ Connected (${connectedRows.length})</h3>
                <table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f9fafb;"><th style="padding:6px;text-align:left;">Organization</th><th style="padding:6px;text-align:left;">Stripe ID</th><th style="padding:6px;text-align:left;">Status</th><th style="padding:6px;text-align:left;">Tournaments</th></tr></thead><tbody>${connectedHtml || '<tr><td colspan="4" style="padding:12px;color:#999;text-align:center;">None</td></tr>'}</tbody></table>
                <h3 style="color:#b91c1c;margin-top:24px;">⚠️ Not Connected (${missingRows.length})</h3>
                <table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f9fafb;"><th style="padding:6px;text-align:left;">Organization</th><th style="padding:6px;text-align:left;">Tournaments</th></tr></thead><tbody>${missingHtml || '<tr><td colspan="2" style="padding:12px;color:#999;text-align:center;">None</td></tr>'}</tbody></table>
                <p style="margin-top:24px;"><a href="https://teevents.golf/admin/stripe-connections" style="background:#F5A623;color:#1a5c38;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold;">Open Dashboard</a></p>
              </div>
            `,
          }),
        });
      }
    }

    return new Response(
      JSON.stringify({ rows, stats: { total, connected, fullyActive, notConnected } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("admin-stripe-connections error:", message);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status,
    });
  }
});
