import { describe, expect, it, vi, beforeEach } from "vitest";
import { enterpriseRepRequestSchema } from "./enterpriseRepRequest.schema";

const mocks = vi.hoisted(() => ({ member: true, admin: false, writes: vi.fn(), fail: false }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const chain = { middleware: () => chain, inputValidator: () => chain, handler: (fn: unknown) => fn };
  return chain;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: (table: string) => ({
  select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "org" }, error: null }) }) }),
  insert: (row: unknown) => {
    mocks.writes(table, row);
    if (table === "help_tickets") return { select: () => ({ single: async () => ({ data: mocks.fail ? null : { id: "ticket" }, error: mocks.fail ? {} : null }) }) };
    return Promise.resolve({ error: null });
  },
}) } }));
import { submitEnterpriseRepRequest } from "./enterpriseRepRequest.functions";
const input = { organizationId: "00000000-0000-4000-8000-000000000001", eventName: "Club Invitational", date: "", message: "Please help set up registration." };
const invoke = () => (submitEnterpriseRepRequest as unknown as (args: unknown) => Promise<{ ticketId: string }>)({ data: input, context: {
  userId: "user",
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mocks.member ? { user_id: "user" } : null, error: null }) }) }) }) }),
    rpc: async () => ({ data: mocks.admin, error: null }),
    auth: { getUser: async () => ({ data: { user: { id: "user", email: "qa@example.test" } }, error: null }) },
  },
} });
describe("Enterprise rep requests", () => {
  beforeEach(() => { mocks.member = true; mocks.admin = false; mocks.fail = false; vi.clearAllMocks(); });
  it("allows an unknown date", () => { expect(enterpriseRepRequestSchema.parse(input).date).toBe(""); });
  it("rejects invalid calendar dates", () => { expect(enterpriseRepRequestSchema.safeParse({ ...input, date: "2026-02-30" }).success).toBe(false); });
  it("rejects empty event names and messages", () => {
    expect(enterpriseRepRequestSchema.safeParse({ ...input, eventName: " " }).success).toBe(false);
    expect(enterpriseRepRequestSchema.safeParse({ ...input, message: " " }).success).toBe(false);
  });
  it("writes only a support ticket and conversation, never an event or setting", async () => {
    expect(await invoke()).toEqual({ ticketId: "ticket" });
    expect(mocks.writes.mock.calls.map(([table]) => table)).toEqual(["help_tickets", "help_chat_messages"]);
    expect(mocks.writes).toHaveBeenCalledWith("help_tickets", expect.objectContaining({ organization_id: input.organizationId, user_id: "user", status: "open" }));
  });
  it("rejects a nonmember before any write", async () => {
    mocks.member = false;
    await expect(invoke()).rejects.toThrow("Organization access is required");
    expect(mocks.writes).not.toHaveBeenCalled();
  });
  it("allows a verified platform admin in the selected workspace", async () => {
    mocks.member = false; mocks.admin = true;
    expect((await invoke()).ticketId).toBe("ticket");
  });
  it("does not report success when ticket persistence fails", async () => {
    mocks.fail = true;
    await expect(invoke()).rejects.toThrow("Could not submit");
    expect(mocks.writes).toHaveBeenCalledTimes(1);
  });
});