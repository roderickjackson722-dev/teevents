export type PlatformKey = "google_forms" | "eventbrite" | "zeffy_givebutter" | "other";

export interface TalkingPoint {
  pain: string;
  solution: string;
}

export const PLATFORM_LABELS: Record<PlatformKey, string> = {
  google_forms: "Google Forms / Spreadsheets",
  eventbrite: "Eventbrite",
  zeffy_givebutter: "Zeffy / GiveButter",
  other: "Another platform",
};

export const TALKING_POINTS: Record<PlatformKey, TalkingPoint[]> = {
  google_forms: [
    { pain: "Juggling multiple spreadsheets", solution: "All-in-one dashboard – players, payments, sponsors, pairings" },
    { pain: "Manual payment tracking", solution: "Stripe integration – automatic checkout, instant payouts" },
    { pain: "No professional website", solution: "Branded tournament site – live in 10 minutes" },
    { pain: "No live scoring", solution: "Players enter scores via QR code – leaderboard updates live" },
    { pain: "No sponsor management", solution: "Sponsor portal, asset delivery, ROI tracking" },
    { pain: "No volunteer coordination", solution: "Shift scheduling, QR check-in, automated reminders" },
  ],
  eventbrite: [
    { pain: "No live leaderboard", solution: "Built-in live leaderboard with gross/net toggle" },
    { pain: "No hole sponsors", solution: "Dedicated sponsor management with asset delivery" },
    { pain: "No volunteer check-in", solution: "QR code check-in for volunteers and players" },
    { pain: "No pairings or tee sheets", solution: "Drag-and-drop pairings with hole assignments" },
    { pain: "Funds held until after event", solution: "Stripe Connect – automatic payouts (no holding)" },
    { pain: "High fees", solution: "5% platform fee vs. Eventbrite's 8.5%+" },
  ],
  zeffy_givebutter: [
    { pain: "General fundraising platform", solution: "Built specifically for golf tournaments" },
    { pain: "No live scoring", solution: "QR scoring with live leaderboard" },
    { pain: "No pairings or tee sheets", solution: "Drag-and-drop pairings with hole assignments" },
    { pain: "No sponsor management", solution: "Sponsor portal with asset delivery" },
    { pain: "Limited customization", solution: "Branded tournament website with custom domain" },
  ],
  other: [
    { pain: "Disconnected tools", solution: "One platform for registration, payments, scoring, sponsors, and reporting" },
    { pain: "Manual work day-of", solution: "QR check-in, live scoring, automated leaderboard" },
    { pain: "Slow or held payouts", solution: "Stripe Connect direct payouts to your bank" },
  ],
};

export const DEFAULT_CHECKLIST: { key: string; label: string }[] = [
  { key: "confirm_details", label: "Confirm tournament details (name, date, location)" },
  { key: "hero_image", label: "Confirm hero image uploaded" },
  { key: "test_links", label: "Test demo links (website, dashboard, live leaderboard)" },
  { key: "review_points", label: "Review competitor talking points" },
  { key: "follow_up", label: "Prepare follow-up email template" },
  { key: "calendly", label: "Set up Calendly link for next step" },
];

export const AGENDA_FLOW: { title: string; minutes: number; bullets: string[] }[] = [
  { title: "Opening", minutes: 2, bullets: ["Address their current pain points", "Set context for the 15-minute walkthrough"] },
  { title: "Tournament Setup", minutes: 3, bullets: ["Create tournament in 60 seconds", "Branded site live in 10 minutes", "Custom domain support"] },
  { title: "Event Day", minutes: 3, bullets: ["QR check-in", "Live scoring", "Real-time leaderboard"] },
  { title: "Operations", minutes: 2, bullets: ["Pairings & tee sheets", "Volunteer coordination", "Printables (scorecards, cart signs)"] },
  { title: "Finance", minutes: 2, bullets: ["Stripe Connect direct payouts", "5% platform fee — no holds", "Transparent transaction history"] },
  { title: "Promotion & Post-Event", minutes: 1, bullets: ["Sponsor portal & ROI", "Surveys & follow-up", "Photo gallery"] },
  { title: "Closing", minutes: 2, bullets: ["Next steps", "Convert to live tournament", "Q&A"] },
];
