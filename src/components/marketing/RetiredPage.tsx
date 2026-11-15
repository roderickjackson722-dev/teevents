import type { ReactNode } from "react";

/** Wraps an archived page, unchanged, under a visible "Retired" notice. */
export default function RetiredPage({ children, note }: { children: ReactNode; note: string }) {
  return <>
    <div role="note" className="sticky top-0 z-50 bg-destructive px-4 py-2 text-center text-sm font-semibold text-destructive-foreground print:hidden">
      RETIRED — {note}
    </div>
    {children}
  </>;
}
