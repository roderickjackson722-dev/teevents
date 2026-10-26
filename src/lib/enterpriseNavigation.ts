/** Preserve workspace/event selection only on internal Enterprise links. */
export function enterpriseLink(path: string, search: string): string {
  if (!path.startsWith("/enterprise")) return path;
  const [pathname, query = ""] = path.split("?");
  const target = new URLSearchParams(query);
  const current = new URLSearchParams(search);
  for (const key of ["admin_org", "sample_org", "sample", "tournament_id"]) {
    const value = current.get(key);
    if (value && !target.has(key)) target.set(key, value);
  }
  const queryString = target.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

export function enterpriseItemIsActive(to: string, pathname: string): boolean {
  const base = to.split("?")[0];
  if (base === "/enterprise" || base === "/enterprise/tournaments") return pathname === base;
  if (base === "/enterprise/operations" && pathname === "/enterprise/payments") return true;
  if (base === "/enterprise/admin" && pathname.startsWith("/enterprise/settings/")) return true;
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** The league ID is part of the URL, so a workspace's selected league cannot fall back to another row. */
export function enterpriseLeagueManageLink(leagueId: string, search: string): string {
  return enterpriseLink(`/enterprise/leagues/${encodeURIComponent(leagueId)}/manage`, search);
}