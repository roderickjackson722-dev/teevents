import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
const App = lazy(() => import("@/App"));
const title = "For Tournament Organizers | TeeVents";
const description = "Your dedicated TeeVents rep sets up your event page. You can edit anything anytime with the same dashboard tools we use.";
export const Route = createFileRoute("/for-organizers")({
  head: () => ({ meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:description", content: description }, { name: "twitter:card", content: "summary_large_image" }], links: [{ rel: "canonical", href: "https://www.teevents.golf/for-organizers" }] }),
  component: () => <ClientOnly fallback={<div className="min-h-screen bg-background" />}><Suspense fallback={<div className="min-h-screen bg-background" />}><App /></Suspense></ClientOnly>,
});
