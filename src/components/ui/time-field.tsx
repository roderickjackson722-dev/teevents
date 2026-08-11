import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Mobile-safe time picker.
 *
 * Android Chrome's native <input type="time"> clock dialog only offers
 * "Clear" and "Cancel", so organizers could never commit a tee time on those
 * devices. These dropdowns behave identically on every platform and commit the
 * value as soon as a part is chosen.
 *
 * Value format is 24-hour "HH:MM" (same as an <input type="time">).
 */
export function TimeField({
  value,
  onChange,
  disabled,
  minuteStep = 1,
  className,
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
  minuteStep?: number;
  className?: string;
}) {
  const raw = (value || "").slice(0, 5);
  const [hRaw, mRaw] = raw.split(":");
  const h24 = hRaw !== undefined && hRaw !== "" ? Number(hRaw) : null;
  const minute = mRaw !== undefined && mRaw !== "" ? Number(mRaw) : null;

  const hour12 = h24 == null ? "" : String(h24 % 12 === 0 ? 12 : h24 % 12);
  const meridiem = h24 == null ? "" : h24 >= 12 ? "PM" : "AM";

  const commit = (next: { hour12?: string; minute?: string; meridiem?: string }) => {
    const hh = next.hour12 ?? hour12 ?? "";
    const mm = next.minute ?? (minute == null ? "" : String(minute).padStart(2, "0"));
    const ap = next.meridiem ?? meridiem ?? "";
    if (!hh) return;
    const finalAp = ap || "AM";
    const finalMm = mm === "" ? "00" : mm;
    let hourNum = Number(hh) % 12;
    if (finalAp === "PM") hourNum += 12;
    onChange(`${String(hourNum).padStart(2, "0")}:${String(Number(finalMm)).padStart(2, "0")}`);
  };

  const minutes: number[] = [];
  for (let i = 0; i < 60; i += Math.max(1, minuteStep)) minutes.push(i);

  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      <Select value={hour12} disabled={disabled} onValueChange={(v) => commit({ hour12: v })}>
        <SelectTrigger className="w-[72px]"><SelectValue placeholder="Hr" /></SelectTrigger>
        <SelectContent className="max-h-64">
          {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">:</span>
      <Select
        value={minute == null ? "" : String(minute).padStart(2, "0")}
        disabled={disabled}
        onValueChange={(v) => commit({ minute: v })}
      >
        <SelectTrigger className="w-[76px]"><SelectValue placeholder="Min" /></SelectTrigger>
        <SelectContent className="max-h-64">
          {minutes.map((m) => {
            const mm = String(m).padStart(2, "0");
            return <SelectItem key={mm} value={mm}>{mm}</SelectItem>;
          })}
        </SelectContent>
      </Select>
      <Select value={meridiem} disabled={disabled} onValueChange={(v) => commit({ meridiem: v })}>
        <SelectTrigger className="w-[76px]"><SelectValue placeholder="AM" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export default TimeField;
