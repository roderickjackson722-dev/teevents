import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Download, Loader2, Save } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { openPrintWindow, downloadHtmlAsPdf, getFontImport, cartSignCss, printLogoHtml } from "./printUtils";
import { PRINT_TARGETS } from "./printLayout";
import PrintFitCheck from "./PrintFitCheck";
import PrintLogo from "./PrintLogo";
import type { Tournament, Registration } from "./types";
import { getPrimaryColor, getPrintLogo } from "./types";
import PrintableSettings, { getDefaultOptions, type PrintableOptions } from "./PrintableSettings";
import { buildTeams, splitCarts, type RegistrationGroupRow } from "./teamGrouping";
import ScorecardSelector from "./ScorecardSelector";


interface Props {
  tournament: Tournament | null;
  registrations: Registration[];
  loading: boolean;
  groups?: RegistrationGroupRow[];
  onGroupsChanged?: () => void;
}

type CartNames = { cart1: string[]; cart2: string[] };

const FONT_MAP: Record<string, string> = {
  georgia: "'Georgia', serif",
  helvetica: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  playfair: "'Playfair Display', Georgia, serif",
  roboto: "'Roboto', 'Helvetica Neue', sans-serif",
  courier: "'Courier New', Courier, monospace",
};

/** Format an HH:MM (or free text) tee time for display */
export function formatTeeTime(value?: string | null): string {
  if (!value) return "";
  const m = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!m) return value.trim();
  let h = parseInt(m[1], 10);
  const mm = m[2];
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 === 0 ? 12 : h % 12;
  return `${h}:${mm} ${suffix}`;
}

/** One cart sign — classic centered layout with the two cart players stacked */
function cartSignHtml(
  names: string[],
  tournament: Tournament | null,
  opts: PrintableOptions,
  groupNumber: number | null,
  teeTime?: string | null,
) {
  const color = getPrimaryColor(tournament);
  const font = FONT_MAP[opts.font] || FONT_MAP.georgia;
  const layout = opts.layout;
  const logo = getPrintLogo(tournament);

  const borderStyle = layout === "bold" ? `3px solid ${color}` : layout === "modern" ? `1px solid #e0e0e0` : `2px solid ${color}`;
  const bgStyle = layout === "bold" ? `background:${color};` : "";
  const nameColor = layout === "bold" ? "#fff" : "#1a1a1a";
  const subtitleColor = layout === "bold" ? "rgba(255,255,255,0.7)" : "#666";
  const accentColor = layout === "bold" ? "rgba(255,255,255,0.9)" : color;

  const nameLines = names
    .map((n) => `<div style="font-size:150px;line-height:1.15;font-weight:bold;color:${nameColor};">${n}</div>`)
    .join("");

  return `
    <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;border:${borderStyle};border-radius:16px;padding:0.3in;text-align:center;font-family:${font};${bgStyle}">
      ${opts.showLogo ? `<div style="margin-bottom:0.15in;">${printLogoHtml(logo, { heightCss: "1.3in", invert: layout === "bold", color: subtitleColor })}</div>` : ""}
      ${opts.showTournamentTitle ? `<div style="font-size:44px;font-weight:600;color:${subtitleColor};letter-spacing:6px;text-transform:uppercase;margin-bottom:0.1in;">${tournament?.title ?? ""}</div>` : ""}
      ${nameLines}
      ${opts.showTeeTime && formatTeeTime(teeTime) ? `<div style="font-size:56px;color:${accentColor};font-weight:700;margin-top:0.12in;">Tee Time: ${formatTeeTime(teeTime)}</div>` : ""}
      ${opts.showStartingHole && groupNumber != null ? `<div style="font-size:48px;color:${accentColor};font-weight:600;margin-top:0.12in;">Starting Hole: ${groupNumber}</div>` : ""}
    </div>`;
}

