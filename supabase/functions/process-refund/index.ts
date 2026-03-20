import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Authenticate the calling user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    ).auth.getUser(token);
    if (!user) throw new Error("Not authenticated");

    const body = await req.json();
    const { refund_request_id, registration_id, admin_notes } = body;

    let targetRegistrationId: string;
    let requestId: string | null = null;

    if (refund_request_id) {
      // Processing a refund request
      requestId = refund_request_id;
      const { data: request, error: reqErr } = await supabaseAdmin
        .from("tournament_refund_requests")
        .select("*, tournament_registrations(tournament_id)")
        .eq("id", refund_request_id)
        .single() as any;
      if (reqErr || !request) throw new Error("Refund request not found");
      if (request.status !== "pending") throw new Error("Request already processed");
      targetRegistrationId = request.registration_id;
    } else if (registration_id) {
      // Direct refund from dashboard
      targetRegistrationId = registration_id;
    } else {
      throw new Error("Missing refund_request_id or registration_id");
    }

    // Get registration details
    const { data: registration, error: regErr } = await supabaseAdmin
      .from("tournament_registrations")
      .select("id, tournament_id, email, first_name, last_name, payment_status")
      .eq("id", targetRegistrationId)
      .single();
    if (regErr || !registration) throw new Error("Registration not found");

    // Get tournament + org info
    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, organization_id, registration_fee_cents")
      .eq("id", registration.tournament_id)
      .single();
    if (!tournament) throw new Error("Tournament not found");

    // Verify user is an org member or admin
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: isMember } = await supabaseAdmin.rpc("is_org_member", { _user_id: user.id, _org_id: tournament.organization_id });
    if (!isAdmin && !isMember) throw new Error("Not authorized");

    // Get connected Stripe account
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("stripe_account_id")
      .eq("id", tournament.organization_id)
      .single();

    // Find the Stripe payment for this registration
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Search for the checkout session with this registration
    let refundId: string | null = null;
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
    });

    let targetSession: any = null;
    for (const session of sessions.data) {
      if (
        session.metadata?.type === "registration" &&
        session.metadata?.registration_ids?.includes(targetRegistrationId) &&
        session.payment_status === "paid"
      ) {
        targetSession = session;
        break;
      }
    }

    if (targetSession && targetSession.payment_intent) {
      // Process the Stripe refund
      const refundParams: any = {
        payment_intent: targetSession.payment_intent as string,
      };

      // If connected account, refund on their behalf
      if (org?.stripe_account_id) {
        refundParams.refund_application_fee = false;
        refundParams.reverse_transfer = true;
      }

      const refund = await stripe.refunds.create(refundParams);
      refundId = refund.id;
      console.log(`[Refund] Processed refund ${refund.id} for registration ${targetRegistrationId}`);
    } else {
      console.log(`[Refund] No Stripe session found for registration ${targetRegistrationId} — marking as refunded without Stripe`);
    }

    // Update the registration payment status
    await supabaseAdmin
      .from("tournament_registrations")
      .update({ payment_status: "refunded" })
      .eq("id", targetRegistrationId);

    // Update the refund request if one exists
    if (requestId) {
      await supabaseAdmin
        .from("tournament_refund_requests")
        .update({
          status: "approved",
          stripe_refund_id: refundId,
          admin_notes: admin_notes || null,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq("id", requestId);
    }

    return new Response(
      JSON.stringify({ success: true, refund_id: refundId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("[Refund Error]", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
