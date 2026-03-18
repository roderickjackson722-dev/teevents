import { useSearchParams } from "react-router-dom";

/**
 * Returns a function that appends `admin_org` query param to a path
 * when the current session is an admin override.
 */
export function useAdminLink() {
  const [searchParams] = useSearchParams();
  const adminOrg = searchParams.get("admin_org");

  const buildLink = (path: string) => {
    if (!adminOrg) return path;
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}admin_org=${adminOrg}`;
  };

  return { buildLink, adminOrg };
}
