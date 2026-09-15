import { useCallback, useEffect, useState } from "react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ArrowRight, HelpCircle, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  slug: string;
  customerName?: string | null;
  eventName: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  autoStart?: boolean;
}

/**
 * Guided 6-step tour for customer samples: event page → registration → leaderboard
 * → mobile scoring → organizer dashboard → call to action.
 */
export default function SampleGuidedTour({
  slug,
  customerName,
  eventName,
  primaryColor,
  secondaryColor,
  autoStart = true,
}: Props) {
  const [finalOpen, setFinalOpen] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);

  const startTour = useCallback(() => {
    const primary = primaryColor || "#1a5c38";
    const secondary = secondaryColor || "#F5A623";
    let lastStep = false;

    const d: Driver = driver({
      showProgress: true,
      progressText: "Step {{current}} of 6",
      allowClose: true,
      overlayOpacity: 0.72,
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Finish →",
      popoverClass: "teevents-tour",
      steps: [
        {
          element: "[data-tour='event-page']",
          popover: {
            title: `1. Welcome${customerName ? `, ${customerName}` : ""}!`,
            description: `This is the custom event page we built for <strong>${eventName}</strong>. Your logo, colors, event details, and calls to action match the live TeeVents experience.`,
            nextBtnText: "Start Tour →",
            side: "bottom",
            align: "center",
          },
        },
        {
          element: "[data-tour='registration']",
          popover: {
            title: "2. Registration",
            description:
              "Players choose an individual or team entry, answer contact, handicap, apparel, dietary, and event questions, review the fee, then continue to secure payment.",
            side: "bottom",
            align: "center",
          },
        },
        {
          element: "[data-tour='leaderboard']",
          popover: {
            title: "3. Live leaderboard",
            description:
              "This is your live leaderboard. It updates in real time as scores are entered. You can display it on a monitor at your event—and it matches your branding.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "[data-tour='mobile-scoring']",
          popover: {
            title: "4. Mobile scoring",
            description:
              "Players can enter scores right from their phone—no app download needed. It's simple and fast.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "[data-tour='organizer-dashboard']",
          popover: {
            title: "5. Your organizer dashboard",
            description:
              "These four areas are the most common. Your matching TeeVents dashboard has more options, including rosters, drag-and-drop pairings, sponsors, finances, messaging, and printables.",
            side: "top",
            align: "center",
            doneBtnText: "See next steps →",
            onNextClick: () => {
              lastStep = true;
              d.destroy();
            },
          },
        },
      ],
      onDestroyed: () => {
        if (lastStep) {
          setReachedEnd(true);
          setFinalOpen(true);
          supabase
            .rpc("mark_sample_tour_completed", { _slug: slug })
            .then(() => {});
        }
        try {
          localStorage.setItem(`sample-tour-${slug}`, "seen");
        } catch {
          /* private browsing */
        }
      },
    });

    // Brand the tour buttons.
    document.documentElement.style.setProperty("--tv-tour-primary", primary);
    document.documentElement.style.setProperty(
      "--tv-tour-secondary",
      secondary,
    );
    d.drive();
  }, [slug, customerName, eventName, primaryColor, secondaryColor]);

  useEffect(() => {
    if (!autoStart) return;
    let seen = false;
    try {
      seen = localStorage.getItem(`sample-tour-${slug}`) === "seen";
    } catch {
      /* ignore */
    }
    if (seen) return;
    const t = setTimeout(startTour, 900);
    return () => clearTimeout(t);
  }, [autoStart, slug, startTour]);

  return (
    <>
      <style>{`
        .driver-popover.teevents-tour { border-radius: 14px; max-width: 360px; }
        .driver-popover.teevents-tour .driver-popover-title { font-size: 1.05rem; }
        .driver-popover.teevents-tour .driver-popover-next-btn {
          background: var(--tv-tour-secondary, #F5A623);
          color: var(--tv-tour-primary, #1a5c38);
          font-weight: 700; text-shadow: none; border: none; border-radius: 8px; padding: 8px 14px;
        }
        .driver-popover.teevents-tour .driver-popover-prev-btn {
          border-radius: 8px; text-shadow: none; padding: 8px 12px;
        }
        .driver-popover.teevents-tour .driver-popover-progress-text { font-size: 12px; opacity: .7; }
        .driver-popover.teevents-tour .driver-popover-arrow-side-bottom { border-bottom-color: #fff; }
      `}</style>

      {/* Replay / start tour launcher */}
      <button
        type="button"
        onClick={startTour}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-lg"
        style={{
          backgroundColor: secondaryColor || "#F5A623",
          color: primaryColor || "#1a5c38",
        }}
      >
        <PlayCircle className="h-4 w-4" />
        {reachedEnd ? "Replay tour" : "Take the tour"}
      </button>

      <Dialog open={finalOpen} onOpenChange={setFinalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">
              Ready to get started?
            </DialogTitle>
            <DialogDescription className="text-center text-base pt-1">
              Those are the 4 main things you'll use most for {eventName}.
              Everything else is optional and can be turned on when you need it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <a
              href="https://teevents.golf/get-started"
              target="_blank"
              rel="noreferrer"
            >
              <Button
                size="lg"
                className="w-full font-bold"
                style={{
                  backgroundColor: secondaryColor || "#F5A623",
                  color: primaryColor || "#1a5c38",
                }}
              >
                Yes, Let's Get Started <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </a>
            <a href="mailto:info@teevents.golf?subject=Questions%20about%20my%20TeeVents%20sample">
              <Button variant="outline" size="lg" className="w-full">
                <HelpCircle className="h-4 w-4 mr-2" /> I Have Questions
              </Button>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