export default function CartSignsTab({ tournament, registrations, loading, groups = [], onGroupsChanged }: Props) {
  const [opts, setOpts] = useState<PrintableOptions>(() => getDefaultOptions(tournament));
  const [edits, setEdits] = useState<Record<string, CartNames>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedSigns, setSelectedSigns] = useState<string[]>([]);
  const [teeEdits, setTeeEdits] = useState<Record<string, string>>({});


  const teams = useMemo(() => buildTeams(registrations, groups), [registrations, groups]);

  // Seed editable names from saved overrides or the roster order
  useEffect(() => {
    const next: Record<string, CartNames> = {};
    teams.forEach((t) => {
      const saved = groups.find((g) => g.id === t.groupId)?.cart_sign_names || null;
      const split = splitCarts(t, saved);
      next[t.key] = {
        cart1: [split.cart1[0] ?? "", split.cart1[1] ?? ""],
        cart2: [split.cart2[0] ?? "", split.cart2[1] ?? ""],
      };
    });
    setEdits(next);
    const tee: Record<string, string> = {};
    teams.forEach((t) => { tee[t.key] = (t.teeTime || "").slice(0, 5); });
    setTeeEdits(tee);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(teams.map((t) => t.key)), JSON.stringify(groups)]);

  const fontImport = getFontImport(opts.font);
  const fitOptions = { scale: opts.printScale, marginIn: opts.printMarginIn };
  const pageCss = cartSignCss(fitOptions);

  const cartsFor = (key: string): { label: string; names: string[] }[] => {
    const e = edits[key] || { cart1: ["", ""], cart2: ["", ""] };
    const c1 = e.cart1.filter((n) => n.trim());
    const c2 = e.cart2.filter((n) => n.trim());
    const out: { label: string; names: string[] }[] = [];
    if (c1.length) out.push({ label: "Cart 1", names: c1 });
    if (c2.length) out.push({ label: "Cart 2", names: c2 });
    return out;
  };

  /** Flat list of every printable cart sign (hole + cart + names) */
  const allSigns = teams.flatMap((t) =>
    cartsFor(t.key).map((c) => ({
      key: `${t.key}|${c.label}`,
      hole: t.groupNumber,
      label: `${t.groupNumber != null ? `Hole ${t.groupNumber}` : "Unassigned"} – ${c.label}: ${c.names.join(" & ")}`,
      names: c.names,
      groupNumber: t.groupNumber,
      teeTime: teeEdits[t.key] ?? t.teeTime ?? null,
    })),
  );

  const signKeysJson = JSON.stringify(allSigns.map((s) => s.key));
  useEffect(() => {
    setSelectedSigns(JSON.parse(signKeysJson) as string[]);
  }, [signKeysJson]);

  const selectedSignSet = new Set(selectedSigns);
  const printSigns = allSigns.filter((s) => selectedSignSet.has(s.key));

  const buildHtml = (signs: typeof allSigns) =>
    signs
      .map((s) => cartSignHtml(s.names, tournament, opts, s.groupNumber, s.teeTime))
      .map((html, i, arr) => `<div class="print-page" style="page-break-after:${i < arr.length - 1 ? "always" : "auto"};">${html}</div>`)
      .join("");

  const allHtml = buildHtml(printSigns);


  const saveNames = async (key: string) => {
    const team = teams.find((t) => t.key === key);
    if (!team || !tournament) return;
    const e = edits[key];
    const payload = { cart1: e.cart1.filter((n) => n.trim()), cart2: e.cart2.filter((n) => n.trim()) };
    const teeTime = (teeEdits[key] || "").trim() || null;
    setSaving(key);
    let error: any = null;
    if (team.groupId) {
      ({ error } = await (supabase.from("registration_groups") as any).update({ cart_sign_names: payload, tee_time: teeTime }).eq("id", team.groupId));
    } else if (team.groupNumber != null) {
      ({ error } = await (supabase.from("registration_groups") as any).insert({
        tournament_id: tournament.id,
        group_number: team.groupNumber,
        cart_sign_names: payload,
        tee_time: teeTime,
      }));
    } else {
      // Solo player with no pairing — keep names local only
      setSaving(null);
      toast.success("Cart names updated for this print run");
      return;
    }
    setSaving(null);
    if (error) toast.error("Could not save cart sign names");
    else {
      toast.success("Cart sign saved");
      onGroupsChanged?.();
    }
  };

  const updateName = (key: string, cart: "cart1" | "cart2", idx: number, value: string) => {
    setEdits((prev) => {
      const cur = prev[key] || { cart1: ["", ""], cart2: ["", ""] };
      const arr = [...cur[cart]];
      arr[idx] = value;
      return { ...prev, [key]: { ...cur, [cart]: arr } };
    });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (registrations.length === 0) return <div className="text-center py-12 bg-card rounded-lg border border-border"><p className="text-muted-foreground">No registered players yet.</p></div>;

  return (
    <>
      <PrintableSettings
        options={opts}
        onChange={setOpts}
        variant="cartsign"
        showTeeTimeToggle
        tournamentId={tournament?.id}
        logoUrl={getPrintLogo(tournament)}
      />

      <ScorecardSelector
        title="Print Cart Signs"
        items={allSigns.map((s) => ({ key: s.key, label: s.label, hole: s.hole }))}
        selected={selectedSigns}
        onChange={setSelectedSigns}
      />

      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <p className="text-xs text-muted-foreground">
          {printSigns.length} of {allSigns.length} cart signs selected &bull; two players per cart &bull; prints at 8&quot; H &times; 36&quot; W (landscape) &bull; scale {Math.round((opts.printScale ?? 1) * 100)}% &bull; {opts.printMarginIn ?? 0.25}&quot; margins
        </p>
        <div className="flex gap-2 items-start">
          <PrintFitCheck getBodyHtml={() => allHtml} target={PRINT_TARGETS.cartsign} fitOptions={fitOptions} />
          <Button variant="outline" disabled={printSigns.length === 0} onClick={() => downloadHtmlAsPdf(`Cart Signs - ${tournament?.title}`, allHtml, fontImport, pageCss)}>
            <Download className="h-4 w-4 mr-2" /> Save as PDF
          </Button>
          <Button disabled={printSigns.length === 0} onClick={() => openPrintWindow(`Cart Signs - ${tournament?.title}`, allHtml, fontImport, pageCss)}>
            <Printer className="h-4 w-4 mr-2" /> Print Selected Cart Signs
          </Button>
        </div>
      </div>


      <div className="space-y-4">
        {teams.map((t) => {
          const e = edits[t.key] || { cart1: ["", ""], cart2: ["", ""] };
          const carts = cartsFor(t.key);
          const logo = getPrintLogo(tournament);
          return (
            <motion.div key={t.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-4 space-y-4">

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground">
                  Team: {t.teamName} <span className="text-muted-foreground font-normal">({t.players.length} player{t.players.length === 1 ? "" : "s"})</span>
                </p>
                <Button size="sm" variant="outline" onClick={() => saveNames(t.key)} disabled={saving === t.key} className="gap-1">
                  {saving === t.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save Sign
                </Button>
              </div>

              {opts.showTeeTime && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Tee time (shown on the sign):</p>
                  <Input
                    type="time"
                    value={teeEdits[t.key] ?? ""}
                    onChange={(ev) => setTeeEdits((prev) => ({ ...prev, [t.key]: ev.target.value }))}
                    className="text-sm w-40"
                  />
                </div>
              )}

              {(["cart1", "cart2"] as const).map((cart, ci) => (
                <div key={cart} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Cart {ci + 1}:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={e[cart][0] ?? ""} onChange={(ev) => updateName(t.key, cart, 0, ev.target.value)} placeholder="Player 1 name" className="text-sm" />
                    <Input value={e[cart][1] ?? ""} onChange={(ev) => updateName(t.key, cart, 1, ev.target.value)} placeholder="Player 2 name" className="text-sm" />
                  </div>
                </div>
              ))}

              {/* Previews — one per cart, matching the printed classic layout */}
              {carts.length === 0 ? (
                <p className="text-xs text-muted-foreground">Add at least one name to generate a cart sign.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {carts.map((c) => (
                    <div key={c.label} className="bg-card border-2 border-primary/30 rounded-xl p-6 flex flex-col items-center text-center gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{c.label}</p>
                      {opts.showLogo && <PrintLogo src={logo} placeholderWhenMissing className="h-10" />}
                      {opts.showTournamentTitle && (
                        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">{tournament?.title}</p>
                      )}
                      {c.names.map((n, i) => (
                        <p key={i} className="text-xl font-display font-bold text-foreground leading-tight">{n}</p>
                      ))}
                      {opts.showTeeTime && formatTeeTime(teeEdits[t.key] ?? t.teeTime) && (
                        <p className="text-sm font-bold text-primary">Tee Time: {formatTeeTime(teeEdits[t.key] ?? t.teeTime)}</p>
                      )}
                      {opts.showStartingHole && t.groupNumber != null && (
                        <p className="text-sm font-semibold text-primary">Starting Hole: {t.groupNumber}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
