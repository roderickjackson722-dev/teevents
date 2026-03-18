import { ReactNode, useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardChatAssistant } from "./DashboardChatAssistant";
import { Loader2, Eye, ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";
import { useDemoMode } from "@/hooks/useDemoMode";

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

      // Check for admin org override
      const adminOrgId = searchParams.get("admin_org");
      if (adminOrgId) {
        const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
        if (isAdmin) {
          const { data: org } = await supabase
            .from("organizations")
            .select("id, name")
            .eq("id", adminOrgId)
            .single();

          if (org) {
            setOrgContext({ orgId: org.id, orgName: org.name });
            setIsAdminOverride(true);
            setLoading(false);
            return;
          }
        }
      }

      const { data: membership } = await supabase
        .from("org_members")
        .select("organization_id")
        .eq("user_id", session.user.id)
        .limit(1)
        .single();

      if (!membership) {
        navigate("/onboarding");
        return;
      }

      const { data: org } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("id", membership.organization_id)
        .single();

      if (org) {
        setOrgContext({ orgId: org.id, orgName: org.name });
      }

      setLoading(false);
    };

    init();
    return () => subscription.unsubscribe();
  }, [navigate, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-golf-cream">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full">
        {isAdminOverride && (
          <div className="bg-destructive text-destructive-foreground px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium z-50">
            <ShieldCheck className="h-4 w-4 flex-shrink-0" />
            <span>Admin Mode — Editing <strong>{orgContext?.orgName}</strong>'s dashboard</span>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1 bg-destructive-foreground/20 hover:bg-destructive-foreground/30 px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Back to Admin
            </Link>
          </div>
        )}
        {isDemoMode && (
          <div className="bg-secondary text-secondary-foreground px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium z-50">
            <Eye className="h-4 w-4 flex-shrink-0" />
            <span>You're viewing a sample dashboard — changes will not be saved.</span>
            <Link
              to="/get-started"
              className="inline-flex items-center gap-1 bg-secondary-foreground/20 hover:bg-secondary-foreground/30 px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Sign Up Free <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
        <div className="flex flex-1">
          <DashboardSidebar />
          <div className="flex-1 flex flex-col">
            <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                {orgContext && (
                  <div className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {orgContext.orgName} Dashboard
                    </span>
                  </div>
                )}
              </div>
            </header>
            <main className="flex-1 bg-golf-cream p-6">
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
