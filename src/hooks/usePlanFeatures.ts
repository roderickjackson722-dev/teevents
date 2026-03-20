import { useOrgContext } from "./useOrgContext";

// Feature access by plan tier
const PLAN_FEATURES: Record<string, string[]> = {
  base: [
    "tournaments",
    "registration",
    "website",
    "players",
    "check-in",
    "leaderboard",
    "planning-guide",
    "email-messaging",
    "custom-domain",
    "sponsors",
    "budget",
    "gallery",
    "printables",
    "volunteers",
  ],
  starter: [
    // Everything in base +
    "donations",
    "sms-messaging",
    "all-templates",
  ],
  premium: [
    // Everything in starter +
    "store",
    "auction",
    "surveys",
    "volunteers",
    "priority-support",
    "hole-in-one-insurance",
  ],
};

const PLAN_HIERARCHY = ["base", "starter", "premium"];

export function usePlanFeatures() {
  const { org, loading } = useOrgContext();
  const plan = org?.plan || "base";

  const hasFeature = (feature: string): boolean => {
    const idx = PLAN_HIERARCHY.indexOf(plan);
    for (let i = 0; i <= idx; i++) {
      const tierFeatures = PLAN_FEATURES[PLAN_HIERARCHY[i]];
      if (tierFeatures?.includes(feature)) return true;
    }
    return false;
  };

  const requiredPlan = (feature: string): string => {
    for (const tier of PLAN_HIERARCHY) {
      if (PLAN_FEATURES[tier]?.includes(feature)) return tier;
    }
    return "premium";
  };

  return { plan, hasFeature, requiredPlan, loading };
}
