import { createFileRoute } from "@tanstack/react-router";
import CollegeSurvey from "@/pages/CollegeSurvey";
import { getSurveyMeta, headFromMeta } from "@/lib/serverMeta";

export const Route = createFileRoute("/s/$slug")({
  loader: ({ params }) => getSurveyMeta(params.slug),
  head: ({ loaderData }) => headFromMeta(loaderData),
  component: CollegeSurvey,
});
