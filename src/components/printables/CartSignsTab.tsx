import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Download, Loader2, Save, Car } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { openPrintWindow, downloadHtmlAsPdf, getFontImport, CART_SIGN_PAGE_CSS } from "./printUtils";
import type { Tournament, Registration } from "./types";
import { getPrimaryColor } from "./types";
import PrintableSettings, { getDefaultOptions, type PrintableOptions } from "./PrintableSettings";
import { buildTeams, splitCarts, type RegistrationGroupRow } from "./teamGrouping";

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

/** One 36" x 8" landscape cart sign */
function cartSignHtml(
  names: string[],
  cartLabel: string,
  teamName: string,
  tournament: Tournament | null,
  opts: PrintableOptions,
  groupNumber: number | null,
) {
  const color = getPrimaryColor(tournament);
  const font = FONT_MAP[opts.font] || FONT_MAP.georgia;
  const layout = opts.layout;

  const borderStyle = layout === "bold" ? `6px solid ${color}` : layout === "modern" ? `2px solid #e0e0e0` : `4px solid ${color}`;
  const bgStyle = layout === "bold" ? `background:${color};` : "";
  const nameColor = layout === "bold" ? "#fff" : "#1a1a1a";
  const subtitleColor = layout === "bold" ? "rgba(255,255,255,0.8)" : "#666";
  const accentColor = layout === "bold" ? "rgba(255,255,255,0.95)" : color;

  const nameBlocks = names
    .map((n) => `<div style="flex:1;font-size:${names.length > 1 ? "120px" : "150px"};line-height:1.05;font-weight:bold;color:${nameColor};text-align:center;">${n}</div>`)
    .join(`<div style="width:4px;height:60%;background:${accentColor};opacity:0.35;"></div>`);

  return `
    <div style="width:35.5in;height:7.5in;display:flex;flex-direction:column;border:${borderStyle};border-radius:24px;padding:0.4in 0.6in;font-family:${font};${bgStyle}">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:24px;">
        <div style="text-align:left;">
          ${opts.showTournamentTitle ? `<div style="font-size:34px;font-weight:600;color:${subtitleColor};letter-spacing:4px;text-transform:uppercase;">${tournament?.title ?? ""}</div>` : ""}
          <div style="font-size:40px;font-weight:700;color:${accentColor};">${teamName} &bull; ${cartLabel}</div>
        </div>
        ${opts.showLogo && tournament?.site_logo_url ? `<img src="${tournament.site_logo_url}" alt="" style="height:1.1in;object-fit:contain;${layout === "bold" ? "filter:brightness(0) invert(1);" : ""}" />` : ""}
      </div>
      <div style="flex:1;display:flex;align-items:center;justify-content:space-around;gap:0.5in;">
        ${nameBlocks}
      </div>
      ${opts.showStartingHole && groupNumber != null ? `<div style="font-size:38px;color:${accentColor};font-weight:700;text-align:center;">Starting Hole: ${groupNumber}</div>` : ""}
    </div>`;
}

