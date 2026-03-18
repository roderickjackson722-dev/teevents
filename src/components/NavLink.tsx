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

    // Preserve admin_org query param across navigation
    let resolvedTo = to;
    if (adminOrg && typeof to === "string") {
      const separator = to.includes("?") ? "&" : "?";
      resolvedTo = `${to}${separator}admin_org=${adminOrg}`;
    } else if (adminOrg && typeof to === "object") {
      resolvedTo = { ...to, search: `?admin_org=${adminOrg}` };
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
