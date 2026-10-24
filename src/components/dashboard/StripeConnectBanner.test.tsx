import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ payout: { stripe_account_id: null as string | null, stripe_onboarding_complete: false }, pending: true }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mocks.payout, error: null }) }) }) }) } }));
vi.mock("react-router-dom", () => ({ useSearchParams: () => [new URLSearchParams("tournament_id=selected")], Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a> }));
vi.mock("@/lib/stripeLoginReminder", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/stripeLoginReminder")>(), takeStripeLoginReminder: () => { const pending = mocks.pending; mocks.pending = false; return pending; } }));
import StripeConnectBanner from "./StripeConnectBanner";

afterEach(() => { cleanup(); mocks.pending = true; mocks.payout = { stripe_account_id: null, stripe_onboarding_complete: false }; });
describe("organizer Stripe login modal", () => {
  it("dismisses until next login and leaves the banner reminder", async () => {
    const view = render(<StripeConnectBanner organizationId="org" loginReminder />);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "I'll do this later." }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Money, Payouts" })).toHaveAttribute("href", "/dashboard/payout-settings?tournament_id=selected");
    view.unmount();
    render(<StripeConnectBanner organizationId="org" loginReminder />);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
  it("connect links to Money/Payouts without changing the selected tournament", async () => {
    render(<StripeConnectBanner organizationId="org" loginReminder />);
    const connect = await screen.findByRole("link", { name: "Connect Stripe" });
    expect(connect).toHaveAttribute("href", "/dashboard/payout-settings?tournament_id=selected");
  });
  it("does not prompt admin mode", async () => {
    render(<StripeConnectBanner organizationId="org" loginReminder={false} />);
    await screen.findByRole("link", { name: "Money, Payouts" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.pending).toBe(true);
  });
  it("does not show a modal or banner for a completed connection", async () => {
    mocks.payout = { stripe_account_id: "acct_existing", stripe_onboarding_complete: true };
    render(<StripeConnectBanner organizationId="org" loginReminder />);
    await waitFor(() => expect(mocks.pending).toBe(false));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Money, Payouts" })).not.toBeInTheDocument();
  });
});