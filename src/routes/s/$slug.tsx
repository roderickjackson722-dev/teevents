import { createFileRoute } from "@tanstack/react-router";
import CollegeSurvey from "@/pages/CollegeSurvey";

const SITE = "https://www.teevents.golf";

export const Route = createFileRoute("/s/$slug")({
  head: ({ params }) => {
    const url = `${SITE}/s/${params.slug}`;
    if (params.slug !== "sassurvey") return { meta: [{ property: "og:url", content: url }], links: [{ rel: "canonical", href: url }] };
    return {
      meta: [
        { title: "SAS Survey" },
        { name: "description", content: "Complete the SAS Survey" },
        { property: "og:title", content: "SAS Survey" },
        { property: "og:description", content: "Complete the SAS Survey" },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "SAS Survey" },
        { name: "twitter:description", content: "Complete the SAS Survey" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: CollegeSurvey,
});
