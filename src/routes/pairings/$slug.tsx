import { createFileRoute } from "@tanstack/react-router";
import PublicPairings from "@/pages/PublicPairings";
import { getTournamentMeta, headFromMeta } from "@/lib/serverMeta";

export const Route = createFileRoute("/pairings/$slug")({
  loader: ({ params }) => getTournamentMeta(params.slug, "pairings"),
  head: ({ loaderData }) => headFromMeta(loaderData),
  component: PublicPairings,
});
