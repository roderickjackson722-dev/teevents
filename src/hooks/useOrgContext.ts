import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OrgContext {
  orgId: string;
  orgName: string;
  userId: string;
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
        .select("organization_id")
        .eq("user_id", session.user.id)
        .limit(1)
        .single();

      if (!membership) { setLoading(false); return; }

      const { data: orgData } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("id", membership.organization_id)
        .single();

      if (orgData) {
        setOrg({ orgId: orgData.id, orgName: orgData.name, userId: session.user.id });
      }
      setLoading(false);
    };

    init();
  }, []);

  return { org, loading };
}
