import { describe, it, expect } from "vitest";
import { assignMarkers, canAttest, markerForSubject, publicLabel, strictGateHole, cardStatus } from "./scoreVerification";

const four = [
  { id: "a", teamId: "T1" }, { id: "b", teamId: "T1" },
  { id: "c", teamId: "T2" }, { id: "d", teamId: "T2" },
];

describe("score verification", () => {
  it("never assigns a player as their own marker", () => {
    const m = assignMarkers([{ id: "a", teamId: null }, { id: "b", teamId: null }, { id: "c", teamId: null }]);
    expect(m).toEqual({ a: "b", b: "c", c: "a" });
  });
  it("in a 2v2 foursome each player marks someone from the other team", () => {
    const m = assignMarkers(four);
    expect(m).toEqual({ a: "c", b: "c", c: "a", d: "a" });
  });
  it("organizer reassignment wins unless it is a teammate", () => {
    expect(assignMarkers(four, { a: "d" })["a"]).toBe("d");
    expect(assignMarkers(four, { a: "b" })["a"]).toBe("c");
  });
  it("a player can never attest their own or their own team's score", () => {
    expect(canAttest("a", ["a"], four)).toBe(false);
    expect(canAttest("b", ["a"], four)).toBe(false);
    expect(canAttest("c", ["a"], four)).toBe(true);
    expect(canAttest("a", ["a", "b"], four)).toBe(false);
  });
  it("a team score is marked by a player from the other team", () => {
    expect(markerForSubject(["a", "b"], four)).toBe("c");
  });
  it("remote attestation shows as Unverified, disputes as Disputed", () => {
    const card = { subject_key: "a", member_ids: ["a"], player_ok_at: "x", attested_at: "x", attested_remote: true, force_attested_by: null, player_state: null };
    expect(publicLabel([], card)).toBe("unverified");
    expect(publicLabel([], { ...card, attested_remote: false })).toBe("attested");
    expect(publicLabel([{ hole: 1, subject_key: "a", member_ids: ["a"], status: "disputed", entered: 4, marker: 5 }], card)).toBe("disputed");
  });
  it("strict mode blocks the next hole until every entry on the hole is confirmed", () => {
    const rows = [
      { hole: 1, subject_key: "a", member_ids: ["a"], status: "confirmed" as const, entered: 4, marker: 4 },
      { hole: 1, subject_key: "c", member_ids: ["c"], status: "entered" as const, entered: 5, marker: null },
    ];
    expect(strictGateHole(rows, ["a", "c"])).toBe(1);
    expect(strictGateHole([rows[0]!, { ...rows[1]!, status: "confirmed" }], ["a", "c"])).toBeNull();
  });
  it("a card with no scores is Unsubmitted", () => {
    expect(cardStatus([], undefined)).toBe("Unsubmitted");
  });
});
