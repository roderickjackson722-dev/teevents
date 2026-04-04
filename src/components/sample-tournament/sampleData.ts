export const sampleTournament = {
  id: "demo-tournament-001",
  name: "Pebble Beach Charity Classic",
  date: "June 15, 2026",
  location: "Pebble Beach Golf Links, Pebble Beach, CA",
  registration_fee: 150,
  fee_model: "pass_to_golfer",
  max_players: 72,
  current_registrations: 54,
  description:
    "Join us for a day of golf supporting local youth programs. Includes breakfast, lunch, and awards dinner.",
};

export const sampleLeaderboard = [
  { position: 1, name: "Team Mulligan", score: -8, thru: 18 },
  { position: 2, name: "Albany Auto Group", score: -6, thru: 18 },
  { position: 3, name: "First Tee Foundation", score: -5, thru: 18 },
  { position: 4, name: "Coastal Realty", score: -4, thru: 18 },
  { position: 5, name: "Pebble Beach Resorts", score: -3, thru: 18 },
  { position: 6, name: "Eagle Estates", score: -2, thru: 17 },
  { position: 7, name: "Birdie Brigade", score: -1, thru: 16 },
  { position: 8, name: "Par Patrol", score: 0, thru: 18 },
  { position: 9, name: "Bogey Bandits", score: 1, thru: 15 },
  { position: 10, name: "Fairway Legends", score: 2, thru: 14 },
];

export const sampleSponsors = [
  {
    name: "Title Sponsor",
    logo: "https://placehold.co/200x100/1a365d/ffffff?text=Title+Sponsor",
    level: "Platinum",
    website: "#",
  },
  {
    name: "Golf Pro Shop",
    logo: "https://placehold.co/200x100/2d6a4f/ffffff?text=Golf+Pro+Shop",
    level: "Gold",
    website: "#",
  },
  {
    name: "Luxury Auto",
    logo: "https://placehold.co/200x100/7c3aed/ffffff?text=Luxury+Auto",
    level: "Silver",
    website: "#",
  },
  {
    name: "Sports Drink",
    logo: "https://placehold.co/200x100/dc2626/ffffff?text=Sports+Drink",
    level: "Bronze",
    website: "#",
  },
];

export const sampleVolunteerShifts = [
  { role: "Check-in Desk", start: "7:00 AM", end: "10:00 AM", slots: 3, filled: 2 },
  { role: "Beverage Cart", start: "9:00 AM", end: "2:00 PM", slots: 2, filled: 1 },
  { role: "Scoring Tent", start: "11:00 AM", end: "3:00 PM", slots: 4, filled: 3 },
  { role: "Awards Setup", start: "2:00 PM", end: "5:00 PM", slots: 3, filled: 0 },
  { role: "Photography", start: "8:00 AM", end: "4:00 PM", slots: 1, filled: 1 },
];

export const sampleFinances = {
  total_collected: 8100,
  platform_fees: 324,
  pending_hold: 1215,
  available_balance: 0,
  next_payout_date: "May 5, 2026",
};

export const sampleTransactions = [
  { golfer: "John Smith", date: "Apr 1, 2026", gross: 150, fee: 6, hold: 22.5, net: 121.5, status: "Held" },
  { golfer: "Sarah Jones", date: "Mar 30, 2026", gross: 150, fee: 6, hold: 22.5, net: 121.5, status: "Held" },
  { golfer: "Mike Chen", date: "Mar 28, 2026", gross: 150, fee: 6, hold: 22.5, net: 121.5, status: "Released" },
  { golfer: "Emily Davis", date: "Mar 25, 2026", gross: 150, fee: 6, hold: 22.5, net: 121.5, status: "Released" },
  { golfer: "Robert Wilson", date: "Mar 22, 2026", gross: 150, fee: 6, hold: 22.5, net: 121.5, status: "Paid" },
];
