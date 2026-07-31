import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useAdminLink } from "@/hooks/useAdminLink";

/**
 * "Public Page Editor" entry point. Resolves the tournament to edit and sends
 * the organizer straight into the site editor — no intermediate "Edit Site" step.
 */
const PublicPageEditor = () => {
  const { org, loading } = useOrgContext();
  const { buildLink } = useAdminLink();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramId = searchParams.get("tournament_id") || "";

  useEffect(() => {
    if (loading) return;

    if (paramId) {
      navigate(buildLink(`/dashboard/tournaments/${paramId}/site-builder`), { replace: true });
      return;
    }
    if (!org) return;

    let cancelled = false;
    supabase
      .from("tournaments")
      .select("id")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const id = (data as any)?.id;
        navigate(
          id
            ? buildLink(`/dashboard/tournaments/${id}/site-builder`)
            : buildLink("/dashboard/tournaments"),
          { replace: true },
        );
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org, loading, paramId]);

  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
};

export default PublicPageEditor;
