import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Team member login support.
 *
 * - generateTeamLoginCode: org owner / platform admin mints a 6-character code
 *   for a team member (stored on org_members.login_code).
 * - redeemTeamLoginCode: public. Exchanges a valid code for a one-time auth
 *   token hash the browser verifies to create a real Supabase session.
 * - adminImpersonateTeamMember: platform admin only. Same exchange for any
 *   team member so admins can test that member's access.
 */

type CodeResult = { code: string; expires_at: string | null };

async function assertCanManage(supabase: any, userId: string, orgId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (isAdmin === true) return;
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (membership?.role !== "owner") throw new Error("Only the organization owner can manage login codes");
}

export const generateTeamLoginCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { memberId: string; orgId: string; expiresInDays?: number }) => input)
  .handler(async ({ data, context }: any): Promise<CodeResult> => {
    const ctx = context as any;
    await assertCanManage(ctx.supabase, ctx.userId, data.orgId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: member, error: memberError } = await supabaseAdmin
      .from("org_members")
      .select("id, organization_id")
      .eq("id", data.memberId)
      .maybeSingle();
    if (memberError) throw new Error(memberError.message);
    if (!member || member.organization_id !== data.orgId) throw new Error("Team member not found");

    const { data: code, error: codeError } = await supabaseAdmin.rpc("generate_team_login_code");
    if (codeError) throw new Error(codeError.message);

    const days = data.expiresInDays ?? 90;
    const expiresAt = new Date(Date.now() + days * 86400000).toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("org_members")
      .update({ login_code: code as string, login_code_expires_at: expiresAt })
      .eq("id", data.memberId);
    if (updateError) throw new Error(updateError.message);

    return { code: code as string, expires_at: expiresAt };
  });

export const revokeTeamLoginCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { memberId: string; orgId: string }) => input)
  .handler(async ({ data, context }: any) => {
    const ctx = context as any;
    await assertCanManage(ctx.supabase, ctx.userId, data.orgId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("org_members")
      .update({ login_code: null, login_code_expires_at: null })
      .eq("id", data.memberId)
      .eq("organization_id", data.orgId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

type SessionTokenResult = { token_hash: string; email: string };

async function issueSessionToken(supabaseAdmin: any, userId: string): Promise<SessionTokenResult> {
  const { data: userRes, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (userError || !userRes?.user?.email) throw new Error("That team member has no login account yet");
  const email = userRes.user.email as string;

  const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError || !link?.properties?.hashed_token) {
    throw new Error(linkError?.message || "Could not create a login session");
  }
  return { token_hash: link.properties.hashed_token as string, email };
}

export const redeemTeamLoginCode = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data }): Promise<SessionTokenResult> => {
    const code = (data.code || "").trim().toUpperCase();
    if (code.length !== 6) throw new Error("Enter your 6-character login code");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: member, error } = await supabaseAdmin
      .from("org_members")
      .select("user_id, login_code_expires_at")
      .eq("login_code", code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!member) throw new Error("That login code was not recognized");
    if (member.login_code_expires_at && new Date(member.login_code_expires_at) < new Date()) {
      throw new Error("That login code has expired — ask your organizer for a new one");
    }
    return await issueSessionToken(supabaseAdmin, member.user_id as string);
  });

export const adminImpersonateTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { memberId: string }) => input)
  .handler(async ({ data, context }: any): Promise<SessionTokenResult> => {
    const ctx = context as any;
    const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
      _user_id: ctx.userId,
      _role: "admin",
    });
    if (isAdmin !== true) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: member, error } = await supabaseAdmin
      .from("org_members")
      .select("user_id")
      .eq("id", data.memberId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!member) throw new Error("Team member not found");
    return await issueSessionToken(supabaseAdmin, member.user_id as string);
  });
