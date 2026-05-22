export const MOCK_PARTICIPANTS = [
  { name: "John Smith", handicap: 12.4 },
  { name: "Sarah Jones", handicap: 8.2 },
  { name: "Michael Brown", handicap: 18.0 },
  { name: "Emily Davis", handicap: 14.5 },
  { name: "David Wilson", handicap: 5.1 },
  { name: "Lisa Taylor", handicap: 10.3 },
  { name: "Robert Anderson", handicap: 16.2 },
  { name: "Jennifer Martinez", handicap: 9.7 },
  { name: "Thomas Garcia", handicap: 11.8 },
  { name: "Patricia Rodriguez", handicap: 7.4 },
  { name: "Charles Miller", handicap: 19.2 },
  { name: "Barbara Wilson", handicap: 13.6 },
];

export const MOCK_SPONSORS = [
  { name: "Title Sponsor", level: "Title", logo_color: "#1e40af" },
  { name: "Premier Sponsor", level: "Gold", logo_color: "#d97706" },
  { name: "Supporting Sponsor", level: "Silver", logo_color: "#71717a" },
  { name: "Hole Sponsor", level: "Bronze", logo_color: "#15803d" },
  { name: "Beverage Sponsor", level: "Bronze", logo_color: "#b91c1c" },
  { name: "Prize Sponsor", level: "Bronze", logo_color: "#7e22ce" },
];

export const MOCK_LEADERBOARD = [
  { player_name: "Team Mulligan", gross_score: -8, net_score: -10, thru: 18, position: 1 },
  { player_name: "Albany Auto Group", gross_score: -6, net_score: -8, thru: 18, position: 2 },
  { player_name: "First Tee Foundation", gross_score: -5, net_score: -7, thru: 18, position: 3 },
  { player_name: "Coastal Realty", gross_score: -4, net_score: -5, thru: 18, position: 4 },
  { player_name: "Title Team", gross_score: -3, net_score: -4, thru: 18, position: 5 },
  { player_name: "Youth Golf Academy", gross_score: -2, net_score: -3, thru: 18, position: 6 },
  { player_name: "Smith & Associates", gross_score: -1, net_score: -2, thru: 18, position: 7 },
  { player_name: "Johnson Family", gross_score: 0, net_score: -1, thru: 18, position: 8 },
  { player_name: "Team Charity", gross_score: 2, net_score: 0, thru: 18, position: 9 },
  { player_name: "Birdie Club", gross_score: 3, net_score: 1, thru: 18, position: 10 },
];

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function formatScore(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `${n}`;
}
