import { createFileRoute } from "@tanstack/react-router";
import CollegeTournament from "@/pages/CollegeTournament";
import { getCollegeMeta, headFromMeta } from "@/lib/serverMeta";

export const Route = createFileRoute("/college/$slug")({
  loader: ({ params }) => getCollegeMeta(params.slug),
  head: ({ loaderData }) => headFromMeta(loaderData),
  component: CollegeTournament,
});