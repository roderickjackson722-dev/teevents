import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScoreInput, parseScoreInput, applyOffset } from "./ScoreInput";

describe("parseScoreInput", () => {
  it("treats empty string as a clear signal", () => {
    expect(parseScoreInput("")).toEqual({ kind: "clear" });
  });

  it("accepts plain integers between 1 and 20", () => {
    expect(parseScoreInput("6")).toEqual({ kind: "value", value: 6 });
    expect(parseScoreInput("20")).toEqual({ kind: "value", value: 20 });
  });

  it("rejects non-digit characters like e, +, -, .", () => {
    expect(parseScoreInput("e")).toEqual({ kind: "invalid" });
    expect(parseScoreInput("-1")).toEqual({ kind: "invalid" });
    expect(parseScoreInput("+3")).toEqual({ kind: "invalid" });
    expect(parseScoreInput("3.5")).toEqual({ kind: "invalid" });
  });

  it("rejects out-of-range values", () => {
    expect(parseScoreInput("0")).toEqual({ kind: "invalid" });
    expect(parseScoreInput("99")).toEqual({ kind: "invalid" });
  });
});

describe("applyOffset", () => {
  it("starts from par when no value is set", () => {
    expect(applyOffset("", 4, +1)).toBe(5);
    expect(applyOffset("", 4, -1)).toBe(3);
  });

  it("adjusts from the current value when set", () => {
    expect(applyOffset(6, 4, -1)).toBe(5);
    expect(applyOffset(6, 4, +1)).toBe(7);
  });

  it("clamps to 1..20", () => {
    expect(applyOffset(1, 4, -1)).toBe(1);
    expect(applyOffset(20, 4, +1)).toBe(20);
  });
});

describe("ScoreInput", () => {
  it("renders par as placeholder, not as a pre-filled value", () => {
    render(
      <ScoreInput value="" par={4} onChange={() => {}} onSet={() => {}} ariaLabel="P1 hole 1" />
    );
    const input = screen.getByLabelText("P1 hole 1") as HTMLInputElement;
    expect(input.value).toBe("");
    expect(input.placeholder).toBe("4");
  });

  it("forwards typed digits to onChange (typing a full number)", () => {
    const onChange = vi.fn();
    render(
      <ScoreInput value="" par={4} onChange={onChange} onSet={() => {}} ariaLabel="P1 hole 1" />
    );
    const input = screen.getByLabelText("P1 hole 1") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "6" } });
    expect(onChange).toHaveBeenCalledWith("6");
  });

  it("allows replacing the current value without a stuck leading digit", () => {
    const onChange = vi.fn();
    render(
      <ScoreInput value={1} par={4} onChange={onChange} onSet={() => {}} ariaLabel="P1 hole 1" />
    );
    const input = screen.getByLabelText("P1 hole 1") as HTMLInputElement;
    // simulate select-on-focus + typing "6" replacing the "1"
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "6" } });
    expect(onChange).toHaveBeenLastCalledWith("6");
  });

  it("emits an empty string when the field is cleared via backspace", () => {
    const onChange = vi.fn();
    render(
      <ScoreInput value={5} par={4} onChange={onChange} onSet={() => {}} ariaLabel="P1 hole 1" />
    );
    const input = screen.getByLabelText("P1 hole 1") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("increments from par via the + button when empty", () => {
    const onSet = vi.fn();
    render(
      <ScoreInput value="" par={4} onChange={() => {}} onSet={onSet} ariaLabel="P1 hole 1" />
    );
    fireEvent.click(screen.getByLabelText(/Increase score for P1 hole 1/));
    expect(onSet).toHaveBeenCalledWith(5);
  });

  it("decrements from current value via the − button", () => {
    const onSet = vi.fn();
    render(
      <ScoreInput value={6} par={4} onChange={() => {}} onSet={onSet} ariaLabel="P1 hole 1" />
    );
    fireEvent.click(screen.getByLabelText(/Decrease score for P1 hole 1/));
    expect(onSet).toHaveBeenCalledWith(5);
  });
});
