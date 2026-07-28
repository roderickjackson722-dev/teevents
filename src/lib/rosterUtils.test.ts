import { describe, it, expect } from "vitest";
import {
  isPaidStatus,
  countPayments,
  filterByPayment,
  buildRegistrationGroups,
  buildAutoAssignUnits,
  teammatesAwayFromHole,
  type RosterPlayer,
} from "./rosterUtils";

const p = (over: Partial<RosterPlayer> & { id: string }): RosterPlayer => ({
  payment_status: "pending",
  ...over,
});

describe("payment filtering", () => {
  const players = [
    p({ id: "1", payment_status: "paid" }),
    p({ id: "2", payment_status: "pending" }),
    p({ id: "3", payment_status: "PAID" }),
    p({ id: "4", payment_status: null }),
  ];

  it("treats status case-insensitively", () => {
    expect(isPaidStatus({ payment_status: "PAID" })).toBe(true);
    expect(isPaidStatus({ payment_status: "pending" })).toBe(false);
  });

  it("counts paid vs pending", () => {
    expect(countPayments(players)).toEqual({ paid: 2, pending: 2, total: 4 });
  });

  it("filters by paid / pending / all", () => {
    expect(filterByPayment(players, "paid").map((x) => x.id)).toEqual(["1", "3"]);
    expect(filterByPayment(players, "pending").map((x) => x.id)).toEqual(["2", "4"]);
    expect(filterByPayment(players, "all")).toHaveLength(4);
  });

  it("reflects an organizer flipping pending to paid", () => {
    const updated = players.map((x) => (x.id === "2" ? { ...x, payment_status: "paid" } : x));
    expect(countPayments(updated)).toEqual({ paid: 3, pending: 1, total: 4 });
  });
});

describe("registration group rendering", () => {
  const players = [
    p({ id: "a", group_id: "g1" }),
    p({ id: "b", group_id: "g1", group_leader: true }),
    p({ id: "c", group_id: "g2" }),
    p({ id: "d", group_id: "g2" }),
    p({ id: "solo" }),
    p({ id: "lonely", group_id: "g3" }),
  ];

  it("only surfaces groups with more than one player", () => {
    const groups = buildRegistrationGroups(players);
    expect(groups.map((g) => g.id)).toEqual(["g1", "g2"]);
  });

  it("puts the captain first", () => {
    const [g1] = buildRegistrationGroups(players);
    expect(g1.players[0].id).toBe("b");
  });

  it("uses the organizer-provided team name when renamed", () => {
    const groups = buildRegistrationGroups(players, { g1: "Bogey Busters" });
    expect(groups[0].name).toBe("Bogey Busters");
    expect(groups[1].name).toBe("Group 2");
  });
});

describe("pairing auto-suggestion keeps groups together", () => {
  it("keeps a foursome in a single unit", () => {
    const foursome = ["a", "b", "c", "d"].map((id) => p({ id, group_id: "g1" }));
    const units = buildAutoAssignUnits([...foursome, p({ id: "solo" })], 4);
    expect(units[0].map((x) => x.id)).toEqual(["a", "b", "c", "d"]);
    expect(units[1].map((x) => x.id)).toEqual(["solo"]);
  });

  it("chunks oversized groups to the hole limit", () => {
    const six = ["1", "2", "3", "4", "5", "6"].map((id) => p({ id, group_id: "g1" }));
    const units = buildAutoAssignUnits(six, 4);
    expect(units.map((u) => u.length)).toEqual([4, 2]);
  });

  it("never splits a group across units when it fits", () => {
    const players = [
      ...["a", "b"].map((id) => p({ id, group_id: "g1" })),
      ...["c", "d", "e"].map((id) => p({ id, group_id: "g2" })),
      p({ id: "solo" }),
    ];
    const units = buildAutoAssignUnits(players, 4);
    units.forEach((u) => {
      const ids = new Set(u.map((x) => x.group_id).filter(Boolean));
      expect(ids.size).toBeLessThanOrEqual(1);
    });
  });

  it("detects teammates left behind during manual pairing edits", () => {
    const players = [
      p({ id: "a", group_id: "g1", group_number: 5 }),
      p({ id: "b", group_id: "g1", group_number: 1 }),
      p({ id: "c", group_id: "g1", group_number: 5 }),
      p({ id: "d", group_id: "g2", group_number: 1 }),
    ];
    const moved = players[0];
    expect(teammatesAwayFromHole(moved, players, 5).map((x) => x.id)).toEqual(["b"]);
    expect(teammatesAwayFromHole(moved, players, null)).toEqual([]);
  });
});
