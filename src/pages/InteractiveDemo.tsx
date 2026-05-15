import { useEffect, useRef, useState } from "react";
import Joyride, { STATUS, ACTIONS, EVENTS, type CallBackProps, type Step } from "react-joyride";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import SampleDashboard from "./SampleDashboard";
import SEO from "@/components/SEO";

const STORAGE_KEY = "teevents_interactive_demo_seen";

const SIDEBAR_STEP_INDEXES = new Set([1, 2, 3, 4, 5]);

const steps: Step[] = [
  {
    target: '[data-tour="overview-stats"]',
    title: "Tournament at a Glance",
    content:
      "See how many players have registered, how much revenue you've collected, and key deadlines — all in one place.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-players"]',
    title: "Manage Your Players",
    content:
      "See who has registered. Add players manually, import a CSV, or send them a registration link.",
    placement: "auto",
  },
  {
    target: '[data-tour="nav-leaderboard"]',
    title: "Live Leaderboard",
    content:
      "Scores update live during the event. Players enter their own scores by scanning a QR code — no app to download.",
    placement: "auto",
  },
  {
    target: '[data-tour="nav-finances"]',
    title: "Track Every Transaction",
    content:
      "Real-time view of gross revenue, the 5% TeeVents platform fee, Stripe processing fees (2.9% + $0.30), and your net proceeds. Stripe Connect deposits net funds straight to your bank — TeeVents never holds your money.",
    placement: "auto",
  },
  {
    target: '[data-tour="nav-flyer-studio"]',
    title: "Brand Your Tournament",
    content:
      "Customize colors, upload your logo, and build a branded tournament site and flyers in minutes — no coding required.",
    placement: "auto",
  },
  {
    target: '[data-tour="nav-payout-settings"]',
    title: "Get Paid Automatically",
    content:
      "Connect your Stripe account to receive automatic payouts. TeeVents never holds your money — Stripe sends net proceeds directly to you.",
    placement: "auto",
  },
  {
    target: '[data-tour="demo-cta"]',
    title: "Ready to Run Your Own Tournament?",
    content:
      "Get started — no credit card required. Upgrade to Pro ($399 per tournament) when you need advanced features like the live leaderboard, sponsor portal, and auction tools.",
    placement: "auto",
  },
];

function emitAnalytics(event: string, payload: Record<string, unknown> = {}) {
  try {
    window.dispatchEvent(new CustomEvent("teevents:demo-tour", { detail: { event, ...payload } }));
    // eslint-disable-next-line no-console
    console.info("[demo-tour]", event, payload);
  } catch {
    /* noop */
  }
}

export default function InteractiveDemo() {
  const navigate = useNavigate();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const seen = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY);
    const t = setTimeout(() => {
      if (!seen) {
        setRun(true);
      }
    }, 700);
    return () => clearTimeout(t);
  }, []);

  // Open mobile sidebar sheet for sidebar-targeted steps on small screens
  useEffect(() => {
    if (!run) return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isMobile && SIDEBAR_STEP_INDEXES.has(stepIndex)) {
      window.dispatchEvent(new CustomEvent("teevents:sample-mobile-nav", { detail: { open: true } }));
    } else {
      window.dispatchEvent(new CustomEvent("teevents:sample-mobile-nav", { detail: { open: false } }));
    }
  }, [run, stepIndex]);

  const onCallback = (data: CallBackProps) => {
    const { status, action, lifecycle, index, type } = data;

    if (!startedRef.current && type === EVENTS.TOUR_START) {
      startedRef.current = true;
      emitAnalytics("tour_started");
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      // advance our local index so the mobile-nav effect runs for the next step
      const next = action === ACTIONS.PREV ? Math.max(0, index - 1) : index + 1;
      setStepIndex(next);
      emitAnalytics("tour_step_viewed", { stepIndex: index });
    }

    if (status === STATUS.FINISHED) {
      setRun(false);
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* noop */ }
      emitAnalytics("tour_completed");
    } else if (status === STATUS.SKIPPED || (action === ACTIONS.CLOSE && lifecycle === "complete")) {
      setRun(false);
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* noop */ }
      emitAnalytics("tour_skipped", { stepIndex: index });
    }

    if (
      action === ACTIONS.NEXT &&
      lifecycle === "complete" &&
      index === steps.length - 1
    ) {
      navigate("/login");
    }
  };

  const startTour = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    startedRef.current = false;
    setStepIndex(0);
    setRun(false);
    setTimeout(() => setRun(true), 100);
  };

  return (
    <>
      <SEO
        title="Interactive Demo | TeeVents"
        description="Take a self-guided tour of the TeeVents tournament dashboard — no signup required."
        path="/interactive-demo"
      />

      <Joyride
        steps={steps}
        run={run}
        continuous
        showProgress
        showSkipButton
        scrollToFirstStep
        disableScrollParentFix
        scrollOffset={100}
        callback={onCallback}
        styles={{
          options: {
            primaryColor: "#F5A623",
            textColor: "#1a5c38",
            arrowColor: "#ffffff",
            backgroundColor: "#ffffff",
            zIndex: 10000,
          },
        }}
        locale={{
          back: "Back",
          close: "Close",
          last: "Sign Up Free →",
          next: "Next",
          skip: "Skip tour",
          open: "Open the dialog",
        }}
      />

      {/* Floating Start Tour / CTA controls */}
      <div className="fixed bottom-4 left-4 z-[9999] flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={startTour}
          className="shadow-lg bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-bold"
        >
          <Play className="h-3.5 w-3.5 mr-1" /> Start Tour
        </Button>
        <Button
          data-tour="demo-cta"
          size="sm"
          variant="outline"
          onClick={() => navigate("/login")}
          className="shadow-lg bg-white"
        >
          Sign Up Free →
        </Button>
      </div>

      <SampleDashboard />
    </>
  );
}
