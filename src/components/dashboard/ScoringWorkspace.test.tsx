import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScoringWorkspace, { type ScoringEntry } from "./ScoringWorkspace";

afterEach(cleanup);

function ScoreGrid({ onValue }: { onValue: (hole: number, value: number) => void }) {
  const [holeScores, setHoleScores] = useState<Record<number, number>>({});
  const entry: ScoringEntry = {
    key: "test-team", label: "Test Team", players: [], holeScores,
    total: Object.values(holeScores).reduce((sum, score) => sum + score, 0),
  };
  return <ScoringWorkspace
    entries={[entry]} counts={{ total: 1, verified: 0, entered: 0, notStarted: 1 }}
    verifiedKeys={new Set()} selectedKey={entry.key} onSelect={() => {}}
    onVerify={() => {}} onUnverify={() => {}} isTeamFormat isStableford={false}
    showNet={false} holes={[1, 2, 3]} getHolePar={() => 4} coursePar={12}
    formatName="Scramble" canEdit saving={false} onSave={() => {}}
    onCellValue={(_, hole, value) => {
      onValue(hole, value);
      setHoleScores((previous) => ({ ...previous, [hole]: value }));
    }}
    onCellClear={(_, hole) => setHoleScores((previous) => {
      const next = { ...previous };
      delete next[hole];
      return next;
    })}
  />;
}

describe("organizer score grid focus", () => {
  it.each([10, 11, 19, 20])("types %i into one empty hole without putting a digit in the next", async (score) => {
    const onValue = vi.fn();
    render(<ScoreGrid onValue={onValue} />);
    const user = userEvent.setup({ delay: 80 });
    const first = screen.getByLabelText("Test Team hole 1");
    await user.click(first);
    await user.keyboard(String(score)[0]);
    expect(first).toHaveFocus();
    await user.keyboard(String(score)[1]);
    await waitFor(() => expect(screen.getByLabelText("Test Team hole 2")).toHaveFocus());
    expect(first).toHaveValue(String(score));
    expect(screen.getByLabelText("Test Team hole 2")).toHaveValue("");
    expect(onValue).toHaveBeenLastCalledWith(1, score);
    expect(onValue.mock.calls.every(([hole]) => hole === 1)).toBe(true);
  });

  it("still advances after an unambiguous single-digit score", async () => {
    render(<ScoreGrid onValue={() => {}} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Test Team hole 1"), "4");
    await waitFor(() => expect(screen.getByLabelText("Test Team hole 2")).toHaveFocus());
    expect(screen.getByLabelText("Test Team hole 1")).toHaveValue("4");
  });
});