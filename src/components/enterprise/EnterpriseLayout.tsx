import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  PlusCircle,
  Trophy,
  Users,
  Flag,
  MapPin,
  Mail,
  Zap,
  Handshake,
  Sparkles,
  MessageSquare,
  Gift,
  ShieldCheck,
  Menu,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: typeof Trophy;
  /** Hidden for limited staff roles (scoring only / viewer). */
  fullOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  adminOnly?: boolean;
  fullOnly?: boolean;
}

/** Staff roles that only see the day-to-day event screens. */
const LIMITED_ROLES = ["scoring_only", "viewer"];

const NAV: NavGroup[] = [
  {
    label: "Dashboard",
    items: [{ label: "Home", to: "/enterprise", icon: LayoutDashboard }],
  },
  {
    label: "Create",
    fullOnly: true,
    items: [
      { label: "Single Tournament", to: "/enterprise/create?type=single_round", icon: PlusCircle },
      { label: "Multi-Round", to: "/enterprise/create?type=multi_round", icon: PlusCircle },
      { label: "Ryder Cup", to: "/enterprise/create?type=ryder_cup", icon: PlusCircle },
      { label: "Bracket", to: "/enterprise/create?type=match_bracket", icon: PlusCircle },
      { label: "Round Robin", to: "/enterprise/create?type=round_robin", icon: PlusCircle },
    ],
  },
  {
    label: "Manage",
    items: [
      { label: "Leagues", to: "/enterprise/leagues", icon: Flag },
      { label: "My Courses", to: "/enterprise/courses", icon: MapPin },
      { label: "My Roster", to: "/enterprise/roster", icon: Users },
      { fullOnly: true, label: "Communications", to: "/enterprise/communications", icon: Mail },
      { fullOnly: true, label: "Automations", to: "/enterprise/automations", icon: Zap },
      { fullOnly: true, label: "Admin Portal", to: "/enterprise/admin", icon: ShieldCheck },
    ],
  },
  {
    label: "Resources",
    items: [
      { label: "Partners", to: "/enterprise/resources/partners", icon: Handshake },
      { label: "What's New", to: "/enterprise/resources/whats-new", icon: Sparkles },
      { label: "Feedback", to: "/enterprise/resources/feedback", icon: MessageSquare },
      { label: "Earn $300", to: "/enterprise/resources/earn-300", icon: Gift },
    ],
  },
  {
    label: "Platform Admin",
    adminOnly: true,
    items: [{ label: "TeeVents Admin", to: "/admin", icon: ShieldCheck }],
  },
];

/** Group is active when any of its items matches the current path. */
const groupActive = (group: NavGroup, pathname: string) =>
  group.items.some((item) => {
    const base = item.to.split("?")[0];
    return base === "/enterprise" ? pathname === "/enterprise" : pathname.startsWith(base);
  });

/** Nav filtered by platform admin + org staff role. */
export const visibleNav = (isAdmin: boolean, role?: string | null): NavGroup[] => {
  const limited = !isAdmin && LIMITED_ROLES.includes(role || "");
  return NAV.filter((g) => (!g.adminOnly || isAdmin) && (!limited || !g.fullOnly))
    .map((g) => ({ ...g, items: g.items.filter((i) => !limited || !i.fullOnly) }))
    .filter((g) => g.items.length > 0);
};

const MobileNav = ({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) => {
  const { pathname } = useLocation();
  return (
    <nav className="space-y-6 p-4">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-primary-foreground/60">
            {group.label}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const base = item.to.split("?")[0];
              const active = base === "/enterprise" ? pathname === "/enterprise" : pathname.startsWith(base);
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-secondary text-primary"
                        : "text-primary-foreground/85 hover:bg-primary-foreground/10 hover:text-primary-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
};

export interface Crumb {
  label: string;
  to?: string;
}

interface Props {
  children: ReactNode;
  title?: string;
  description?: string;
  crumbs?: Crumb[];
  actions?: ReactNode;
}

/**
 * Enterprise shell: clubhouse-style top navigation with dropdown menus,
 * a brand bar, breadcrumbs and a wide centered content column.
 */
export default function EnterpriseLayout({ children, title, description, crumbs = [], actions }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { org, loading } = useOrgContext();
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [checkedSession, setCheckedSession] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/get-started");
        return;
      }
      const { data } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
      setIsAdmin(Boolean(data));
      setCheckedSession(true);
    })();
  }, [navigate]);

  const groups = visibleNav(isAdmin, org?.role);
  const initials = (org?.orgName || "TV")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Brand bar with top navigation */}
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-lg">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex h-16 items-center justify-between gap-4 md:h-20">
            <div className="flex items-center gap-3">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 lg:hidden" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 overflow-y-auto bg-primary p-0">
                  <div className="px-5 pt-6">
                    <p className="text-lg font-bold text-primary-foreground">TeeVents</p>
                    <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Enterprise</p>
                  </div>
                  <MobileNav groups={groups} onNavigate={() => setMobileOpen(false)} />
                </SheetContent>
              </Sheet>

              <Link to="/enterprise" className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary shadow-inner">
                  <div className="h-5 w-5 rounded-full border-2 border-primary" />
                </div>
                <span className="text-xl font-semibold tracking-tight md:text-2xl">
                  TeeVents{" "}
                  <span className="ml-1 font-sans text-xs font-semibold uppercase tracking-widest text-secondary">
                    Enterprise
                  </span>
                </span>
              </Link>
            </div>

            {/* Desktop top nav */}
            <nav className="hidden items-center gap-1 lg:flex">
              {groups.map((group) => {
                const active = groupActive(group, pathname);
                if (group.items.length === 1) {
                  return (
                    <Link
                      key={group.label}
                      to={group.items[0].to}
                      className={cn(
                        "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "border-b-2 border-secondary text-primary-foreground"
                          : "text-primary-foreground/80 hover:text-primary-foreground",
                      )}
                    >
                      {group.label}
                    </Link>
                  );
                }
                return (
                  <DropdownMenu key={group.label}>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={cn(
                          "flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "border-b-2 border-secondary text-primary-foreground"
                            : "text-primary-foreground/80 hover:text-primary-foreground",
                        )}
                      >
                        {group.label}
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <DropdownMenuItem key={item.to} onClick={() => navigate(item.to)}>
                            <Icon className="mr-2 h-4 w-4 text-primary" />
                            {item.label}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })}
            </nav>

            {/* Org identity */}
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-[11px] text-primary-foreground/70">Logged in as</p>
                <p className="max-w-40 truncate text-sm font-semibold">{org?.dashboardName || org?.orgName || "…"}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-foreground/20 bg-primary-foreground/10">
                <span className="text-sm font-bold">{initials}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Page sub-header: breadcrumbs, title, actions */}
      <div className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Link to="/enterprise" className="hover:text-primary">Enterprise</Link>
              {crumbs.map((c) => (
                <span key={c.label} className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3" />
                  {c.to ? (
                    <Link to={c.to} className="hover:text-primary">{c.label}</Link>
                  ) : (
                    <span className="truncate text-foreground">{c.label}</span>
                  )}
                </span>
              ))}
            </div>
            {title && <h1 className="truncate text-2xl text-primary md:text-3xl">{title}</h1>}
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        {loading || !checkedSession ? (
          <div className="flex items-center gap-2 py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading your enterprise workspace…
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
