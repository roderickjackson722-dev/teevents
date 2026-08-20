import logoAsset from "@/assets/teevents-logo-black.png.asset.json";

export interface BrandingFooterFields {
  is_pro?: boolean | null;
  show_branding_footer?: boolean | null;
  branding_footer_admin_override?: boolean | null;
  branding_footer_admin_show?: boolean | null;
  branding_footer_custom_text?: string | null;
}

const DEFAULT_TEXT =
  "Need to run your tournament? Get started with TeeVents\nThe all in one platform for golf tournaments →";


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
      className="teevents-footer w-full px-6 py-4 text-sm text-white"
      style={{ backgroundColor: "#1a5c38", fontFamily: "Arial, sans-serif" }}
    >
      <a
        href="https://teevents.golf/"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#F5A623", textDecoration: "none", fontWeight: 600 }}
        className="hover:underline flex flex-col items-center justify-center gap-2 text-center"
      >
        <img src={logoAsset.url} alt="TeeVents Golf Management" style={{ height: 26 }} className="object-contain" />
        <span className="flex flex-col items-center leading-tight">
          {text.split("\n").map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </span>
      </a>
    </footer>
  );

}

export default TeeventsFooter;
