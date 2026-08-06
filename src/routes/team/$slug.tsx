import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { getTeamMeta, headFromMeta } from "@/lib/serverMeta";

const App = lazy(() => import("@/App"));

export const Route = createFileRoute("/team/$slug")({
  loader: ({ params }) => getTeamMeta(params.slug),
  head: ({ loaderData }) => headFromMeta(loaderData),
  component: () => (
    <ClientOnly fallback={<div className="min-h-screen bg-background" />}>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <App />
      </Suspense>
    </ClientOnly>
  ),
});
