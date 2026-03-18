import { ReactNode, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardChatAssistant } from "./DashboardChatAssistant";
import { Loader2, Eye, ArrowRight } from "lucide-react";
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
  const navigate = useNavigate();
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
  }, [navigate]);

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
                  <span className="text-sm font-medium text-foreground">
                    {orgContext.orgName}
                  </span>
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
