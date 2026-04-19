import { fontStack, POSITION_CLASS, FLEX_JUSTIFY, type Position, type HoverEffect } from "@/lib/siteDesign";

interface DesignPreviewProps {
  showLogo: boolean;
  logoUrl: string | null;
  heroImageUrl: string | null;
  heroOpacity: number;
  title: string;
  subtitle: string;
  fontFamily: string;
  headingSize: number;
  bodySize: number;
  buttonSize: number;
  textColor: string;
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  logoPosition: Position;
  titlePosition: Position;
  buttonPosition: Position;
  buttonRadius: number;
  buttonHoverEffect: HoverEffect;
}

/**
 * Inline mini-preview of the public tournament page hero,
 * scaled down so the organizer can see edits update in real time.
 */
export function DesignPreview(p: DesignPreviewProps) {
  const stack = fontStack(p.fontFamily);
  // Scale heading down for the preview area; keep proportional
  const previewHeading = Math.max(20, Math.round(p.headingSize * 0.45));
  const previewBody = Math.max(11, Math.round(p.bodySize * 0.85));
  const previewButton = Math.max(11, Math.round(p.buttonSize * 0.85));

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <div className="bg-muted/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Live Preview
      </div>

      {/* Hero block — mirrors PublicTournament hero structure */}
      <div className="relative h-72" style={{ backgroundColor: p.primaryColor }}>
        {p.heroImageUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${p.heroImageUrl})`,
              opacity: p.heroOpacity / 100,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />

        <div className={`relative z-10 h-full flex flex-col justify-center p-4 gap-2 ${POSITION_CLASS[p.titlePosition]}`} style={{ fontFamily: stack }}>
          {p.showLogo && p.logoUrl && (
            <div className={`w-full flex ${FLEX_JUSTIFY[p.logoPosition]}`}>
              <img src={p.logoUrl} alt="" className="h-10 w-auto object-contain mb-1" />
            </div>
          )}
          <div
            className="font-bold text-white drop-shadow"
            style={{ fontSize: `${previewHeading}px`, lineHeight: 1.1 }}
          >
            {p.title || "Your Tournament Title"}
          </div>
          {p.subtitle && (
            <div className="text-white/85" style={{ fontSize: `${previewBody}px` }}>
              {p.subtitle}
            </div>
          )}
          <div className={`w-full flex gap-2 mt-2 ${FLEX_JUSTIFY[p.buttonPosition]}`}>
            <button
              type="button"
              className="font-semibold transition-all"
              style={{
                backgroundColor: p.secondaryColor,
                color: "#1a1a1a",
                fontSize: `${previewButton}px`,
                padding: "6px 14px",
                borderRadius: `${p.buttonRadius}px`,
              }}
            >
              Register
            </button>
            <button
              type="button"
              className="font-semibold transition-all border"
              style={{
                backgroundColor: "transparent",
                color: "#fff",
                borderColor: "rgba(255,255,255,0.6)",
                fontSize: `${previewButton}px`,
                padding: "6px 14px",
                borderRadius: `${p.buttonRadius}px`,
              }}
            >
              Sponsors
            </button>
          </div>
        </div>
      </div>

      {/* Content block to show body text/background colors */}
      <div className="p-4" style={{ backgroundColor: p.backgroundColor, color: p.textColor, fontFamily: stack }}>
        <div className="font-bold mb-1" style={{ fontSize: `${Math.round(previewHeading * 0.5)}px` }}>
          About the Event
        </div>
        <p style={{ fontSize: `${previewBody}px`, lineHeight: 1.5 }}>
          A short paragraph of body text shows how your selected font, sizes, and text color look on a real content section of your public tournament page.
        </p>
      </div>
    </div>
  );
}
