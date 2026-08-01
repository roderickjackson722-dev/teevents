import { ReactNode, useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardChatAssistant } from "./DashboardChatAssistant";
import { Loader2, Eye, ArrowRight, ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useSampleMode, setSampleModeActive } from "@/hooks/useSampleMode";

interface DashboardLayoutProps {
  children: ReactNode;
}

export interface OrgContext {
  orgId: string;
  orgName: string;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [loading, setLoading] = useState(true);
  const [orgContext, setOrgContext] = useState<OrgContext | null>(null);
  const [isAdminOverride, setIsAdminOverride] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDemoMode } = useDemoMode();
  const { isSampleMode, sampleDaysRemaining } = useSampleMode();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/get-started");
      }
    });

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/get-started");
        return;
      }

      // Force temporary password change before allowing dashboard access
      if (session.user.user_metadata?.force_password_change) {
        navigate("/force-password-change");
        return;
      }

      // Check for admin org override
      const adminOrgId = searchParams.get("admin_org");
      if (adminOrgId) {
        const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
        if (isAdmin) {
          const { data: org } = await supabase
            .from("organizations")
            .select("id, name, dashboard_name")
            .eq("id", adminOrgId)
            .single();

          if (org) {
            setOrgContext({ orgId: org.id, orgName: (org as any).dashboard_name || org.name });
            setIsAdminOverride(true);
            setLoading(false);
            return;
          }
        }
      }

      const { data: memberships } = await supabase
        .from("org_members")
        .select("organization_id, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true });

      if (!memberships || memberships.length === 0) {
        navigate("/onboarding");
        return;
      }

      let membership = memberships[0];
      const sampleOrgId = searchParams.get("sample_org");
      if (sampleOrgId) {
        const pinned = memberships.find((m: any) => m.organization_id === sampleOrgId);
        if (pinned) membership = pinned;
      } else if (memberships.length > 1) {
        // Prefer an org that actually owns at least one tournament,
        // so users who belong to multiple orgs don't land on an empty placeholder.
        const orgIds = memberships.map((m: any) => m.organization_id);
        const { data: tRows } = await supabase
          .from("tournaments")
          .select("organization_id")
          .in("organization_id", orgIds);
        const withT = new Set((tRows || []).map((r: any) => r.organization_id));
        const preferred = memberships.find((m: any) => withT.has(m.organization_id));
        if (preferred) membership = preferred;
      }

      const { data: org } = await supabase
        .from("organizations")
        .select("id, name, dashboard_name")
        .eq("id", membership.organization_id)
        .single();

      if (org) {
        setOrgContext({ orgId: org.id, orgName: (org as any).dashboard_name || org.name });
        // Record login (RPC throttles to once per 10 min)
        supabase.rpc("record_org_login" as any, { _organization_id: org.id, _user_agent: navigator.userAgent });
      }

      setLoading(false);
    };

    init();
    return () => subscription.unsubscribe();
  }, [navigate, searchParams]);

  // When a specific tournament is selected via ?tournament_id=, label the
  // dashboard with that tournament's name instead of the organization name.
  const selectedTournamentId = searchParams.get("tournament_id");
  const [tournamentLabel, setTournamentLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedTournamentId) { setTournamentLabel(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("title")
        .eq("id", selectedTournamentId)
        .maybeSingle();
      if (!cancelled) setTournamentLabel((data as any)?.title ?? null);
    })();
    return () => { cancelled = true; };
  }, [selectedTournamentId]);

  const displayName = tournamentLabel || orgContext?.orgName || "";

  // Keep the current context (admin override / sample org / selected tournament)
  // when linking back to the dashboard home, so the link never jumps to a
  // different organization's event.
  const dashboardHref = (() => {
    const keep = new URLSearchParams();
    for (const key of ["admin_org", "sample_org", "tournament_id"]) {
      const v = searchParams.get(key);
      if (v) keep.set(key, v);
    }
    const qs = keep.toString();
    return qs ? `/dashboard?${qs}` : "/dashboard";
  })();


  // Collapsible sidebar state, persisted in localStorage across sessions.
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("teevents:dashboard-sidebar");
      if (saved !== null) setSidebarOpen(saved === "true");
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("teevents:dashboard-sidebar", String(sidebarOpen));
    } catch { /* ignore */ }
  }, [sidebarOpen]);




  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-golf-cream">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="min-h-screen flex flex-col w-full">
        {isAdminOverride && (
          <div className="bg-destructive text-destructive-foreground px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium z-50">
            <ShieldCheck className="h-4 w-4 flex-shrink-0" />
            <span>Admin Mode — Editing <strong>{displayName}</strong>'s dashboard</span>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1 bg-destructive-foreground/20 hover:bg-destructive-foreground/30 px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Back to Admin
            </Link>
          </div>
        )}
        {isDemoMode && !isSampleMode && (
          <div className="bg-secondary text-secondary-foreground px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium z-50">
            <Eye className="h-4 w-4 flex-shrink-0" />
            <span>You're viewing a sample dashboard — changes will not be saved.</span>
            <Link
              to="/get-started"
              className="inline-flex items-center gap-1 bg-secondary-foreground/20 hover:bg-secondary-foreground/30 px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Get Started <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
        {isSampleMode && (
          <div className="bg-amber-400 text-amber-950 px-4 py-2.5 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold z-50">
            <Sparkles className="h-4 w-4 flex-shrink-0" />
            <span>
              🔍 DEMO MODE — This is a preview of the tournament dashboard. You can click through all
              features, but no changes are saved.
            </span>
            {sampleDaysRemaining !== null && (
              <span className="bg-amber-950/15 px-2 py-0.5 rounded-md text-xs uppercase tracking-wider">
                {sampleDaysRemaining} {sampleDaysRemaining === 1 ? "day" : "days"} remaining
              </span>
            )}

            <Link
              to="/book"
              className="inline-flex items-center gap-1 bg-amber-950/15 hover:bg-amber-950/25 px-3 py-1 rounded-md text-xs uppercase tracking-wider transition-colors"
            >
              Upgrade to Live <ArrowRight className="h-3 w-3" />
            </Link>
            <button
              onClick={async () => {
                setSampleModeActive(false);
                await supabase.auth.signOut();
                navigate("/");
              }}
              className="inline-flex items-center gap-1 bg-amber-950/10 hover:bg-amber-950/20 px-3 py-1 rounded-md text-xs uppercase tracking-wider transition-colors"
            >
              Exit
            </button>
          </div>
        )}
        <div className="flex flex-1 min-w-0 w-full overflow-hidden">
          <DashboardSidebar />
          <div className="flex-1 flex flex-col min-w-0 w-full">
             <header className="h-16 flex items-center justify-between border-b-2 border-secondary bg-secondary/15 px-4">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:flex min-w-0">
                <SidebarTrigger
                  aria-label={sidebarOpen ? "Collapse menu" : "Expand menu"}
                  title={sidebarOpen ? "Collapse menu" : "Expand menu"}
                  className="shrink-0 border border-secondary/60 bg-background/60 hover:bg-background"
                />
                {orgContext && (
                  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <span className="truncate text-base md:text-lg font-display font-bold text-foreground">
                      {displayName}
                    </span>
                    <span className="hidden sm:inline text-foreground/30">|</span>
                    <Link
                      to="/dashboard"
                      title="Click 'Open Dashboard' to access your tournament dashboard."
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-sm md:text-base font-semibold text-primary shadow-sm transition-colors hover:bg-secondary/80 hover:shadow"
                    >
                      Open Dashboard <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>

              {isAdminOverride && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Admin
                </Link>
              )}
            </header>
            <main className="flex-1 bg-golf-cream p-3 sm:p-4 md:p-6 overflow-x-auto dashboard-scroll min-w-0 w-full max-w-full">
              {children}
            </main>
          </div>
          <DashboardChatAssistant />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
