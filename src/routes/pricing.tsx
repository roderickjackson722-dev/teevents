import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
const App = lazy(() => import("@/App"));
const title = "Simple, Transparent Pricing | TeeVents";
const description = "Golf tournament software: $0 to start, $399/event, $599/league, $2,999/yr Enterprise. Dedicated rep setup, editing anytime, and on-call event support.";
export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:title", content: title }, { name: "twitter:description", content: description }, { name: "twitter:card", content: "summary_large_image" }], links: [{ rel: "canonical", href: "https://www.teevents.golf/pricing" }] }),
  component: () => <ClientOnly fallback={<div className="min-h-screen bg-background" />}><Suspense fallback={<div className="min-h-screen bg-background" />}><App /></Suspense></ClientOnly>,
});