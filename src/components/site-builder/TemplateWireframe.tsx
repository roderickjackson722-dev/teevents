import type { SiteTemplate } from "@/lib/siteTemplates";

/** Miniature wireframe of a template's real page layout (logo, hero, headline, buttons, page). */
export function TemplateWireframe({ template }: { template: SiteTemplate }) {
  const { layout, colors } = template;
  const dark = layout.dark;
  const line = dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.18)";
  const photo = "linear-gradient(135deg,#7fa37a 0%,#4f7a52 55%,#9cc3e0 100%)";
  const justify = layout.align === "left" ? "flex-start" : layout.align === "right" ? "flex-end" : "center";
  const logo = (size = 10) => (
    <div style={{ width: size * 1.6, height: size, borderRadius: 2, background: dark ? "#d4af37" : colors.secondary, border: "1px solid rgba(0,0,0,0.15)" }} />
  );
  const headline = (light: boolean) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: justify, gap: 2 }}>
      <div style={{ width: 46, height: 5, borderRadius: 2, background: light ? "#fff" : colors.primary }} />
      <div style={{ width: 30, height: 3, borderRadius: 2, background: light ? "rgba(255,255,255,0.7)" : line }} />
    </div>
  );
  const buttons = (onLight: boolean) => (
    <div style={{ display: "flex", gap: 2, justifyContent: justify, marginTop: 4 }}>
      {Array.from({ length: layout.buttons }).map((_, i) => (
        <div key={i} style={{
          width: layout.buttons === 1 ? 34 : 14, height: layout.buttons === 1 ? 7 : 5,
          borderRadius: layout.pillButtons ? 9 : 1,
          background: i === 0 ? colors.secondary : onLight ? colors.primary : "rgba(255,255,255,0.85)",
        }} />
      ))}
    </div>
  );
  const nav = (
    <div style={{ height: 9, display: "flex", alignItems: "center", gap: 3, padding: "0 4px",
      background: template.id === "modern" ? "#fff" : template.id === "country_club" ? layout.pageBg : dark ? "#0f0f14" : "rgba(0,0,0,0.75)",
      borderBottom: "1px solid rgba(0,0,0,0.1)" }}>
      {layout.logo === "nav-left" && logo(6)}
      <div style={{ flex: 1, display: "flex", gap: 2, justifyContent: layout.logo === "nav-left" ? "flex-end" : "center" }}>
        {[0, 1, 2].map((i) => <div key={i} style={{ width: 8, height: 2, borderRadius: 1, background: template.id === "modern" || template.id === "country_club" ? colors.primary : "rgba(255,255,255,0.6)" }} />)}
      </div>
    </div>
  );

  let hero: React.ReactNode;
  if (layout.hero === "banner") {
    hero = (
      <div style={{ height: 50, background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary} 140%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
        {logo(7)}{headline(true)}{buttons(false)}
      </div>
    );
  } else if (layout.hero === "split" || layout.hero === "dark-split") {
    hero = (
      <div style={{ height: 50, display: "flex", background: layout.hero === "split" ? colors.primary : "#1b1b23" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 5px" }}>{headline(true)}{buttons(false)}</div>
        <div style={layout.hero === "split"
          ? { width: "48%", background: photo }
          : { width: "40%", margin: "6px 6px 6px 0", borderRadius: 3, border: `1.5px solid ${colors.secondary}`, background: photo }} />
      </div>
    );
  } else {
    const framed = layout.hero === "framed";
    hero = (
      <div style={{ height: 50, padding: framed ? 4 : 0, background: layout.pageBg }}>
        <div style={{ height: "100%", borderRadius: framed ? 10 : 0, background: photo, display: "flex", flexDirection: "column", alignItems: justify, justifyContent: "center", padding: "0 6px" }}>
          {headline(true)}{buttons(false)}
        </div>
      </div>
    );
  }

  const sectionBg = layout.sections === "summer-band" ? colors.primary : dark ? "#23232d" : layout.sections === "cream" ? layout.pageBg : "#ffffff";

  return (
    <div aria-hidden="true" className="w-full overflow-hidden border-b border-border" style={{ height: 96, background: layout.pageBg }}>
      {(layout.logo === "above-nav-center" || layout.logo === "top-center") && (
        <div style={{ height: 13, display: "flex", alignItems: "center", justifyContent: "center", background: layout.logo === "top-center" ? layout.pageBg : colors.primary }}>{logo(8)}</div>
      )}
      {layout.nav !== "none" && nav}
      {hero}
      <div style={{ padding: "4px 6px", display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
        <div style={{ width: "70%", height: 3, borderRadius: 1, background: line }} />
        <div style={{ width: "100%", height: 10, borderRadius: 2, background: sectionBg, border: `1px solid ${line}` }} />
      </div>
    </div>
  );
}
