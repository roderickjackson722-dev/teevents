import { HeadContent, Outlet, Scripts, createRootRouteWithContext, useRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import AutoPaymentConfirm from "@/components/leagues/AutoPaymentConfirm";
import styles from "../styles.css?url";

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { console.error(error); reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return <main className="grid min-h-screen place-items-center p-6 text-center"><div><h1 className="text-2xl font-bold">This page didn't load</h1><p className="mt-2 text-muted-foreground">Please try again.</p><div className="mt-4 flex justify-center gap-2"><button className="rounded bg-primary px-4 py-2 text-primary-foreground" onClick={reset}>Try again</button><button className="rounded border px-4 py-2" onClick={() => router.history.push("/")}>Go home</button></div></div></main>;
}

function RootDocument({ children }: { children: ReactNode }) {
  return <html lang="en" suppressHydrationWarning><head><HeadContent /></head><body><QueryClientProvider client={Route.useRouteContext().queryClient}><TooltipProvider><Toaster /><Sonner /><AutoPaymentConfirm />{children}</TooltipProvider></QueryClientProvider><Scripts /></body></html>;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "google-site-verification", content: "lVx5yK6iW1eaOArW9w44DZM7ty_0NEdHKF6el_86-Zw" },
      { title: "TeeVents Golf Tournaments" },
      { name: "description", content: "Golf tournament management for registration, payments, live scoring, sponsors, and pairings." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "TeeVents Golf Tournaments" },
      { property: "og:title", content: "TeeVents Golf Tournaments" },
      { property: "og:description", content: "Golf tournament management for registration, payments, live scoring, sponsors, and pairings." },
      { name: "twitter:title", content: "TeeVents Golf Tournaments" },
      { name: "twitter:description", content: "Golf tournament management for registration, payments, live scoring, sponsors, and pairings." },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: styles },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Raleway:wght@300;400;500;600;700&display=swap" },
    ],
  }),
  errorComponent: ErrorComponent,
  component: () => <RootDocument><Outlet /></RootDocument>,
});