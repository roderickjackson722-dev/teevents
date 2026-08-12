import { createFileRoute } from "@tanstack/react-router";
import CollegeSurvey from "@/pages/CollegeSurvey";
import { getSurveyMeta, headFromMeta } from "@/lib/serverMeta";

export const Route = createFileRoute("/s/sassurvey/share")({
  loader: () => getSurveyMeta("sassurvey", "/s/sassurvey/share"),
  head: ({ loaderData }) => headFromMeta(loaderData),
  component: () => <CollegeSurvey slugOverride="sassurvey" />,
});
