import { createFileRoute } from "@tanstack/react-router";
import PublicTournament from "@/pages/PublicTournament";
import { getTournamentMeta, headFromMeta } from "@/lib/serverMeta";

export const Route = createFileRoute("/t/$slug")({ loader: ({ params }) => getTournamentMeta(params.slug, "t"), head: ({ loaderData }) => headFromMeta(loaderData), component: PublicTournament });