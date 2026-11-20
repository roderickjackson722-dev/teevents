import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyIntakeToken } from "@/lib/intake.functions";

/** Old Step 4 link: event and league details now live in the signup steps, so reopen them there. */
export default function Intake() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  useEffect(() => {
    (async () => {
      let t = params.get("token") || sessionStorage.getItem("teevents.intakeToken");
      if (!t) {
        const { data: s } = await supabase.auth.getSession();
        if (s.session) t = (await getMyIntakeToken().catch(() => null))?.token || null;
      }
      navigate(t ? `/signup?edit=${t}` : "/dashboard", { replace: true });
    })();
  }, [params, navigate]);
  return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
}
