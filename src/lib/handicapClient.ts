import { supabase } from "@/integrations/supabase/client";
export type GhinLookup =
  | { status: "ok"; index: number; lowIndex: number | null }
  | { status: "pending" | "not_found" | "error"; message: string };
export interface SyncSummary { total: number; updated: number; manualRemaining: number; failed: number; pending: boolean; errors: { player: string; message: string }[]; message: string }

async function authed(path: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(path, {
    ...init,
    headers: { ...(init.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok && !body?.status) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
}

export const lookupGhin = (ghinId: string, lastName?: string): Promise<GhinLookup> =>
  authed(`/api/ghin/lookup?${new URLSearchParams({ ghinId, lastName: lastName || "" })}`);

export const syncEventHandicaps = (eventId: string): Promise<SyncSummary> =>
  authed(`/api/ghin/sync-event/${eventId}`, { method: "POST" });

export const syncLeagueHandicaps = (leagueId: string): Promise<SyncSummary> =>
  authed(`/api/ghin/sync-league/${leagueId}`, { method: "POST" });

export const syncAllHandicaps = (): Promise<{ events: number; leagues: number; updated: number; pending: boolean }> =>
  authed(`/api/ghin/sync-all`, { method: "POST" });
