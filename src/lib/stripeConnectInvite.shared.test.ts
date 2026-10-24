import { expect, it } from "vitest";
import { resolveInviteOwner } from "./stripeConnectInvite.shared";

it("uses only the single organizer owner on file, never an arbitrary recipient", () => {
  expect(resolveInviteOwner([{ user_id: "organizer-on-file", name: "Pat" }])?.user_id).toBe("organizer-on-file");
  expect(() => resolveInviteOwner([])).toThrow();
  expect(() => resolveInviteOwner([{ user_id: "one", name: null }, { user_id: "two", name: null }])).toThrow();
});