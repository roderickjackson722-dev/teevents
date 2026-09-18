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
  ChevronRight,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: typeof Trophy;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  adminOnly?: boolean;
}

const NAV: NavGroup[] = [
  {
    label: "Dashboard",
    items: [{ label: "Home", to: "/enterprise", icon: LayoutDashboard }],
  },
  {
    label: "Create",
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
      { label: "Communications", to: "/enterprise/communications", icon: Mail },
      { label: "Automations", to: "/enterprise/automations", icon: Zap },
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
    adminOnly: true,
    items: [{ label: "Admin Portal", to: "/admin", icon: ShieldCheck }],
  },
];

const SidebarNav = ({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) => {
  const { pathname, search } = useLocation();
  const current = `${pathname}${search}`;
  return (
    <nav className="space-y-6 p-4">
      {NAV.filter((g) => !g.adminOnly || isAdmin).map((group) => (
        <div key={group.label}>
          <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-primary-foreground/60">
            {group.label}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active = current === item.to || (item.to !== "/enterprise" && pathname.startsWith(item.to.split("?")[0]));
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
 * Enterprise shell: brand sidebar, breadcrumbs and a wide content column.
 * Deliberately much lighter than the full organizer dashboard layout.
 */
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

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col overflow-y-auto bg-primary lg:flex">
        <div className="px-5 pt-6">
          <Link to="/enterprise" className="block">
            <p className="text-lg font-bold text-primary-foreground">TeeVents</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Enterprise</p>
          </Link>
        </div>
        <SidebarNav isAdmin={isAdmin} />
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 md:px-6">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 overflow-y-auto bg-primary p-0">
                <div className="px-5 pt-6">
                  <p className="text-lg font-bold text-primary-foreground">TeeVents</p>
                  <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Enterprise</p>
                </div>
                <SidebarNav isAdmin={isAdmin} onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
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
              {title && <h1 className="truncate text-xl font-bold text-foreground md:text-2xl">{title}</h1>}
            </div>

            <div className="hidden shrink-0 items-center gap-2 sm:flex">{actions}</div>
          </div>
          {org && (
            <div className="border-t border-border/60 px-4 py-1.5 text-xs text-muted-foreground md:px-6">
              {org.dashboardName || org.orgName}
            </div>
          )}
        </header>

        <main className="px-4 py-5 md:px-6 md:py-7">
          {description && <p className="mb-5 max-w-3xl text-sm text-muted-foreground">{description}</p>}
          {actions && <div className="mb-4 flex flex-wrap gap-2 sm:hidden">{actions}</div>}
          {loading || !checkedSession ? (
            <div className="flex items-center gap-2 py-20 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading your enterprise workspace…
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
