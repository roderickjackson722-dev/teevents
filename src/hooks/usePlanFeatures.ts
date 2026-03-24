import { useOrgContext } from "./useOrgContext";

// Feature access by plan tier
const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    "tournaments",
    "registration",
    "website",
    "players",
    "check-in",
    "planning-guide",
    "email-messaging",
    "printables",
  ],
  // "base" maps to same as free for backward compatibility
  base: [
    "tournaments",
    "registration",
    "website",
    "players",
    "check-in",
    "planning-guide",
    "email-messaging",
    "printables",
  ],
  starter: [
    // Everything in base +
    "leaderboard",
    "custom-domain",
    "sponsors",
    "budget",
    "gallery",
    "volunteers",
    "donations",
    "sms-messaging",
    "all-templates",
  ],
  premium: [
    // Everything in starter +
    "store",
    "auction",
    "surveys",
    "priority-support",
    "hole-in-one-insurance",
  ],
};

// All possible features for admin toggle UI
export const ALL_FEATURES = [
  { id: "tournaments", label: "Tournaments" },
  { id: "registration", label: "Registration" },
  { id: "website", label: "Website Builder" },
  { id: "players", label: "Player Management" },
  { id: "check-in", label: "Check-In" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "planning-guide", label: "Planning Guide" },
  { id: "email-messaging", label: "Email Messaging" },
  { id: "custom-domain", label: "Custom Domain" },
  { id: "sponsors", label: "Sponsor Management" },
  { id: "budget", label: "Budget Tracking" },
  { id: "gallery", label: "Photo Gallery" },
  { id: "printables", label: "Printables" },
  { id: "volunteers", label: "Volunteer Coordination" },
  { id: "donations", label: "Donations" },
  { id: "sms-messaging", label: "SMS Messaging" },
  { id: "all-templates", label: "All Templates" },
  { id: "store", label: "Merchandise Store" },
  { id: "auction", label: "Auction" },
  { id: "surveys", label: "Surveys" },
  { id: "priority-support", label: "Priority Support" },
  { id: "hole-in-one-insurance", label: "Hole-in-One Insurance" },
];

const PLAN_HIERARCHY = ["free", "starter", "premium"];

export function usePlanFeatures() {
  const { org, loading } = useOrgContext();
  const plan = org?.plan || "free";
  const overrides = org?.featureOverrides;

  const planHasFeature = (feature: string): boolean => {
    const idx = PLAN_HIERARCHY.indexOf(plan);
    for (let i = 0; i <= idx; i++) {
      const tierFeatures = PLAN_FEATURES[PLAN_HIERARCHY[i]];
      if (tierFeatures?.includes(feature)) return true;
    }
    return false;
  };

  const hasFeature = (feature: string): boolean => {
    // Check admin overrides first
    if (overrides && feature in overrides) {
      return overrides[feature];
    }
    // Fall back to plan-based access
    return planHasFeature(feature);
  };

  const requiredPlan = (feature: string): string => {
    for (const tier of PLAN_HIERARCHY) {
      if (PLAN_FEATURES[tier]?.includes(feature)) return tier;
    }
    return "premium";
  };

  return { plan, hasFeature, requiredPlan, loading };
}
