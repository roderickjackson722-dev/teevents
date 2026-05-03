import { useOrgContext } from "./useOrgContext";

// Plan tiers (new model):
//   - free / base  → Free tier, 1 active tournament, max 72 players
//   - pro          → Replaces legacy starter/premium. Per-tournament unlock for $399.
//                    Org-level "pro" exists for back-compat (legacy starter/premium orgs were migrated).
//   - enterprise   → Custom contracts. Treated as pro + unlimited.
//
// IMPORTANT: For per-tournament gating use `useTournamentPro(tournamentId)` instead
// of relying on org-level plan, since Pro is unlocked per-tournament under the new model.

export const PLAN_LIMITS: Record<string, { maxTournaments: number; maxPlayers: number }> = {
  free: { maxTournaments: 1, maxPlayers: 72 },
  base: { maxTournaments: 1, maxPlayers: 72 },
  // legacy keys kept so old data still resolves
  starter: { maxTournaments: Infinity, maxPlayers: Infinity },
  premium: { maxTournaments: Infinity, maxPlayers: Infinity },
  pro: { maxTournaments: Infinity, maxPlayers: Infinity },
  enterprise: { maxTournaments: Infinity, maxPlayers: Infinity },
};

const FREE_FEATURES = [
  "tournaments",
  "registration",
  "website",
  "players",
  "check-in",
  "planning-guide",
  "email-messaging",
  "printables",
  "refunds",
  "basic-finances",
];

const PRO_FEATURES = [
  // Everything in Free PLUS:
  "leaderboard",
  "live-scoring",
  "sponsors",
  "auction",
  "donations",
  "store",
  "volunteers",
  "sms-messaging",
  "custom-domain",
  "flyer-studio",
  "surveys",
  "gallery",
  "advanced-pairings",
  "budget",
  "featured-search",
  "team-management-5",
  "auto-payouts",
  "priority-support",
  "all-templates",
  "hole-in-one-insurance",
];

const ENTERPRISE_FEATURES = [
  "white-label",
  "dedicated-manager",
  "custom-integrations",
  "sla-guarantee",
];

const PLAN_FEATURES: Record<string, string[]> = {
  free: FREE_FEATURES,
  base: FREE_FEATURES,
  pro: PRO_FEATURES,
  // legacy compatibility
  starter: PRO_FEATURES,
  premium: PRO_FEATURES,
  enterprise: ENTERPRISE_FEATURES,
};

// Display list used by admin toggle UI
export const ALL_FEATURES = [
  { id: "tournaments", label: "Tournaments" },
  { id: "registration", label: "Registration" },
  { id: "website", label: "Website Builder" },
  { id: "players", label: "Player Management" },
  { id: "check-in", label: "Check-In" },
  { id: "planning-guide", label: "Planning Guide" },
  { id: "email-messaging", label: "Email Messaging" },
  { id: "printables", label: "Printables" },
  { id: "refunds", label: "Refund Management" },
  { id: "basic-finances", label: "Basic Finances" },
  { id: "leaderboard", label: "Live Leaderboard" },
  { id: "live-scoring", label: "Live Scoring" },
  { id: "sponsors", label: "Sponsor Portal" },
  { id: "auction", label: "Auction & Raffle" },
  { id: "donations", label: "Donation Page" },
  { id: "store", label: "Add-On Store" },
  { id: "volunteers", label: "Volunteer Management" },
  { id: "sms-messaging", label: "SMS Blasts" },
  { id: "custom-domain", label: "Custom Domain" },
  { id: "flyer-studio", label: "Flyer Studio" },
  { id: "surveys", label: "Post-Event Surveys" },
  { id: "gallery", label: "Photo Gallery" },
  { id: "advanced-pairings", label: "Advanced Pairings" },
  { id: "budget", label: "Budget Tracking" },
  { id: "featured-search", label: "Featured in Search" },
  { id: "team-management-5", label: "Team (5 members)" },
  { id: "auto-payouts", label: "Auto Stripe Payouts" },
  { id: "priority-support", label: "Priority Support" },
  { id: "all-templates", label: "All Templates" },
  { id: "hole-in-one-insurance", label: "Hole-in-One Insurance" },
  { id: "flyer-studio", label: "Flyer Studio" },
];

// Hierarchy used to inherit lower-tier features
const PLAN_HIERARCHY = ["free", "pro", "enterprise"];

function normalizePlan(plan: string): string {
  if (plan === "starter" || plan === "premium") return "pro";
  if (plan === "base") return "free";
  return plan || "free";
}

export function usePlanFeatures() {
  const { org, loading } = useOrgContext();
  const plan = normalizePlan(org?.plan || "free");
  const overrides = org?.featureOverrides;
  const isDemoOrg = org?.orgName === "Sample Golf Organization";

  const planHasFeature = (feature: string): boolean => {
    const idx = PLAN_HIERARCHY.indexOf(plan);
    for (let i = 0; i <= idx; i++) {
      const tierFeatures = PLAN_FEATURES[PLAN_HIERARCHY[i]];
      if (tierFeatures?.includes(feature)) return true;
    }
    return false;
  };

  const hasFeature = (feature: string): boolean => {
    if (isDemoOrg) return true;
    if (overrides && feature in overrides) return overrides[feature];
    return planHasFeature(feature);
  };

  const requiredPlan = (feature: string): string => {
    for (const tier of PLAN_HIERARCHY) {
      if (PLAN_FEATURES[tier]?.includes(feature)) return tier;
    }
    return "pro";
  };

  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  return { plan, hasFeature, requiredPlan, loading, limits };
}
