import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export interface OrgContext {
  orgId: string;
  orgName: string;
  dashboardName: string | null;
  userId: string;
  plan: string;
  role: string;
  permissions: string[];
  featureOverrides: Record<string, boolean> | null;
  feeOverride: number | null;
}

export function useOrgContext() {
  const [org, setOrg] = useState<OrgContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      // Admin override via query param
      const adminOrgId = searchParams.get("admin_org");
      if (adminOrgId) {
        const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
        if (isAdmin) {
        const { data: orgData } = await supabase
            .from("organizations")
            .select("id, name, plan, dashboard_name, feature_overrides, fee_override")
            .eq("id", adminOrgId)
            .single() as { data: { id: string; name: string; plan: string; dashboard_name: string | null; feature_overrides: Record<string, boolean> | null; fee_override: number | null } | null; error: any };

          if (orgData) {
            setOrg({
              orgId: orgData.id,
              orgName: orgData.name,
              dashboardName: orgData.dashboard_name,
              userId: session.user.id,
              plan: orgData.plan || 'starter',
              role: 'owner',
              permissions: [],
            });
            setLoading(false);
            return;
          }
        }
      }

      const { data: membership } = await supabase
        .from("org_members")
        .select("organization_id, role, permissions")
        .eq("user_id", session.user.id)
        .limit(1)
        .single();

      if (!membership) { setLoading(false); return; }

      const { data: orgData } = await supabase
        .from("organizations")
        .select("id, name, plan, dashboard_name")
        .eq("id", membership.organization_id)
        .single() as { data: { id: string; name: string; plan: string; dashboard_name: string | null } | null; error: any };

      if (orgData) {
        setOrg({
          orgId: orgData.id,
          orgName: orgData.name,
          dashboardName: orgData.dashboard_name,
          userId: session.user.id,
          plan: orgData.plan || 'starter',
          role: (membership as any).role || 'owner',
          permissions: (membership as any).permissions || [],
        });
      }
      setLoading(false);
    };

    init();
  }, [searchParams]);

  return { org, loading };
}