export default function CartSignsTab({ tournament, registrations, loading, groups = [], onGroupsChanged }: Props) {
  const [opts, setOpts] = useState<PrintableOptions>(() => getDefaultOptions(tournament));
  const [edits, setEdits] = useState<Record<string, CartNames>>({});
  const [saving, setSaving] = useState<string | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(teams.map((t) => t.key)), JSON.stringify(groups)]);

  const fontImport = getFontImport(opts.font);

  const cartsFor = (key: string): { label: string; names: string[] }[] => {
    const e = edits[key] || { cart1: ["", ""], cart2: ["", ""] };
    const c1 = e.cart1.filter((n) => n.trim());
    const c2 = e.cart2.filter((n) => n.trim());
    const out: { label: string; names: string[] }[] = [];
    if (c1.length) out.push({ label: "Cart 1", names: c1 });
    if (c2.length) out.push({ label: "Cart 2", names: c2 });
    return out;
  };

  const allHtml = teams
    .flatMap((t) => cartsFor(t.key).map((c) => cartSignHtml(c.names, c.label, t.teamName, tournament, opts, t.groupNumber)))
    .map((html, i, arr) => `<div style="page-break-after:${i < arr.length - 1 ? "always" : "auto"};">${html}</div>`)
    .join("");

  const saveNames = async (key: string) => {
    const team = teams.find((t) => t.key === key);
    if (!team || !tournament) return;
    const e = edits[key];
    const payload = { cart1: e.cart1.filter((n) => n.trim()), cart2: e.cart2.filter((n) => n.trim()) };
    setSaving(key);
    let error: any = null;
    if (team.groupId) {
      ({ error } = await (supabase.from("registration_groups") as any).update({ cart_sign_names: payload }).eq("id", team.groupId));
    } else if (team.groupNumber != null) {
      ({ error } = await (supabase.from("registration_groups") as any).insert({
        tournament_id: tournament.id,
        group_number: team.groupNumber,
        cart_sign_names: payload,
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
      toast.success("Cart sign names saved");
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
      <PrintableSettings options={opts} onChange={setOpts} />

      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <p className="text-xs text-muted-foreground">
          Two players per cart &bull; prints at 8&quot; H &times; 36&quot; W (landscape)
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadHtmlAsPdf(`Cart Signs - ${tournament?.title}`, allHtml, fontImport, CART_SIGN_PAGE_CSS)}>
            <Download className="h-4 w-4 mr-2" /> Save as PDF
          </Button>
          <Button onClick={() => openPrintWindow(`Cart Signs - ${tournament?.title}`, allHtml, fontImport, CART_SIGN_PAGE_CSS)}>
            <Printer className="h-4 w-4 mr-2" /> Generate Cart Signs
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {teams.map((t) => {
          const e = edits[t.key] || { cart1: ["", ""], cart2: ["", ""] };
          const carts = cartsFor(t.key);
          return (
            <motion.div key={t.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-4 space-y-4">

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground">
                  Team: {t.teamName} <span className="text-muted-foreground font-normal">({t.players.length} player{t.players.length === 1 ? "" : "s"})</span>
                </p>
                <Button size="sm" variant="outline" onClick={() => saveNames(t.key)} disabled={saving === t.key} className="gap-1">
                  {saving === t.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save Names
                </Button>
              </div>

              {(["cart1", "cart2"] as const).map((cart, ci) => (
                <div key={cart} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Cart {ci + 1}:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={e[cart][0] ?? ""} onChange={(ev) => updateName(t.key, cart, 0, ev.target.value)} placeholder="Player name" className="text-sm" />
                    <Input value={e[cart][1] ?? ""} onChange={(ev) => updateName(t.key, cart, 1, ev.target.value)} placeholder="Player name" className="text-sm" />
                  </div>
                </div>
              ))}

              {/* Preview */}
              <div className="rounded-lg border-2 border-primary/30 p-4 bg-muted/20">
                <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2 flex items-center gap-1">
                  <Car className="h-3.5 w-3.5" /> Cart Sign Preview
                </p>
                <p className="text-lg font-display font-bold text-foreground">{t.teamName}</p>
                {carts.length === 0 ? (
                  <p className="text-xs text-muted-foreground mt-2">Add at least one name to generate a cart sign.</p>
                ) : (
                  carts.map((c) => (
                    <div key={c.label} className="mt-3">
                      <p className="text-xs font-medium text-primary">{c.label}:</p>
                      <div className="flex flex-wrap gap-x-8 gap-y-1">
                        {c.names.map((n, i) => (
                          <span key={i} className="text-base font-semibold text-foreground">{n}</span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
                {opts.showStartingHole && t.groupNumber != null && (
                  <p className="text-xs text-primary mt-3">Starting Hole: {t.groupNumber}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
