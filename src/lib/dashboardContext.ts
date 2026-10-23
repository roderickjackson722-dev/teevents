/**
 * Sticky dashboard context (admin override org, sample org, selected
 * tournament) kept per browser tab. Any dashboard link that forgets to carry
 * `admin_org` / `tournament_id` used to drop the admin back into their own
 * organization, which then auto-picked a different (often empty) tournament.
 * DashboardLayout restores the remembered context before rendering a page.
 */

export const DASHBOARD_CONTEXT_KEY = "teevents:dashboardContext";
const ORG_KEYS = ["admin_org", "sample_org", "sample"] as const;

export type StoredDashboardContext = {
  admin_org?: string;
  sample_org?: string;
  sample?: string;
  tournament_id?: string;
  path?: string;
};

export function resolveDashboardContext(
  pathname: string,
  search: URLSearchParams,
  stored: StoredDashboardContext | null,
): { redirect: URLSearchParams | null; next: StoredDashboardContext } {
  const prev = stored || {};
  const next: StoredDashboardContext = { path: pathname };
  const out = new URLSearchParams(search);
  let changed = false;

  const urlHasOrg = ORG_KEYS.some((k) => search.get(k));
  let sameOrg = true;
  if (urlHasOrg) {
    for (const k of ORG_KEYS) {
      const v = search.get(k);
      if (v) next[k] = v;
    }
    sameOrg = ORG_KEYS.every((k) => (search.get(k) || undefined) === prev[k]);
  } else {
    for (const k of ORG_KEYS) {
      if (prev[k]) {
        next[k] = prev[k];
        out.set(k, prev[k] as string);
        changed = true;
      }
    }
  }

  const urlTid = search.get("tournament_id");
  if (urlTid) {
    next.tournament_id = urlTid;
  } else if (sameOrg && prev.tournament_id && prev.path !== pathname) {
    // Moved to another dashboard page without the selection: keep it.
    next.tournament_id = prev.tournament_id;
    out.set("tournament_id", prev.tournament_id);
    changed = true;
  }
  // Same page with the param removed = an explicit "All events" clear.

  return { redirect: changed ? out : null, next };
}

export function readDashboardContext(): StoredDashboardContext | null {
  try {
    const raw = sessionStorage.getItem(DASHBOARD_CONTEXT_KEY);
    return raw ? (JSON.parse(raw) as StoredDashboardContext) : null;
  } catch {
    return null;
  }
}

export function writeDashboardContext(ctx: StoredDashboardContext) {
  try {
    sessionStorage.setItem(DASHBOARD_CONTEXT_KEY, JSON.stringify(ctx));
  } catch {
    /* ignore */
  }
}

/** Call when leaving admin mode / switching workspace / signing out. */
export function clearDashboardContext() {
  try {
    sessionStorage.removeItem(DASHBOARD_CONTEXT_KEY);
  } catch {
    /* ignore */
  }
}

/** Append the current dashboard context params to a /dashboard URL. */
export function withDashboardContext(url: string, search: string | URLSearchParams): string {
  if (!url.startsWith("/dashboard")) return url;
  const current = typeof search === "string" ? new URLSearchParams(search) : search;
  const [path, query = ""] = url.split("?");
  const target = new URLSearchParams(query);
  for (const k of [...ORG_KEYS, "tournament_id"]) {
    const v = current.get(k);
    if (v && !target.get(k)) target.set(k, v);
  }
  const qs = target.toString();
  return qs ? `${path}?${qs}` : path;
}
