import shotCheckIn from "@/assets/proposal-Check_in.png.asset.json";
import shotCover from "@/assets/proposal-Cover_and_Branded_event_page.png.asset.json";
import shotBudget from "@/assets/proposal-Live_budget_tracking.png.asset.json";
import shotScoring from "@/assets/proposal-Live_scoring_and_leaderboard.png.asset.json";
import shotPairings from "@/assets/proposal-Pairings.png.asset.json";
import shotRegistration from "@/assets/proposal-Registration.png.asset.json";
import shotAuction from "@/assets/proposal-Sponsor_and_auction_tools.png.asset.json";
import shotTiers from "@/assets/proposal-Sponsor_tiers.png.asset.json";
import type { ProposalScreen, WebDocument } from "./content";

/** The original sample screens; used until a proposal saves its own list. */
export function defaultScreens(): ProposalScreen[] {
  return [
    ["cover", "Cover and Branded event page", "Sample", shotCover.url],
    ["registration", "Registration", "Sample", shotRegistration.url],
    ["tiers", "Sponsor tiers", "Sample", shotTiers.url],
    ["pairings", "Pairings", "Test data only", shotPairings.url],
    ["checkin", "Check in", "Test data only", shotCheckIn.url],
    ["scoring", "Live scoring and leaderboard", "Sample scores", shotScoring.url],
    ["auction", "Sponsor and auction tools", "Test data only", shotAuction.url],
    ["budget", "Live budget tracking", "Test data only", shotBudget.url],
  ].map(([id, title, caption, url]) => ({ id, title, caption, url }));
}
export function proposalScreens(d: WebDocument) { return d.screens ?? defaultScreens(); }
