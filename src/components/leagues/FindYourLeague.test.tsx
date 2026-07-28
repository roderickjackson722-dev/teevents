import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import FindYourLeague from "./FindYourLeague";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

const setup = () =>
  render(
    <MemoryRouter>
      <FindYourLeague />
    </MemoryRouter>
  );

describe("FindYourLeague", () => {
  beforeEach(() => rpc.mockReset());

  it("shows actionable guidance when no league matches", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    setup();
    await userEvent.type(screen.getByLabelText(/search leagues by name/i), "Nope");
    await userEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => expect(screen.getByText(/No leagues matched "Nope"/i)).toBeInTheDocument());
    expect(screen.getByText(/publish the league/i)).toBeInTheDocument();
  });

  it("shows an error message when the search request fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    setup();
    await userEvent.type(screen.getByLabelText(/search leagues by name/i), "Vets");
    await userEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/couldn't run that search/i));
  });

  it("links results to the public page and the member login portal", async () => {
    rpc.mockResolvedValue({
      data: [{ league_name: "Vets & Tees", league_slug: "vets-tees", season_year: 2026, is_active: true }],
      error: null,
    });
    setup();
    await userEvent.type(screen.getByLabelText(/search leagues by name/i), "Vets");
    await userEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => expect(screen.getByText("Vets & Tees")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /view/i })).toHaveAttribute("href", "/league/vets-tees");
    expect(screen.getByRole("link", { name: /member login/i })).toHaveAttribute("href", "/league/vets-tees/score");
    expect(screen.getByText(/6-character code/i)).toBeInTheDocument();
  });
});
