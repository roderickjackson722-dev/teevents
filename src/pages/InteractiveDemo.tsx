import { useEffect, useState } from "react";
import { Joyride, STATUS, ACTIONS, type EventData, type Step } from "react-joyride";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import SampleDashboard from "./SampleDashboard";
import SEO from "@/components/SEO";

const STORAGE_KEY = "teevents_interactive_demo_seen";

const steps: Step[] = [
  {
    target: '[data-tour="overview-stats"]',
    title: "Tournament at a Glance",
    content:
      "See how many players have registered, how much revenue you've collected, and key deadlines — all in one place.",
    placement: "bottom",
  },
  {
    target: '[data-tour="nav-players"]',
    title: "Manage Your Players",
    content:
      "See who has registered. Add players manually, import a CSV, or send them a registration link.",
    placement: "right",
  },
  {
    target: '[data-tour="nav-leaderboard"]',
    title: "Live Leaderboard",
    content:
      "Scores update live during the event. Players enter their own scores by scanning a QR code — no app to download.",
    placement: "right",
  },
  {
    target: '[data-tour="nav-finances"]',
    title: "Track Every Transaction",
    content:
      "See gross registration fees, our 5% platform fee, Stripe's processing fee, and your net proceeds — all in real time.",
    placement: "right",
  },
  {
    target: '[data-tour="nav-site-builder"]',
    title: "Brand Your Tournament",
    content:
      "Change colors, upload your logo, and publish a branded tournament website in minutes. No coding required.",
    placement: "right",
  },
  {
    target: '[data-tour="nav-payout-settings"]',
    title: "Get Paid Automatically",
    content:
      "Connect your Stripe account to receive automatic payouts. TeeVents never holds your money — Stripe sends net proceeds directly to you.",
    placement: "right",
  },
  {
    target: '[data-tour="demo-cta"]',
    title: "Ready to Run Your Own Tournament?",
    content:
      "Get started — no credit card required. Upgrade to Pro ($399 per tournament) when you need advanced features like the live leaderboard, sponsor portal, and auction tools.",
    placement: "auto",
  },
];

export default function InteractiveDemo() {
  const navigate = useNavigate();
  const [run, setRun] = useState(false);

  useEffect(() => {
    const seen = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY);
    const t = setTimeout(() => setRun(!seen), 700);
    return () => clearTimeout(t);
  }, []);

  const onEvent = (data: EventData) => {
    const { status, action, lifecycle, index } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {}
    }
    if (
      action === ACTIONS.NEXT &&
      lifecycle === "complete" &&
      index === steps.length - 1
    ) {
      navigate("/login");
    }
  };

  const restart = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
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
        scrollToFirstStep
        onEvent={onEvent}
        options={{
          primaryColor: "#F5A623",
          textColor: "#1a5c38",
          arrowColor: "#ffffff",
          backgroundColor: "#ffffff",
          zIndex: 10000,
          showProgress: true,
          buttons: ["back", "skip", "primary"],
        }}
        locale={{
          back: "Back",
          close: "Close",
          last: "Sign Up for Free →",
          next: "Next",
          nextWithProgress: "Next ({current}/{total})",
          skip: "Skip tour",
          open: "Open the dialog",
        }}
      />

      {/* Floating Restart / CTA controls */}
      <div className="fixed bottom-4 left-4 z-[9999] flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={restart}
          className="shadow-lg bg-white"
        >
          <Play className="h-3.5 w-3.5 mr-1" /> Restart Tour
        </Button>
        <Button
          data-tour="demo-cta"
          size="sm"
          onClick={() => navigate("/login")}
          className="shadow-lg bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-bold"
        >
          Sign Up for Free →
        </Button>
      </div>

      <SampleDashboard />
    </>
  );
}
