import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { parseEnterpriseSettings, type EnterpriseSettings } from "@/lib/enterprise";

export interface EnterpriseEventLite {
  id: string;
  title: string;
  date: string | null;
  course_name: string | null;
  course_par: number | null;
  hole_pars: number[] | null;
  slug: string | null;
  status: string;
  site_logo_url: string | null;
  site_primary_color: string | null;
  site_secondary_color: string | null;
  max_players: number | null;
  registration_fee_cents: number | null;
  registration_close_at: string | null;
  enterprise_settings: unknown;
}

const COLS =
  "id, title, date, course_name, course_par, hole_pars, slug, status, site_logo_url, site_primary_color, site_secondary_color, max_players, registration_fee_cents, registration_close_at, enterprise_settings";

/**
 * Resolve the enterprise event a settings screen is working on: the
 * `tournament_id` query param when present, otherwise the newest enterprise
 * event for the organization.
 */
export function useEnterpriseEvent() {
  const { org } = useOrgContext();
  const [params, setParams] = useSearchParams();
  const paramId = params.get("tournament_id");
  const [events, setEvents] = useState<EnterpriseEventLite[]>([]);
  const [event, setEvent] = useState<EnterpriseEventLite | null>(null);
  const [settings, setSettings] = useState<EnterpriseSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!org) return;
    setLoading(true);
    (supabase.from("tournaments") as any)
      .select(COLS)
      .eq("organization_id", org.orgId)
      .eq("is_enterprise", true)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => {
        const rows = (data || []) as EnterpriseEventLite[];
        setEvents(rows);
        const picked = rows.find((r) => r.id === paramId) || rows[0] || null;
        setEvent(picked);
        setSettings(picked ? parseEnterpriseSettings(picked.enterprise_settings) : null);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org, paramId, reloadKey]);

  const selectEvent = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("tournament_id", id);
    setParams(next, { replace: true });
  };

  /** Persist a settings patch back onto the event. */
  const saveSettings = async (patch: Partial<EnterpriseSettings>, columns: Record<string, unknown> = {}) => {
    if (!event || !settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    await (supabase.from("tournaments") as any)
      .update({ enterprise_settings: next as unknown as Record<string, unknown>, ...columns })
      .eq("id", event.id);
  };

  return { org, events, event, settings, setSettings, loading, selectEvent, saveSettings, refresh: () => setReloadKey((k) => k + 1) };
}
