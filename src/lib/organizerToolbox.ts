import { supabase } from "@/integrations/supabase/client";

export const TOOLBOX_BUCKET = "organizer-toolbox";

export type ToolboxFile = { path: string; name: string; type?: string; label?: string };
export type Toolbox = {
  id?: string;
  organization_id: string;
  logo: ToolboxFile | null;
  brand_colors: { primary?: string; secondary?: string; accent?: string };
  hero_image: ToolboxFile | null;
  sponsor_logos: ToolboxFile[];
  documents: ToolboxFile[];
  gallery: ToolboxFile[];
  additional_notes: string | null;
  anything_else: string | null;
  onboarding_seen_at: string | null;
  reviewed_at: string | null;
  updated_at?: string;
  created_at?: string;
};

export const emptyToolbox = (orgId: string): Toolbox => ({
  organization_id: orgId, logo: null, brand_colors: {}, hero_image: null,
  sponsor_logos: [], documents: [], gallery: [], additional_notes: null,
  anything_else: null, onboarding_seen_at: null, reviewed_at: null,
});

export async function loadToolbox(orgId: string): Promise<Toolbox | null> {
  const { data } = await (supabase as any).from("organizer_toolboxes").select("*").eq("organization_id", orgId).maybeSingle();
  return (data as Toolbox) ?? null;
}

/** Number of the 7 sections that have something in them. */
export function sectionsComplete(t: Toolbox | null) {
  if (!t) return 0;
  const c = t.brand_colors || {};
  return [
    !!t.logo, !!(c.primary || c.secondary || c.accent), !!t.hero_image,
    t.sponsor_logos?.length > 0, t.documents?.length > 0, t.gallery?.length > 0,
    !!(t.additional_notes?.trim() || t.anything_else?.trim()),
  ].filter(Boolean).length;
}

/** Total uploaded items (files, colors set, notes). */
export function itemCount(t: Toolbox | null) {
  if (!t) return 0;
  const c = t.brand_colors || {};
  return (t.logo ? 1 : 0) + (t.hero_image ? 1 : 0) + (t.sponsor_logos?.length || 0) + (t.documents?.length || 0)
    + (t.gallery?.length || 0) + ((c.primary || c.secondary || c.accent) ? 1 : 0)
    + (t.additional_notes?.trim() ? 1 : 0) + (t.anything_else?.trim() ? 1 : 0);
}

export async function signedUrl(path: string) {
  const { data } = await supabase.storage.from(TOOLBOX_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
