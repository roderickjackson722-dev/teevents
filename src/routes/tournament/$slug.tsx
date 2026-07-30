import { createFileRoute } from "@tanstack/react-router";
import PublicTournament from "@/pages/PublicTournament";
import { getTournamentMeta, headFromMeta } from "@/lib/serverMeta";

export const Route = createFileRoute("/tournament/$slug")({ loader: ({ params }) => getTournamentMeta(params.slug, "tournament"), head: ({ loaderData }) => headFromMeta(loaderData), component: PublicTournament });