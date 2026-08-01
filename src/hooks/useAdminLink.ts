import { useSearchParams } from "react-router-dom";

/**
 * Returns a function that preserves the dashboard context query params
 * (`admin_org`, `sample_org`, `sample`, `tournament_id`) on a path, so links
 * never jump to a different organization's or tournament's dashboard.
 */
export function useAdminLink() {
  const [searchParams] = useSearchParams();
  const adminOrg = searchParams.get("admin_org");

  const buildLink = (path: string) => {
    const keep = new URLSearchParams();
    for (const key of ["admin_org", "sample_org", "sample", "tournament_id"]) {
      const v = searchParams.get(key);
      if (v) keep.set(key, v);
    }
    const qs = keep.toString();
    if (!qs) return path;
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}${qs}`;
  };

  return { buildLink, adminOrg };
}
