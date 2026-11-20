import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getMyIntakeToken } from "@/lib/intake.functions";

/** After a successful $399 Per-Event or $599 Per-League payment, open Step 4 if it hasn't been submitted. Read-only check; never changes payments. */
export default function IntakeAfterPayment() {
  const { search } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const q = new URLSearchParams(search);
    const paid = q.get("flat_rate_session_id") || q.get("upgrade_session_id") || q.get("access") === "success";
    if (!paid) return;
    const t = setTimeout(async () => {
      const mine = await getMyIntakeToken().catch(() => null);
      if (mine && !mine.submitted) navigate(`/intake?token=${mine.token}`);
    }, 2500);
    return () => clearTimeout(t);
  }, [search, navigate]);
  return null;
}
