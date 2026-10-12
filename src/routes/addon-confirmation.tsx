import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { confirmFeatureAddonRequest } from "@/lib/featureAddonRequests.functions";
import { Button } from "@/components/ui/button";

const title = "Add-On Purchase Confirmation | TeeVents";
const description = "Confirm your TeeVents feature add-on purchase and event setup request.";
export const Route = createFileRoute("/addon-confirmation")({
  head: () => ({ meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ session_id: typeof s.session_id === "string" ? s.session_id : "" }),
  component: Confirmation,
});
function Confirmation() {
  const { session_id } = Route.useSearch();
  const verify = useServerFn(confirmFeatureAddonRequest);
  const [state, setState] = useState("Confirming your purchase...");
  useEffect(() => { if (!session_id) { setState("Purchase reference missing. Please contact info@teevents.golf."); return; } verify({ data: { sessionId: session_id } }).then(r => setState(r.paid ? "Purchase confirmed. Your TeeVents rep will apply the add-on to your event." : "Payment is not confirmed yet. Please check again shortly.")).catch(() => setState("We could not confirm your payment yet. Please contact info@teevents.golf.")); }, [session_id]);
  return <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center"><h1 className="font-display text-3xl font-bold text-primary">TeeVents Add-On Purchase</h1><p>{state}</p><Button asChild variant="secondary"><Link to="/pricing">Back to pricing</Link></Button></main>;
}