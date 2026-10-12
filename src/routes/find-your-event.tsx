import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
const App = lazy(() => import("@/App"));
const title = "Find Your Event | Golf Tournaments and Leagues | TeeVents";
const description = "Browse and register for upcoming golf tournaments and leagues near you on TeeVents.";
export const Route = createFileRoute("/find-your-event")({
  head: () => ({ meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }], links: [{ rel: "canonical", href: "https://www.teevents.golf/find-your-event" }] }),
  component: () => <ClientOnly fallback={<div className="min-h-screen bg-background" />}><Suspense fallback={<div className="min-h-screen bg-background" />}><App /></Suspense></ClientOnly>,
});
