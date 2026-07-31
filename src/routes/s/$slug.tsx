import { createFileRoute } from "@tanstack/react-router";
import CollegeSurvey from "@/pages/CollegeSurvey";
import sasPreview from "@/assets/sas-hbcu-invitational.png.asset.json";

const SITE = "https://www.teevents.golf";
const SAS_PREVIEW_IMAGE = `${SITE}${sasPreview.url}`;

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
        { property: "og:image", content: SAS_PREVIEW_IMAGE },
        { property: "og:image:alt", content: "SAS HBCU Invitational" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "SAS Survey" },
        { name: "twitter:description", content: "Complete the SAS Survey" },
        { name: "twitter:image", content: SAS_PREVIEW_IMAGE },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: CollegeSurvey,
});
