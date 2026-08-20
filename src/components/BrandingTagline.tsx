export interface BrandingRemovalFields {
  branding_removed?: boolean | null;
  branding_removed_by_admin?: boolean | null;
}

/** True when TeeVents branding should be hidden (paid removal or admin override). */
export function isBrandingRemoved(t: BrandingRemovalFields | null | undefined) {
  return !!(t?.branding_removed || t?.branding_removed_by_admin);
}

export const BRANDING_TAGLINE = "Need to run your tournament? Get started with TeeVents - The all in one platform for golf tournaments →";

/**
 * Footer tagline shown on the live leaderboard and mobile scoring pages.
 * Hidden when the organizer purchased branding removal or an admin overrode it.
 */
export function BrandingTagline({ tournament }: { tournament: BrandingRemovalFields | null | undefined }) {
  if (isBrandingRemoved(tournament)) return null;
  return (
    <footer className="w-full px-4 py-3 text-center text-xs sm:text-sm" style={{ backgroundColor: "#1a5c38" }}>
      <a
        href="https://teevents.golf/"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#F5A623", textDecoration: "none", fontWeight: 600 }}
        className="hover:underline inline-flex items-center justify-center gap-1 flex-wrap"
      >
        {BRANDING_TAGLINE}
      </a>
    </footer>
  );
}

export default BrandingTagline;
