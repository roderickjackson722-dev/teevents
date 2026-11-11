import { bannerLogo, bannerName, holeSponsorsFor, type HoleSponsor } from "@/lib/holeSponsors";

/** Display-only "This hole is sponsored by" banner; sits outside the score entry area. */
export function HoleSponsorBanner({ sponsors, hole, placement }: { sponsors: HoleSponsor[]; hole: number; placement: "top" | "bottom" }) {
  const shown = holeSponsorsFor(sponsors, hole, placement);
  if (shown.length === 0) return null;
  return (
    <div data-testid={`hole-sponsor-banner-${placement}`} className="rounded-lg border border-border bg-card px-4 py-3 text-center">
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">This hole is sponsored by</p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {shown.map((s) => {
          const mode = s.hole_banner_display || "both";
          const logo = bannerLogo(s);
          const name = bannerName(s);
          const showLogo = mode !== "name" && !!logo;
          const showName = mode === "name" || mode === "both" || !logo;
          return (
            <div key={s.id} className="flex items-center gap-3">
              {showLogo && <img src={logo!} alt={name} className="h-12 w-auto max-w-[180px] object-contain" />}
              {showName && name && <span className="text-base font-semibold text-foreground">{name}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
