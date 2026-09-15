import teeventsLogo from "@/assets/teevents-logo-black.png.asset.json";

interface Props {
  primaryColor: string;
  secondaryColor: string;
  /** Smaller variant for the phone mockup. */
  size?: "sm" | "md";
  className?: string;
}

/**
 * "This event is sponsored by" strip shown on the sample leaderboard and
 * mobile scoring views — the same paid placement organizers sell to sponsors.
 */
export default function SampleSponsorStrip({
  primaryColor,
  secondaryColor,
  size = "md",
  className = "",
}: Props) {
  const small = size === "sm";
  return (
    <div
      className={`flex items-center justify-center gap-2 border border-border bg-white ${
        small ? "px-2 py-1.5" : "gap-3 px-4 py-3"
      } ${className}`}
    >
      <span
        className={`shrink-0 font-semibold uppercase tracking-widest ${
          small ? "text-[7px]" : "text-[10px]"
        }`}
        style={{ color: primaryColor }}
      >
        This event is sponsored by
      </span>
      <img
        src={teeventsLogo.url}
        alt="TeeVents Golf Management Co."
        className={small ? "h-4 object-contain" : "h-8 object-contain"}
      />
      <span
        className={`hidden shrink-0 rounded px-1.5 py-0.5 font-bold sm:inline ${
          small ? "text-[7px]" : "text-[9px]"
        }`}
        style={{ backgroundColor: `${secondaryColor}33`, color: primaryColor }}
      >
        SPONSOR SPOT
      </span>
    </div>
  );
}
