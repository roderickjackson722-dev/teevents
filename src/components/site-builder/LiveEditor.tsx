import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, ArrowUpLeft, Bold, EyeOff, Italic, RotateCcw, Underline, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import {
  EDIT_FONTS, cleanElementEdits, isTextLeaf, selectorFor,
  type ElementEdit, type ElementEdits, type ElementStyle,
} from "@/lib/liveEdits";
import {
  DESIGN_FIELDS, cleanOverrides, designSnapshot, pushDesignHistory, snapshotPatch,
  type DesignSnapshot, type StyleOverrides,
} from "@/lib/siteStyleOverrides";

interface Props {
  tournamentId: string;
  root: HTMLElement | null;
  overrides: unknown;
  onOverridesChange: (next: StyleOverrides) => void;
}

const toHex = (c: string): string => {
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
  if (!m) return "#ffffff";
  if (m[4] !== undefined && Number(m[4]) === 0) return "#ffffff";
  return "#" + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
};

const describe = (el: Element) => {
  const tag = el.tagName.toLowerCase();
  if (tag === "img") return "Image";
  if (/^h[1-6]$/.test(tag)) return "Heading";
  if (tag === "button" || el.hasAttribute("data-tv-btn")) return "Button";
  if (tag === "a") return "Link";
  if (tag === "p") return "Paragraph";
  if (tag === "section") return "Section";
  if (tag === "nav") return "Menu";
  if (tag === "footer") return "Footer";
  if (tag === "label") return "Label";
  return isTextLeaf(el) ? "Text" : "Area";
};

