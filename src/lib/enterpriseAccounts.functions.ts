import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertEnterpriseApprovalOwner, enterpriseApprovalSchema } from "./enterpriseAccounts.schema";

export const listEnterpriseAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !isAdmin) throw new Error("Platform admin access is required.");
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    // Page each collection: accounts with no events must remain selectable.
    async function readAll<T>(read: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
      const rows: T[] = [];
      for (let start = 0; ; start += 1000) {
        const result = await read(start, start + 999);
        if (result.error) throw new Error("Could not load Enterprise accounts.");
        rows.push(...(result.data || []));
        if ((result.data?.length || 0) < 1000) return rows;
      }
    }
    const [organizations, owners, tournaments, approvals] = await Promise.all([
      readAll((start, end) => admin.from("organizations").select("id,name,plan,pricing_model,enterprise_subscription_status,created_at").order("id").range(start, end)),
      readAll((start, end) => admin.from("org_members").select("organization_id,user_id,name").eq("role", "owner").order("id").range(start, end)),
      readAll((start, end) => admin.from("tournaments").select("id,title,date,status,organization_id,is_enterprise").order("id").range(start, end)),
      readAll((start, end) => admin.from("enterprise_account_approvals").select("*").order("organization_id").range(start, end)),
    ]);
    const users = new Map<string, { email: string; verified: boolean }>();
    const ownerIds = new Set(owners.map((owner) => owner.user_id));
    for (let page = 1; ; page++) {
      const { data, error: userError } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (userError) throw new Error("Could not load account emails.");
      for (const user of data.users) {
        if (ownerIds.has(user.id)) users.set(user.id, { email: user.email || "", verified: !!user.email_confirmed_at });
      }
      if (data.users.length < 1000) break;
    }
    return organizations.map((org) => ({
      ...org,
      approval: approvals.find((approval) => approval.organization_id === org.id) || null,
      owners: owners.filter((owner) => owner.organization_id === org.id).map((owner) => ({ ...owner, ...users.get(owner.user_id) })),
      tournaments: tournaments.filter((event) => event.organization_id === org.id),
    })).sort((a, b) => a.name.localeCompare(b.name));
  });

export const approveEnterpriseAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => enterpriseApprovalSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !isAdmin) throw new Error("Platform admin access is required.");
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: owner, error: ownerError } = await admin.from("org_members")
      .select("user_id").eq("organization_id", data.organizationId).eq("user_id", data.ownerUserId).eq("role", "owner").maybeSingle();
    if (ownerError || !owner) throw new Error("The selected account must own this organization.");
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(data.ownerUserId);
    if (userError) throw new Error("Could not verify the account email.");
    assertEnterpriseApprovalOwner(data.email, userData.user);
    // Access only. Never update organization pricing, subscriptions or tournaments.
    const { data: approval, error } = await context.supabase.from("enterprise_account_approvals").upsert({
      organization_id: data.organizationId,
      owner_user_id: data.ownerUserId,
      approved_email: data.email,
      approved_by: context.userId,
      approved_at: new Date().toISOString(),
    }, { onConflict: "organization_id" }).select("*").single();
    if (error || !approval) throw new Error("Could not save Enterprise approval.");
    return approval;
  });