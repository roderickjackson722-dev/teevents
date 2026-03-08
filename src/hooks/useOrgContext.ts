import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OrgContext {
  orgId: string;
  orgName: string;
  userId: string;
  plan: string;
  role: string;
  permissions: string[];
}

export function useOrgContext() {
  const [org, setOrg] = useState<OrgContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data: membership } = await supabase
        .from("org_members")
        .select("organization_id, role, permissions")
        .eq("user_id", session.user.id)
        .limit(1)
        .single();

      if (!membership) { setLoading(false); return; }

      const { data: orgData } = await supabase
        .from("organizations")
        .select("id, name, plan")
        .eq("id", membership.organization_id)
        .single() as { data: { id: string; name: string; plan: string } | null; error: any };

      if (orgData) {
        setOrg({
          orgId: orgData.id,
          orgName: orgData.name,
          userId: session.user.id,
          plan: orgData.plan || 'starter',
          role: (membership as any).role || 'owner',
          permissions: (membership as any).permissions || [],
        });
      }
      setLoading(false);
    };

    init();
  }, []);

  return { org, loading };
}
