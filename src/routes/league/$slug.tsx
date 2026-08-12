import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { getLeagueMeta, headFromMeta } from "@/lib/serverMeta";

const App = lazy(() => import("@/App"));

export const Route = createFileRoute("/league/$slug")({
  loader: ({ params }) => getLeagueMeta(params.slug),
  head: ({ loaderData }) => headFromMeta(loaderData),
  component: () => (
    <ClientOnly fallback={<div className="min-h-screen bg-background" />}>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <App />
      </Suspense>
    </ClientOnly>
  ),
});
