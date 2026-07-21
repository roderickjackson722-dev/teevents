// Unified signup: creates auth user, stores vetting answers, emails a magic
// password-setup link. No password required at signup time — user sets one
// after clicking the emailed link.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendAndLog } from "../_shared/emailLogger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const {
      email,
      full_name,
      phone,
      organization_name,
      interest_area, // 'tournament' | 'league'
      heard_from,
      heard_from_other,
      primary_goal,
      origin,
    } = body;

    if (!email || !full_name || !interest_area) {
      throw new Error("Missing required fields");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const normalizedEmail = String(email).trim().toLowerCase();

    // Create user (or reuse existing). email_confirm=true so recovery link works.
    const tempPassword = crypto.randomUUID() + "Aa1!";
    let userId: string | null = null;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: String(full_name).trim(), phone: phone || null },
    });
    if (createErr) {
      // Likely already exists — look them up
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list?.users?.find((u: any) => (u.email || "").toLowerCase() === normalizedEmail);
      if (!found) throw createErr;
      userId = found.id;
    } else {
      userId = created.user?.id ?? null;
    }
    if (!userId) throw new Error("Could not resolve user id");

    // Persist vetting (best-effort; ignore duplicate errors)
    await supabaseAdmin.from("signup_vetting").insert({
      user_id: userId,
      email: normalizedEmail,
      full_name: String(full_name).trim(),
      phone: phone || null,
      interest_area,
      organization_name: organization_name || null,
      heard_from: heard_from || null,
      heard_from_other: heard_from_other || null,
      primary_goal: primary_goal || null,
      vetting_status: "approved",
    });

    // Generate recovery link → email
    const siteOrigin = origin || req.headers.get("origin") || "https://www.teevents.golf";
    const redirectTo = `${siteOrigin}/reset-password?new=1&type=${encodeURIComponent(interest_area)}`;
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: { redirectTo },
    });
    if (linkErr) throw linkErr;
    const actionLink = linkData?.properties?.action_link;
    if (!actionLink) throw new Error("Failed to generate action link");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      const firstName = String(full_name).trim().split(/\s+/)[0] || "there";
      const label = interest_area === "league" ? "League" : "Tournament";
      const html = `
        <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; padding:24px; color:#111827;">
          <div style="text-align:center; margin-bottom:24px;">
            <h1 style="color:#1a5c38; margin:0;">Welcome to TeeVents</h1>
          </div>
          <p style="font-size:16px;">Hi ${firstName},</p>
          <p style="font-size:16px;">Welcome to TeeVents! You're almost ready to start managing your ${label}.</p>
          <p style="font-size:16px;">Click the button below to set your password and access your dashboard:</p>
          <div style="text-align:center; margin:28px 0;">
            <a href="${actionLink}" style="background:#F5A623; color:#1a5c38; padding:14px 28px; border-radius:8px; font-weight:bold; text-decoration:none; display:inline-block;">
              Set My Password &amp; Log In
            </a>
          </div>
          <p style="font-size:14px; color:#6b7280;">This link expires in 24 hours. If the button doesn't work, copy and paste this URL into your browser:</p>
          <p style="font-size:12px; color:#6b7280; word-break:break-all;">${actionLink}</p>
          <p style="font-size:16px; margin-top:24px;">Once logged in, you can:</p>
          <ul style="font-size:15px; color:#111827;">
            <li>Set up your first ${label.toLowerCase()}</li>
            <li>Invite team members</li>
            <li>Connect your Stripe account for payouts</li>
          </ul>
          <p style="font-size:16px;">If you have any questions, just reply to this email.</p>
          <p style="font-size:16px; margin-top:24px;">Best,<br/>Rod Jackson<br/><span style="color:#6b7280;">TeeVents Golf Management</span></p>
        </div>`;

      await sendAndLog(
        supabaseAdmin,
        RESEND_API_KEY,
        {
          from: "TeeVents Golf Management <info@notifications.teevents.golf>",
          to: [normalizedEmail],
          subject: "Welcome to TeeVents — Complete Your Registration",
          html,
          reply_to: "info@teevents.golf",
        },
        {
          templateName: "signup-welcome-set-password",
          source: "signup-with-vetting",
          metadata: { interest_area, full_name },
        },
      );
    }

    // Fire admin notification (non-blocking)
    supabaseAdmin.functions.invoke("notify-new-signup", {
      body: {
        email: normalizedEmail,
        full_name,
        phone,
        planning_status: null,
        roles: [],
        role_other: null,
        heard_from,
        heard_from_other,
        vetting_status: "approved",
      },
    }).catch(() => {});

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    console.error("[signup-with-vetting]", e?.message || e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
