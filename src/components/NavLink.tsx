import { NavLink as RouterNavLink, NavLinkProps, useSearchParams } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    const [searchParams] = useSearchParams();
    const adminOrg = searchParams.get("admin_org");
    const tournamentId = searchParams.get("tournament_id");

    // Preserve admin_org + tournament_id query params across navigation so
    // that admins (and organizers) keep tournament context when jumping
    // between dashboard tabs.
    const carry: string[] = [];
    if (adminOrg) carry.push(`admin_org=${adminOrg}`);
    if (tournamentId) carry.push(`tournament_id=${tournamentId}`);

    let resolvedTo = to;
    if (carry.length && typeof to === "string") {
      const separator = to.includes("?") ? "&" : "?";
      resolvedTo = `${to}${separator}${carry.join("&")}`;
    } else if (carry.length && typeof to === "object") {
      resolvedTo = { ...to, search: `?${carry.join("&")}` };
    }

    return (
      <RouterNavLink
        ref={ref}
        to={resolvedTo}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
