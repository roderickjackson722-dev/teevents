import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveInviteOwner, stripeConnectInviteContent } from "./stripeConnectInvite.shared";

const inputSchema = z.object({ tournamentId: z.string().uuid() });
const templateName = "admin-stripe-connect-invite";

export const getStripeConnectInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: tournament, error } = await admin.from("tournaments").select("organization_id").eq("id", data.tournamentId).single();
    if (error || !tournament?.organization_id) throw new Error("Tournament organizer not found.");
    const [{ data: payout }, { data: logs, error: logError }, { data: owners, error: ownerError }] = await Promise.all([
      admin.from("organization_payout_methods").select("stripe_account_id, stripe_onboarding_complete").eq("organization_id", tournament.organization_id).maybeSingle(),
      admin.from("email_send_log").select("created_at").eq("tournament_id", data.tournamentId).eq("template_name", templateName).eq("status", "sent").order("created_at", { ascending: false }).limit(1),
      admin.from("org_members").select("user_id, name").eq("organization_id", tournament.organization_id).eq("role", "owner"),
    ]);
    if (logError || ownerError) throw new Error("Could not read organizer invite status.");
    const owner = owners?.length === 1 ? owners[0] : undefined;
    const recipient = owner ? (await admin.auth.admin.getUserById(owner.user_id)).data.user?.email : null;
    return { connected: !!payout?.stripe_account_id && payout.stripe_onboarding_complete === true, sentAt: logs?.[0]?.created_at ?? null, recipient: recipient ?? null };
  });

export const sendStripeConnectInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: tournament, error: tournamentError } = await admin.from("tournaments").select("title, organization_id").eq("id", data.tournamentId).single();
    if (tournamentError || !tournament?.organization_id) throw new Error("Tournament organizer not found.");
    const { data: payout, error: payoutError } = await admin.from("organization_payout_methods").select("stripe_account_id").eq("organization_id", tournament.organization_id).maybeSingle();
    if (payoutError) throw new Error("Could not verify Stripe connection status.");
    // Never invite/re-prompt an already linked account, including incomplete onboarding.
    if (payout?.stripe_account_id) throw new Error("This organizer already has a linked Stripe account. No invite was sent.");
    const { data: organization } = await admin.from("organizations").select("stripe_account_id").eq("id", tournament.organization_id).single();
    if (organization?.stripe_account_id) throw new Error("This organizer already has a linked Stripe account. No invite was sent.");
    const { data: owners, error: ownerError } = await admin.from("org_members").select("user_id, name").eq("organization_id", tournament.organization_id).eq("role", "owner");
    if (ownerError) throw new Error("Could not read organizer on file.");
    const owner = resolveInviteOwner(owners || []);
    if (!owner) throw new Error("Organizer not found.");
    const { data: ownerData, error: userError } = await admin.auth.admin.getUserById(owner.user_id);
    const email = ownerData.user?.email;
    if (userError || !email || !ownerData.user?.email_confirmed_at) throw new Error("Organizer on file must have a verified email address.");
    const key = process.env["RESEND_API_KEY"];
    if (!key) throw new Error("Email sending is not configured.");
    const firstName = (owner.name || ownerData.user.user_metadata?.full_name || ownerData.user.user_metadata?.name || "Organizer").trim().split(/\s+/)[0];
    const content = stripeConnectInviteContent(tournament.title, firstName, "https://www.teevents.golf/get-started?mode=signin");
    const messageId = crypto.randomUUID();
    const { data: pending, error: pendingError } = await admin.from("email_send_log").insert({ message_id: messageId, template_name: templateName, recipient_email: email, subject: content.subject, status: "pending", source: "admin-stripe-connect-invite", tournament_id: data.tournamentId, organization_id: tournament.organization_id, triggered_by: context.userId }).select("id").single();
    if (pendingError || !pending) throw new Error("Could not record invite. No email was sent.");
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": messageId },
        body: JSON.stringify({ from: "TeeVents Golf Management <info@notifications.teevents.golf>", to: [email], reply_to: "info@teevents.golf", ...content }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        const body = await response.text();
        console.error(`Stripe invite email failed [${response.status}]: ${body}`);
        throw new Error(`Email provider failed [${response.status}]: ${body}`);
      }
      const result = await response.json() as { id?: string };
      const sentAt = new Date().toISOString();
      const { error: saveError } = await admin.from("email_send_log").update({ status: "sent", resend_id: result.id ?? null, created_at: sentAt }).eq("id", pending.id);
      if (saveError) throw new Error("Email accepted, but invite status could not be saved. Do not resend until status is checked.");
      return { sentAt };
    } catch (error) {
      await admin.from("email_send_log").update({ status: "failed", error_message: error instanceof Error ? error.message : "Email failed" }).eq("id", pending.id);
      throw error;
    }
  });