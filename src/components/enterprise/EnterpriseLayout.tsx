import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  CalendarPlus,
  ChevronRight,
  Flag,
  Gift,
  Handshake,
  LayoutDashboard,
  Loader2,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import logoAsset from "@/assets/teevents-logo-final.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: typeof Trophy;
  fullOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  adminOnly?: boolean;
  fullOnly?: boolean;
}

const LIMITED_ROLES = ["scoring_only", "viewer"];

const NAV: NavGroup[] = [
  { label: "Dashboard", items: [{ label: "Home", to: "/enterprise", icon: LayoutDashboard }] },
  {
    label: "Manage",
    items: [
      { label: "Tournaments", to: "/enterprise/tournaments", icon: Trophy },
      { label: "Leagues", to: "/enterprise/leagues", icon: Flag },
      { label: "My Courses", to: "/enterprise/courses", icon: MapPin },
      { label: "My Roster", to: "/enterprise/roster", icon: Users },
      { label: "Communications", to: "/enterprise/communications", icon: Mail, fullOnly: true },
      { label: "Automations", to: "/enterprise/automations", icon: Zap, fullOnly: true },
    ],
  },
  {
    label: "Create",
    fullOnly: true,
    items: [
      { label: "New Tournament", to: "/enterprise/create", icon: CalendarPlus },
      { label: "New League", to: "/enterprise/leagues?new=1", icon: Flag },
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
    label: "Admin",
    fullOnly: true,
    items: [{ label: "Admin Portal", to: "/enterprise/admin", icon: ShieldCheck }],
  },
  {
    label: "Platform",
    adminOnly: true,
    items: [{ label: "TeeVents Admin", to: "/admin", icon: ShieldCheck }],
  },
];

export const visibleNav = (isAdmin: boolean, role?: string | null): NavGroup[] => {
  const limited = !isAdmin && LIMITED_ROLES.includes(role || "");
  return NAV.filter((group) => (!group.adminOnly || isAdmin) && (!limited || !group.fullOnly))
    .map((group) => ({ ...group, items: group.items.filter((item) => !limited || !item.fullOnly) }))
    .filter((group) => group.items.length > 0);
};

const itemIsActive = (to: string, pathname: string) => {
  const base = to.split("?")[0];
  if (base === "/enterprise") return pathname === "/enterprise";
  if (base === "/enterprise/tournaments") return pathname === base;
  return pathname.startsWith(base);
};

function EnterpriseNav({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const { pathname } = useLocation();
  return (
    <nav className="space-y-6 px-3 py-5" aria-label="Enterprise navigation">
      {groups.map((group) => (
        <section key={group.label}>
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/45">
            {group.label}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active = itemIsActive(item.to, pathname);
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "group flex min-h-10 items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm font-semibold transition-colors",
                      active
                        ? "border-sidebar-primary bg-sidebar-accent text-sidebar-primary"
                        : "border-transparent text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-sidebar-primary" : "text-sidebar-foreground/55 group-hover:text-sidebar-foreground")} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}

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

export default function EnterpriseLayout({ children, title, description, crumbs = [], actions }: Props) {
  const navigate = useNavigate();
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
    .map((word) => word[0]?.toUpperCase())
    .join("");

  const Brand = () => (
    <Link to="/enterprise" className="flex min-w-0 items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md bg-sidebar-foreground">
        <img src={logoAsset.url} alt="TeeVents" className="h-9 w-9 object-contain" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-xl font-semibold text-sidebar-foreground">TeeVents</span>
        <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-sidebar-primary">Enterprise</span>
      </span>
    </Link>
  );

  return (
    <div className="enterprise-shell min-h-screen bg-golf-cream text-golf-charcoal">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="border-b border-sidebar-border px-5 py-5"><Brand /></div>
        <div className="min-h-0 flex-1 overflow-y-auto"><EnterpriseNav groups={groups} /></div>
        <div className="border-t border-sidebar-border p-4">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-sidebar-primary/45 bg-sidebar-accent text-sm font-bold text-sidebar-primary">{initials}</span>
            <span className="min-w-0">
              <span className="block text-[10px] text-sidebar-foreground/50">Signed in as</span>
              <span className="block truncate text-sm font-semibold text-sidebar-foreground">{org?.dashboardName || org?.orgName || "TeeVents"}</span>
            </span>
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:ml-64">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 md:px-8">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="border-primary text-primary lg:hidden" aria-label="Open Enterprise menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 overflow-y-auto border-sidebar-border bg-sidebar p-0">
                <div className="border-b border-sidebar-border px-5 py-5"><Brand /></div>
                <EnterpriseNav groups={groups} onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                <Link to="/enterprise" className="shrink-0 font-semibold hover:text-primary">Enterprise</Link>
                {crumbs.map((crumb) => (
                  <span key={crumb.label} className="flex min-w-0 items-center gap-1">
                    <ChevronRight className="h-3 w-3 shrink-0" />
                    {crumb.to ? <Link to={crumb.to} className="truncate hover:text-primary">{crumb.label}</Link> : <span className="truncate text-foreground">{crumb.label}</span>}
                  </span>
                ))}
              </div>
              {title && <h1 className="truncate font-display text-2xl font-semibold text-primary md:text-3xl">{title}</h1>}
              {description && <p className="mt-0.5 hidden truncate text-sm text-muted-foreground md:block">{description}</p>}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {actions && <div className="hidden flex-wrap items-center gap-2 sm:flex">{actions}</div>}
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground lg:hidden">{initials}</span>
            </div>
          </div>
          {actions && <div className="flex flex-wrap gap-2 border-t border-border px-4 py-2 sm:hidden">{actions}</div>}
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
          {loading || !checkedSession ? (
            <div className="flex items-center gap-2 py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading your enterprise workspace…</div>
          ) : children}
        </main>
      </div>
    </div>
  );
}