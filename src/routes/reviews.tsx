import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
const App = lazy(() => import("@/App"));
const title = "TeeVents Reviews | Trusted in Collegiate and HBCU Golf";
const description = "Read what collegiate and HBCU golf organizers say about working with TeeVents and their dedicated event rep.";
export const Route = createFileRoute("/reviews")({
  head: () => ({ meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }], links: [{ rel: "canonical", href: "https://www.teevents.golf/reviews" }] }),
  component: () => <ClientOnly fallback={<div className="min-h-screen bg-background" />}><Suspense fallback={<div className="min-h-screen bg-background" />}><App /></Suspense></ClientOnly>,
});
