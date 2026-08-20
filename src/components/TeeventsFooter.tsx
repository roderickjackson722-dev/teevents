import logoAsset from "@/assets/teevents-logo-black.png.asset.json";

export interface BrandingFooterFields {
  is_pro?: boolean | null;
  show_branding_footer?: boolean | null;
  branding_footer_admin_override?: boolean | null;
  branding_footer_admin_show?: boolean | null;
  branding_footer_custom_text?: string | null;
}

const DEFAULT_TEXT =
  "Need to run your tournament? Get started with TeeVents - The all in one platform for golf tournaments";

/**
 * "Powered by TeeVents" footer shown on public tournament pages.
 *
 * Visibility rules:
 *  - Admin override (when set) wins.
 *  - Free organizers: footer is mandatory.
 *  - Pro / Enterprise: organizer can hide via show_branding_footer toggle.
 */
export function TeeventsFooter({ tournament }: { tournament: BrandingFooterFields | null | undefined }) {
  if (!tournament) return null;

  const isPro = !!tournament.is_pro;
  const adminOverride = tournament.branding_footer_admin_override === true;
  const adminShow = tournament.branding_footer_admin_show !== false;
  const organizerShow = tournament.show_branding_footer !== false;

  let visible: boolean;
  if (adminOverride) visible = adminShow;
  else if (!isPro) visible = true;
  else visible = organizerShow;

  if (!visible) return null;

  const text = (tournament.branding_footer_custom_text || "").trim() || DEFAULT_TEXT;

  return (
    <footer
      className="teevents-footer w-full flex flex-wrap items-center justify-center gap-3 px-6 py-4 text-sm text-white"
      style={{ backgroundColor: "#1a5c38", fontFamily: "Arial, sans-serif" }}
    >
      <a
        href="https://teevents.golf/"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#F5A623", textDecoration: "none", fontWeight: 600 }}
        className="hover:underline"
      >
        {text}
      </a>
      <span className="inline-flex items-center gap-2 opacity-90">
        <img src={logoAsset.url} alt="TeeVents" style={{ height: 24 }} className="object-contain" />
        <span>teevents.golf</span>
      </span>
    </footer>
  );
}

export default TeeventsFooter;
