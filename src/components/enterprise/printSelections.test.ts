import { describe, expect, it } from "vitest";
import { addedPlayer, draftFrom, printoutGroups, printoutPlayers } from "./printSelections";

const rows = [
  { id: "a", first_name: "Ann", last_name: "Lee", email: "a@x", group_number: 1, group_position: 1, group_label: "1A", tee_time: "8:00" },
  { id: "b", first_name: "Bo", last_name: "Ray", email: "b@x", group_number: 1, group_position: 1, group_label: "1A", tee_time: "8:00" },
];

describe("printout-only selections", () => {
  it("removing a player drops them from the printout only", () => {
    const d = draftFrom(rows);
    d[1].include = false;
    expect(printoutPlayers(d).map((p) => p.id)).toEqual(["a"]);
    expect(rows).toHaveLength(2);
  });

  it("changing group and tee overrides the printout, not the source rows", () => {
    const d = draftFrom(rows);
    d[0].group_number = 3;
    d[0].tee_time = "9:10";
    const out = printoutPlayers(d);
    expect(out[0].group_number).toBe(3);
    expect(out[0].tee_time).toBe("9:10");
    expect(out[0].group_label).toBeNull();
    expect(rows[0].group_number).toBe(1);
    expect(rows[0].tee_time).toBe("8:00");
  });

  it("added players appear in the printout", () => {
    const d = [...draftFrom(rows), addedPlayer("Cy", "Doe", 2)];
    expect(printoutPlayers(d).map((p) => p.first_name)).toContain("Cy");
  });

  it("group tee overrides do not mutate the event's groups", () => {
    const groups = [{ group_number: 1, tee_time: "8:00" }];
    const d = draftFrom(rows);
    d[0].tee_time = "7:30";
    const out = printoutGroups(groups, printoutPlayers(d));
    expect(out[0].tee_time).toBe("7:30");
    expect(groups[0].tee_time).toBe("8:00");
  });
});
