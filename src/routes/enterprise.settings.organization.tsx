import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
const App = lazy(() => import("@/App"));
const title = "Organization Details | TeeVents Enterprise";
const description = "Manage organization information inside your TeeVents Enterprise workspace.";
export const Route = createFileRoute("/enterprise/settings/organization")({
  head: () => ({ meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => <ClientOnly><Suspense><App /></Suspense></ClientOnly>,
});