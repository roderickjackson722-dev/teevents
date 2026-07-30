import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
const App = lazy(() => import("@/App"));
export const Route = createFileRoute("/$")({ component: () => <ClientOnly fallback={<div className="min-h-screen bg-background" />}><Suspense fallback={<div className="min-h-screen bg-background" />}><App /></Suspense></ClientOnly> });