/** On-page editor: click any part of the public page to change it; saves as you go. */
export function LiveEditor({ tournamentId, root, overrides, onOverridesChange }: Props) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [row, setRow] = useState<Record<string, any> | null>(null);
  const [selected, setSelected] = useState<{ el: Element; sel: string } | null>(null);
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const [panelOpen, setPanelOpen] = useState(true);
  const saveTimer = useRef<number | null>(null);
  const pending = useRef<StyleOverrides | null>(null);
  const rowRef = useRef(row);
  rowRef.current = row;

  // Only signed-in organizers of this event (or admins) can edit.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { if (!cancelled) setAllowed(false); return; }
      const fields = [...DESIGN_FIELDS, "site_design_history", "site_design_original", "organization_id"].join(",");
      const { data } = await supabase.from("tournaments").select(fields).eq("id", tournamentId).maybeSingle();
      if (!data) { if (!cancelled) setAllowed(false); return; }
      const d = data as Record<string, any>;
      const [{ data: isAdmin }, { data: member }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" }),
        supabase.from("org_members").select("id").eq("organization_id", d.organization_id).eq("user_id", session.user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setRow(d);
      setAllowed(!!isAdmin || !!member);
    })();
    return () => { cancelled = true; };
  }, [tournamentId]);

  const edits = cleanElementEdits(cleanOverrides(overrides).elements);

  const flush = useCallback(async () => {
    const next = pending.current;
    const current = rowRef.current;
    if (!next || !current) return;
    pending.current = null;
    setStatus("saving");
    const nextRow = { ...current, site_style_overrides: next };
    const history = pushDesignHistory(current.site_design_history, current, nextRow);
    const original = current.site_design_original ?? designSnapshot(current);
    const { data, error } = await supabase
      .from("tournaments")
      .update({ site_style_overrides: next, site_design_history: history, site_design_original: original } as any)
      .eq("id", tournamentId)
      .select("id");
    if (error || !data?.length) { setStatus("error"); toast.error("Could not save this change", { description: error?.message }); return; }
    setRow({ ...nextRow, site_design_history: history, site_design_original: original });
    setStatus("saved");
  }, [tournamentId]);

  const commit = (nextEdits: ElementEdits) => {
    const base = cleanOverrides(overrides);
    const next: StyleOverrides = { ...base, elements: nextEdits };
    if (!Object.keys(nextEdits).length) delete next.elements;
    onOverridesChange(next);
    pending.current = next;
    setStatus("saving");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void flush(), 700);
  };

  useEffect(() => () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); void flush(); }, [flush]);

  // Click-to-select, hover outline, and block page actions while editing.
  useEffect(() => {
    if (!allowed || !root) return;
    root.setAttribute("data-tv-editing", "");
    let hovered: Element | null = null;
    const inRoot = (t: EventTarget | null): t is Element => t instanceof Element && root.contains(t);
    const over = (e: MouseEvent) => {
      if (!inRoot(e.target)) return;
      hovered?.removeAttribute("data-tv-hover");
      hovered = e.target;
      hovered.setAttribute("data-tv-hover", "");
    };
    const click = (e: MouseEvent) => {
      if (!inRoot(e.target)) return;
      e.preventDefault(); e.stopPropagation();
      const sel = selectorFor(e.target, root);
      if (!sel) return;
      setSelected({ el: e.target, sel });
      setPanelOpen(true);
    };
    const submit = (e: Event) => { if (inRoot(e.target)) { e.preventDefault(); e.stopPropagation(); } };
    window.addEventListener("mouseover", over, true);
    window.addEventListener("click", click, true);
    window.addEventListener("submit", submit, true);
    return () => {
      root.removeAttribute("data-tv-editing");
      hovered?.removeAttribute("data-tv-hover");
      window.removeEventListener("mouseover", over, true);
      window.removeEventListener("click", click, true);
      window.removeEventListener("submit", submit, true);
    };
  }, [allowed, root]);

  useEffect(() => {
    if (!selected) return;
    selected.el.setAttribute("data-tv-selected", "");
    return () => selected.el.removeAttribute("data-tv-selected");
  }, [selected]);

  const writeDesign = async (patch: Record<string, unknown>, history: DesignSnapshot[], message: string) => {
    if (!row) return;
    setStatus("saving");
    const original = row.site_design_original ?? designSnapshot(row);
    const { error } = await supabase.from("tournaments")
      .update({ ...patch, site_design_history: history, site_design_original: original } as any)
      .eq("id", tournamentId);
    if (error) { setStatus("error"); toast.error("Could not change the design", { description: error.message }); return; }
    toast.success(message);
    window.location.reload();
  };
  const history: DesignSnapshot[] = Array.isArray(row?.site_design_history) ? row!.site_design_history : [];
  const undo = () => { const last = history[history.length - 1]; if (last) void writeDesign(snapshotPatch(last), history.slice(0, -1), "Change undone"); };
  const reset = () => {
    if (!row?.site_design_original) return;
    if (!confirm("Go back to this event's original design? You can still use Undo afterward.")) return;
    void writeDesign(snapshotPatch(row.site_design_original), pushDesignHistory(history, row, snapshotPatch(row.site_design_original)), "Original design restored");
  };
  const done = () => {
    void flush();
    const url = new URL(window.location.href);
    url.searchParams.delete("edit");
    window.location.href = url.toString();
  };

  if (allowed === null) return null;
  if (!allowed) {
    return createPortal(
      <div className="fixed top-0 inset-x-0 z-[100] bg-muted text-foreground text-center text-sm px-3 py-2 border-b border-border">
        Sign in as this event's organizer to edit the page.
      </div>, document.body);
  }

  const edit: ElementEdit = selected ? edits[selected.sel] ?? {} : {};
  const style: ElementStyle = edit.style ?? {};
  const computed = selected ? getComputedStyle(selected.el) : null;
  const update = (patch: Partial<ElementEdit>) => {
    if (!selected) return;
    const nextEdit: ElementEdit = { ...edit, ...patch };
    const next = { ...edits, [selected.sel]: nextEdit };
    commit(cleanElementEdits(next));
  };
  const setStyle = (patch: Partial<ElementStyle>) => {
    const s = { ...style, ...patch } as Record<string, unknown>;
    for (const k of Object.keys(s)) if (s[k] === undefined || s[k] === "") delete s[k];
    update({ style: s as ElementStyle });
  };
  const resetElement = () => {
    if (!selected) return;
    const next = { ...edits }; delete next[selected.sel];
    commit(next);
    if (edit.text !== undefined || edit.src) toast.message("Original words and images return when the page reloads.");
  };
  const selectParent = () => {
    if (!selected || !root) return;
    const p = selected.el.parentElement;
    if (!p || p === root || !root.contains(p)) return;
    const sel = selectorFor(p, root);
    if (sel) setSelected({ el: p, sel });
  };

  const isImg = selected?.el instanceof HTMLImageElement;
  const canText = selected ? isTextLeaf(selected.el) : false;

  const uploadImage = async (file: File) => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${tournamentId}/live-edit-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("tournament-assets").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed", { description: error.message }); return; }
    const { data } = supabase.storage.from("tournament-assets").getPublicUrl(path);
    update({ src: data.publicUrl });
    if (selected?.el instanceof HTMLImageElement) selected.el.src = data.publicUrl;
  };

  const colorField = (label: string, key: "color" | "backgroundColor" | "borderColor", fallback: string) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2 mt-1">
        <input type="color" aria-label={label} value={style[key] || toHex(fallback)} onChange={(e) => setStyle({ [key]: e.target.value })} className="w-9 h-9 rounded border border-border cursor-pointer shrink-0" />
        <Input className="h-9 text-xs" value={style[key] || ""} placeholder="Original" onChange={(e) => { const t = e.target.value.trim(); if (!t) setStyle({ [key]: undefined }); else if (/^#[0-9a-f]{6}$/i.test(t)) setStyle({ [key]: t }); }} />
      </div>
    </div>
  );
  const numField = (label: string, key: keyof ElementStyle, fallback: number, min: number, max: number, step = 1) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" className="h-9 text-xs mt-1" min={min} max={max} step={step}
        value={(style[key] as number | undefined) ?? ""} placeholder={String(Math.round(fallback * 100) / 100)}
        onChange={(e) => setStyle({ [key]: e.target.value === "" ? undefined : Number(e.target.value) } as Partial<ElementStyle>)} />
    </div>
  );
  const toggle = (active: boolean, label: string, icon: React.ReactNode, onClick: () => void) => (
    <Button type="button" size="sm" variant={active ? "default" : "outline"} aria-label={label} title={label} onClick={onClick} className="h-9 w-9 p-0">{icon}</Button>
  );

  return createPortal(
    <>
      <style>{`.tv-public[data-tv-editing] [data-tv-hover]{outline:2px dashed var(--ring)!important;outline-offset:2px;cursor:pointer}.tv-public[data-tv-editing] [data-tv-selected]{outline:3px solid var(--ring)!important;outline-offset:2px}.tv-public[data-tv-editing]{padding-top:52px}`}</style>
      <div className="fixed top-0 inset-x-0 z-[100] bg-card text-card-foreground border-b border-border shadow-sm">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          <span className="text-sm font-semibold">Editing live page</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">Click anything on the page to change it. Changes save as you go.</span>
          <span className="ml-auto text-xs text-muted-foreground">{status === "saving" ? "Saving…" : status === "error" ? "Not saved" : "All changes saved"}</span>
          <Button size="sm" variant="outline" disabled={!history.length || status === "saving"} onClick={undo}><Undo2 className="h-3.5 w-3.5 mr-1" />Undo</Button>
          <Button size="sm" variant="ghost" disabled={!row?.site_design_original || status === "saving"} onClick={reset}><RotateCcw className="h-3.5 w-3.5 mr-1" />Reset to Original</Button>
          <Button size="sm" onClick={done}>Done</Button>
        </div>
      </div>
      {selected && panelOpen && computed && (
        <aside className="fixed z-[100] right-2 top-14 bottom-2 w-[min(340px,calc(100vw-1rem))] overflow-y-auto rounded-lg border border-border bg-card text-card-foreground shadow-xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm">{describe(selected.el)}</h2>
            <Button size="sm" variant="ghost" className="ml-auto h-8 px-2 text-xs" onClick={selectParent}><ArrowUpLeft className="h-3.5 w-3.5 mr-1" />Select bigger area</Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Close" onClick={() => setSelected(null)}><X className="h-4 w-4" /></Button>
          </div>

          {canText && (
            <div>
              <Label className="text-xs">Words</Label>
              <Textarea className="mt-1 text-sm" rows={3} value={edit.text ?? selected.el.textContent ?? ""}
                onChange={(e) => { update({ text: e.target.value }); selected.el.textContent = e.target.value; }} />
            </div>
          )}

          {isImg && (
            <div className="space-y-2">
              <Label className="text-xs">Image</Label>
              <Input type="file" accept="image/*" className="text-xs" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadImage(f); }} />
              <Input className="h-9 text-xs" placeholder="Or paste an https:// image link" defaultValue={edit.src ?? ""}
                onBlur={(e) => { const v = e.target.value.trim(); if (/^https:\/\//i.test(v)) { update({ src: v }); (selected.el as HTMLImageElement).src = v; } }} />
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            {colorField("Text color", "color", computed.color)}
            {colorField("Background color", "backgroundColor", computed.backgroundColor)}
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Font</Label>
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={style.fontFamily ?? ""}
                onChange={(e) => setStyle({ fontFamily: e.target.value || undefined })}>
                <option value="">Original</option>
                {EDIT_FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {numField("Text size (px)", "fontSize", parseFloat(computed.fontSize), 8, 160)}
              <div>
                <Label className="text-xs">Thickness</Label>
                <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={style.fontWeight ?? ""}
                  onChange={(e) => setStyle({ fontWeight: e.target.value ? Number(e.target.value) : undefined })}>
                  <option value="">Original</option>
                  {[300, 400, 500, 600, 700, 800, 900].map((w) => <option key={w} value={w}>{w === 400 ? "Regular" : w === 700 ? "Bold" : w}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {toggle(style.fontWeight === 700, "Bold", <Bold className="h-4 w-4" />, () => setStyle({ fontWeight: style.fontWeight === 700 ? undefined : 700 }))}
              {toggle(style.fontStyle === "italic", "Italic", <Italic className="h-4 w-4" />, () => setStyle({ fontStyle: style.fontStyle === "italic" ? undefined : "italic" }))}
              {toggle(style.textDecoration === "underline", "Underline", <Underline className="h-4 w-4" />, () => setStyle({ textDecoration: style.textDecoration === "underline" ? undefined : "underline" }))}
              <span className="w-2" />
              {toggle(style.textAlign === "left", "Align left", <AlignLeft className="h-4 w-4" />, () => setStyle({ textAlign: style.textAlign === "left" ? undefined : "left" }))}
              {toggle(style.textAlign === "center", "Center", <AlignCenter className="h-4 w-4" />, () => setStyle({ textAlign: style.textAlign === "center" ? undefined : "center" }))}
              {toggle(style.textAlign === "right", "Align right", <AlignRight className="h-4 w-4" />, () => setStyle({ textAlign: style.textAlign === "right" ? undefined : "right" }))}
              {toggle(style.textAlign === "justify", "Justify", <AlignJustify className="h-4 w-4" />, () => setStyle({ textAlign: style.textAlign === "justify" ? undefined : "justify" }))}
            </div>
            <div>
              <Label className="text-xs">Letters</Label>
              <select className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={style.textTransform ?? ""}
                onChange={(e) => setStyle({ textTransform: (e.target.value || undefined) as ElementStyle["textTransform"] })}>
                <option value="">Original</option><option value="none">As typed</option><option value="uppercase">ALL CAPS</option>
                <option value="lowercase">lowercase</option><option value="capitalize">Each Word Capitalized</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {numField("Letter spacing (px)", "letterSpacing", parseFloat(computed.letterSpacing) || 0, -5, 30, 0.5)}
              {numField("Line spacing", "lineHeight", 1.5, 0.8, 3, 0.1)}
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-3">
            <div className="grid grid-cols-2 gap-3">
              {numField("Inner space (px)", "padding", parseFloat(computed.paddingTop) || 0, 0, 120)}
              {numField("Rounded corners (px)", "borderRadius", parseFloat(computed.borderTopLeftRadius) || 0, 0, 200)}
              {numField("Border width (px)", "borderWidth", parseFloat(computed.borderTopWidth) || 0, 0, 20)}
              {numField("See-through (0–1)", "opacity", Number(computed.opacity), 0, 1, 0.05)}
            </div>
            {colorField("Border color", "borderColor", computed.borderTopColor)}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <Button size="sm" variant="outline" onClick={() => update({ hidden: edit.hidden ? undefined : true })}>
              <EyeOff className="h-3.5 w-3.5 mr-1" />{edit.hidden ? "Show on page" : "Hide from page"}
            </Button>
            <Button size="sm" variant="ghost" onClick={resetElement}><RotateCcw className="h-3.5 w-3.5 mr-1" />Reset this part</Button>
          </div>
        </aside>
      )}
    </>,
    document.body,
  );
}
