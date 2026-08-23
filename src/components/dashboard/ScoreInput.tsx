import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";

/**
 * Pure helpers exported for unit tests. Keep them free of React/DOM so
 * they can be exercised directly in vitest.
 */

/** Parse a raw string from a score input into an internal value. */
export function parseScoreInput(
  raw: string
): { kind: "clear" } | { kind: "invalid" } | { kind: "value"; value: number } {
  if (raw === "") return { kind: "clear" };
  // Reject anything other than digits (blocks e/+/-/. from native number inputs).
  if (!/^\d+$/.test(raw)) return { kind: "invalid" };
  const num = parseInt(raw, 10);
  if (isNaN(num) || num < 1 || num > 20) return { kind: "invalid" };
  return { kind: "value", value: num };
}

/**
 * Compute the new score when applying a +/- offset button.
 * If nothing has been entered yet, we start at par so a single tap of "+"
 * yields "par + 1" and "-" yields "par - 1" (never below 1).
 */
export function applyOffset(
  currentValue: number | "",
  par: number,
  delta: number
): number {
  const base = typeof currentValue === "number" ? currentValue : par;
  const next = base + delta;
  if (next < 1) return 1;
  if (next > 20) return 20;
  return next;
}

interface ScoreInputProps {
  value: number | "";
  par: number;
  onChange: (raw: string) => void;
  onSet: (value: number) => void;
  className?: string;
  ariaLabel?: string;
  /** Show the +/- buttons around the field. Defaults to true. */
  showOffset?: boolean;
}

/**
 * Score entry cell used inside the individual scorecard. Renders an input
 * that displays the hole par as a placeholder (never as a pre-filled digit
 * that the user must delete) plus optional +/- buttons for one-tap
 * adjustments relative to par.
 */
export function ScoreInput({
  value,
  par,
  onChange,
  onSet,
  className = "",
  ariaLabel,
  showOffset = true,
}: ScoreInputProps) {
  return (
    <div className="inline-flex items-center gap-1">
      {showOffset && (
        <button
          type="button"
          aria-label={`Decrease score${ariaLabel ? ` for ${ariaLabel}` : ""}`}
          onClick={() => onSet(applyOffset(value, par, -1))}
          className="h-8 w-6 rounded border border-input text-muted-foreground hover:bg-muted flex items-center justify-center"
        >
          <Minus className="h-3 w-3" />
        </button>
      )}
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={ariaLabel}
        value={value}
        placeholder={String(par)}
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(e.target.value)}
        className={`w-12 h-8 text-center text-sm p-0 ${className}`}
      />
      {showOffset && (
        <button
          type="button"
          aria-label={`Increase score${ariaLabel ? ` for ${ariaLabel}` : ""}`}
          onClick={() => onSet(applyOffset(value, par, +1))}
          className="h-8 w-6 rounded border border-input text-muted-foreground hover:bg-muted flex items-center justify-center"
        >
          <Plus className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
