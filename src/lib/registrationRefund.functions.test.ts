import { beforeEach, describe, expect, it, vi } from "vitest";
import { refundAmounts } from "./refundAmounts";

const mocks = vi.hoisted(() => ({ prepare: vi.fn(), create: vi.fn(), insert: vi.fn(), update: vi.fn(), remove: vi.fn(), lockError: null as unknown }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const chain: any = { middleware: () => chain, inputValidator: () => chain, handler: (fn: any) => fn };
  return chain;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("./registrationRefund.server", () => ({ prepareRefund: mocks.prepare }));
import { confirmRegistrationRefund } from "./registrationRefund.functions";

describe("confirmed Stripe registration refunds", () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.lockError = null;
    const quote = { ...refundAmounts(15000, 0, 750, 465), registrationId: "registration", paymentIntentId: "pi_original", chargeId: "ch_original" };
    const admin = { from: (table: string) => ({
      insert: async (data: unknown) => { mocks.insert(table, data); return { error: table === "refund_processing_locks" ? mocks.lockError : null }; },
      update: (data: unknown) => { mocks.update(table, data); return { eq: async () => ({ error: null }) }; },
      delete: () => { mocks.remove(table); return { eq: () => ({ eq: async () => ({ error: null }) }) }; },
    }) };
    mocks.prepare.mockResolvedValue({ quote, fingerprint: "verified", stripe: { refunds: { create: mocks.create } }, opts: { stripeAccount: "acct_original" }, admin, registration: { id: "registration" }, tournament: { id: "tournament" }, charge: { transfer: null } });
    mocks.create.mockResolvedValue({ id: "re_success", status: "succeeded" });
  });
  const invoke = (fingerprint = "verified") => (confirmRegistrationRefund as any)({ data: { registrationId: "registration", quoteId: "quote", fingerprint }, context: { userId: "organizer" } });
  it("sends exactly $150 and never returns the platform fee, then records $7.50 and $4.65 retained", async () => {
    await invoke();
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ payment_intent: "pi_original", amount: 15000, refund_application_fee: false }), expect.objectContaining({ stripeAccount: "acct_original", idempotencyKey: "teevents-refund-quote" }));
    expect(mocks.update).toHaveBeenCalledWith("tournament_refund_requests", expect.objectContaining({ amount_cents: 15000, stripe_refund_id: "re_success", fee_breakdown: expect.objectContaining({ platformFeeKeptCents: 750, processingFeeKeptCents: 465, organizerCostCents: 1215 }) }));
  });
  it("issues no refund when amounts changed", async () => {
    await expect(invoke("stale")).rejects.toThrow("Refund amounts changed");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("issues no second refund while another attempt holds the registration lock", async () => {
    mocks.lockError = { code: "23505" };
    await expect(invoke()).rejects.toThrow("already being processed");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("leaves pending refunds recorded without marking the registration refunded", async () => {
    mocks.create.mockResolvedValue({ id: "re_pending", status: "pending" });
    await invoke();
    expect(mocks.update).toHaveBeenCalledWith("tournament_refund_requests", expect.objectContaining({ status: "pending", stripe_refund_id: "re_pending" }));
    expect(mocks.update).not.toHaveBeenCalledWith("tournament_registrations", expect.anything());
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});