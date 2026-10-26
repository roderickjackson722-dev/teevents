import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enterpriseRepRequestSchema, repRequestQuestion } from "./enterpriseRepRequest.schema";

export const submitEnterpriseRepRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => enterpriseRepRequestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const [{ data: member, error: memberError }, { data: isAdmin, error: roleError }] = await Promise.all([
      context.supabase.from("org_members").select("user_id").eq("organization_id", data.organizationId).eq("user_id", context.userId).maybeSingle(),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    ]);
    if (memberError || roleError || (!member && !isAdmin)) throw new Error("Organization access is required.");
    // Tickets are server-written in the existing support system. Never touch events or settings.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: organization, error: orgError } = await supabaseAdmin.from("organizations").select("id").eq("id", data.organizationId).maybeSingle();
    if (orgError || !organization) throw new Error("Organization not found.");
    const { data: userData, error: userError } = await context.supabase.auth.getUser();
    if (userError || userData.user?.id !== context.userId) throw new Error("Please sign in again.");
    const { data: ticket, error } = await supabaseAdmin.from("help_tickets").insert({
      user_id: context.userId,
      user_email: userData.user.email ?? null,
      organization_id: data.organizationId,
      question: repRequestQuestion(data),
      status: "open",
    }).select("id").single();
    if (error || !ticket) throw new Error("Could not submit your request. Please try again.");
    return { ticketId: ticket.id };
  });