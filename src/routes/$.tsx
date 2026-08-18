import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { resolvePathMeta, headFromPathMeta } from "@/lib/pathMeta";
const App = lazy(() => import("@/App"));

export const Route = createFileRoute("/$")({
  // Server-resolved Open Graph / Twitter tags for every page served through the
  // catch-all, so link previews (iMessage, Facebook, WhatsApp, Slack, X) always
  // show that page's own title, description and image.
  loader: ({ location }) => resolvePathMeta(location.pathname),
  head: ({ loaderData }) => headFromPathMeta(loaderData),
  component: () => (
    <ClientOnly fallback={<div className="min-h-screen bg-background" />}>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <App />
      </Suspense>
    </ClientOnly>
  ),
});
