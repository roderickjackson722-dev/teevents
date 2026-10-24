import { describe, expect, it } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { nextLoginReminder } from "./stripeLoginReminder";

const session = (id: string) => ({ access_token: `header.${btoa(JSON.stringify({ session_id: id }))}.signature`, user: { id: "organizer" } }) as Session;
describe("organizer login reminder", () => {
  it("marks a new login for a reminder", () => {
    expect(nextLoginReminder("SIGNED_IN", session("new-login"), null)?.pending).toBe(true);
  });
  it("does not mark restoring an existing session as a login", () => {
    expect(nextLoginReminder("INITIAL_SESSION", session("existing"), null)?.pending).toBe(false);
  });
  it("does not re-prompt on focus or token refresh", () => {
    const previous = { sessionId: "same", userId: "organizer", pending: false };
    expect(nextLoginReminder("SIGNED_IN", session("same"), previous)?.pending).toBe(false);
    expect(nextLoginReminder("TOKEN_REFRESHED", session("same"), previous)?.pending).toBe(false);
  });
  it("reappears after the next distinct login and clears on sign out", () => {
    const previous = { sessionId: "old", userId: "organizer", pending: false };
    expect(nextLoginReminder("SIGNED_IN", session("next"), previous)?.pending).toBe(true);
    expect(nextLoginReminder("SIGNED_OUT", null, previous)).toBeNull();
  });
});