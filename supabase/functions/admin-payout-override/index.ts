// Admin-only: bypass email confirmation and force a payout-method change
// for any organization. Logs to admin_payout_overrides + payout_audit_log
// and notifies the organizer by email.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) throw new Error("Not authenticated");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userRes } = await supabase.auth.getUser(token);
    const adminUser = userRes.user;
    if (!adminUser) throw new Error("Not authenticated");

    // Verify admin role
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Admin access required");

    const body = await req.json();
    const {
      organization_id,
      new_method, // "stripe" | "paypal" | "check"
      paypal_email,
      mailing_address,
      reason,
    } = body;

    if (!organization_id || !new_method || !reason || !reason.trim()) {
      throw new Error("organization_id, new_method, and reason are required");
    }

    const { data: pm } = await admin
      .from("organization_payout_methods")
      .select("preferred_method")
      .eq("organization_id", organization_id)
      .maybeSingle();
    const { data: org } = await admin
      .from("organizations")
      .select("name, payout_method")
      .eq("id", organization_id)
      .single();
    const oldMethod = pm?.preferred_method || org?.payout_method || "none";

    // Apply change
    const pmUpdates: Record<string, unknown> = { preferred_method: new_method };
    if (new_method === "paypal" && paypal_email) pmUpdates.paypal_email = paypal_email;
    if (new_method === "stripe") {
      // Don't auto-clear stripe id; admin override of method just sets preferred
    }
    await admin
      .from("organization_payout_methods")
      .upsert({ organization_id, ...pmUpdates } as any, { onConflict: "organization_id" });

    const orgUpdates: Record<string, unknown> = { payout_method: new_method };
    if (new_method === "check" && mailing_address) orgUpdates.mailing_address = mailing_address;
    await admin.from("organizations").update(orgUpdates as any).eq("id", organization_id);

    // Log override
    await admin.from("admin_payout_overrides").insert({
      admin_id: adminUser.id,
      organization_id,
      old_method: oldMethod,
      new_method,
      paypal_email: paypal_email || null,
      mailing_address: mailing_address || null,
      reason: reason.trim(),
    } as any);

    await admin.from("payout_audit_log").insert({
      organization_id,
      user_id: adminUser.id,
      action: "admin_payout_override",
      details: {
        summary: `Admin override: ${oldMethod} → ${new_method}`,
        reason: reason.trim(),
        new_method,
      },
    } as any);

    // Notify organizer (best-effort)
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      try {
        const { data: members } = await admin
          .from("org_members")
          .select("user_id")
          .eq("organization_id", organization_id)
          .eq("role", "owner");

        const ownerEmails: string[] = [];
        for (const m of members || []) {
          const { data: u } = await admin.auth.admin.getUserById(m.user_id);
          if (u?.user?.email) ownerEmails.push(u.user.email);
        }

        if (ownerEmails.length > 0) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "TeeVents Golf Management <notifications@teevents.golf>",
              to: ownerEmails,
              subject: `Your payout method was changed by an administrator`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
                  <h2 style="color:#1a5c38;margin:0 0 12px">Payout method updated</h2>
                  <p>An administrator updated the payout method on your TeeVents account <strong>${org?.name || ""}</strong>.</p>
                  <p><strong>Previous:</strong> ${oldMethod}<br/>
                     <strong>New:</strong> ${new_method}</p>
                  <p>If this change was not expected, please contact us immediately at
                    <a href="mailto:info@teevents.golf">info@teevents.golf</a>.</p>
                  <p style="font-size:12px;color:#999">— The TeeVents Team</p>
                </div>
              `,
            }),
          });
        }
      } catch (e) {
        console.error("Notify error:", e);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
