import { beforeEach, describe, expect, it, vi } from "vitest";
import { enterpriseApprovalSchema } from "./enterpriseAccounts.schema";

const mocks = vi.hoisted(() => ({ admin: true, owner: true, email: "info@hbcu.golf", verified: true, fail: false, writes: vi.fn(), lookup: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const chain = { middleware: () => chain, inputValidator: () => chain, handler: (fn: unknown) => fn };
  return chain;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { auth: { admin: { getUserById: async () => {
  mocks.lookup();
  return { data: { user: { email: mocks.email, email_confirmed_at: mocks.verified ? "2026-05-03" : null } }, error: null };
} } } } }));
import { approveEnterpriseAccount } from "./enterpriseAccounts.functions";
const input = { organizationId: "4803be76-034d-43b0-b178-2bd415bb6d59", ownerUserId: "2687d4ac-654e-42a9-9aca-036404513b91", email: "info@hbcu.golf" };
function invoke() {
  const query = { eq: () => query, maybeSingle: async () => ({ data: mocks.owner ? { user_id: input.ownerUserId } : null, error: null }) };
  return (approveEnterpriseAccount as unknown as (args: unknown) => Promise<unknown>)({ data: input, context: {
    userId: "admin-user",
    supabase: {
      rpc: async () => ({ data: mocks.admin, error: null }),
      from: (table: string) => ({ select: () => query, upsert: (row: unknown) => {
        mocks.writes(table, row);
        return { select: () => ({ single: async () => ({ data: mocks.fail ? null : row, error: mocks.fail ? {} : null }) }) };
      } }),
    },
  } });
}
describe("Enterprise account approvals", () => {
  beforeEach(() => { mocks.admin = true; mocks.owner = true; mocks.email = input.email; mocks.verified = true; mocks.fail = false; vi.clearAllMocks(); });
  it("normalizes the requested info@hbcu.golf email", () => {
    expect(enterpriseApprovalSchema.parse({ ...input, email: " INFO@HBCU.GOLF " }).email).toBe("info@hbcu.golf");
  });
  it("rejects non-platform-admin approval before owner lookup or writes", async () => {
    mocks.admin = false;
    await expect(invoke()).rejects.toThrow("Platform admin access");
    expect(mocks.lookup).not.toHaveBeenCalled();
    expect(mocks.writes).not.toHaveBeenCalled();
  });
  it("requires ownership of the explicitly selected organization", async () => {
    mocks.owner = false;
    await expect(invoke()).rejects.toThrow("must own this organization");
    expect(mocks.writes).not.toHaveBeenCalled();
  });
  it("requires the actual verified email to match info@hbcu.golf", async () => {
    mocks.email = "different@example.test";
    await expect(invoke()).rejects.toThrow("verified account email");
    expect(mocks.writes).not.toHaveBeenCalled();
  });
  it("does not approve unverified accounts", async () => {
    mocks.verified = false;
    await expect(invoke()).rejects.toThrow("verified account email");
    expect(mocks.writes).not.toHaveBeenCalled();
  });
  it("persists only approval and leaves tournaments and payment settings untouched", async () => {
    await invoke();
    expect(mocks.writes.mock.calls).toEqual([["enterprise_account_approvals", {
      organization_id: input.organizationId, owner_user_id: input.ownerUserId, approved_email: "info@hbcu.golf", approved_by: "admin-user", approved_at: expect.any(String),
    }]]);
  });
  it("does not report approval success if persistence fails", async () => {
    mocks.fail = true;
    await expect(invoke()).rejects.toThrow("Could not save Enterprise approval");
  });
});