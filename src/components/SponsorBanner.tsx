import { useState, useEffect } from "react";
import { Award } from "lucide-react";

interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: string;
}

interface SponsorBannerProps {
  sponsors: Sponsor[];
  intervalMs?: number;
}

const tierPriority: Record<string, number> = {
  title: 0, platinum: 1, gold: 2, silver: 3, bronze: 4, hole: 5, inkind: 6,
};

export function SponsorBanner({ sponsors, intervalMs = 5000 }: SponsorBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const sorted = [...sponsors].sort(
    (a, b) => (tierPriority[a.tier] ?? 99) - (tierPriority[b.tier] ?? 99)
  );

  useEffect(() => {
    if (sorted.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sorted.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [sorted.length, intervalMs]);

  if (sorted.length === 0) return null;

  const current = sorted[currentIndex % sorted.length];

  const content = (
    <div className="flex items-center justify-center gap-3 py-2.5 px-4 bg-card/95 backdrop-blur border border-border rounded-lg shadow-sm transition-all duration-500">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold shrink-0">
        Sponsored by
      </span>
      {current.logo_url ? (
        <img
          src={current.logo_url}
          alt={current.name}
          className="h-8 max-w-[120px] object-contain"
        />
      ) : (
        <div className="flex items-center gap-1.5">
          <Award className="h-4 w-4 text-secondary" />
          <span className="text-sm font-semibold text-foreground">{current.name}</span>
        </div>
      )}
      {sorted.length > 1 && (
        <div className="flex gap-1 ml-2">
          {sorted.map((_, i) => (
            <div
              key={i}
              className={`h-1 w-1 rounded-full transition-colors ${
                i === currentIndex % sorted.length ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (current.website_url) {
    return (
      <a href={current.website_url} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }

  return content;
}
