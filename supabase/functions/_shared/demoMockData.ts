// Shared mock data for demo tournaments.

export const MOCK_PLAYERS = [
  { name: "John Smith", email: "john.smith@example.com", handicap: 12.4, shirt_size: "Large", group_name: "Group A", tee_time: "08:00" },
  { name: "Sarah Jones", email: "sarah.jones@example.com", handicap: 8.2, shirt_size: "Medium", group_name: "Group A", tee_time: "08:00" },
  { name: "Michael Brown", email: "michael.brown@example.com", handicap: 18.0, shirt_size: "XL", group_name: "Group B", tee_time: "08:10" },
  { name: "Emily Davis", email: "emily.davis@example.com", handicap: 14.5, shirt_size: "Small", group_name: "Group B", tee_time: "08:10" },
  { name: "David Wilson", email: "david.wilson@example.com", handicap: 5.1, shirt_size: "Large", group_name: "Group C", tee_time: "08:20" },
  { name: "Lisa Taylor", email: "lisa.taylor@example.com", handicap: 10.3, shirt_size: "Medium", group_name: "Group C", tee_time: "08:20" },
  { name: "Robert Anderson", email: "robert.anderson@example.com", handicap: 16.2, shirt_size: "XL", group_name: "Group D", tee_time: "08:30" },
  { name: "Jennifer Martinez", email: "jennifer.martinez@example.com", handicap: 9.7, shirt_size: "Small", group_name: "Group D", tee_time: "08:30" },
  { name: "Thomas Garcia", email: "thomas.garcia@example.com", handicap: 11.8, shirt_size: "Large", group_name: "Group E", tee_time: "08:40" },
  { name: "Patricia Rodriguez", email: "patricia.rodriguez@example.com", handicap: 7.4, shirt_size: "Medium", group_name: "Group E", tee_time: "08:40" },
  { name: "Charles Miller", email: "charles.miller@example.com", handicap: 19.2, shirt_size: "XL", group_name: "Group F", tee_time: "08:50" },
  { name: "Barbara Williams", email: "barbara.williams@example.com", handicap: 13.6, shirt_size: "Medium", group_name: "Group F", tee_time: "08:50" },
];

export const MOCK_SPONSORS = [
  { name: "Title Sponsor", level: "Title", logo_url: "https://placehold.co/200x100/1a5c38/ffffff?text=Title+Sponsor", website_url: "#" },
  { name: "Premier Partner", level: "Gold", logo_url: "https://placehold.co/200x100/F5A623/1a5c38?text=Premier+Partner", website_url: "#" },
  { name: "Supporting Sponsor", level: "Silver", logo_url: "https://placehold.co/200x100/9ca3af/ffffff?text=Supporting", website_url: "#" },
  { name: "Beverage Sponsor", level: "Bronze", logo_url: "https://placehold.co/200x100/b45309/ffffff?text=Beverage", website_url: "#" },
  { name: "Prize Sponsor", level: "Bronze", logo_url: "https://placehold.co/200x100/b45309/ffffff?text=Prize", website_url: "#" },
  { name: "Media Partner", level: "Bronze", logo_url: "https://placehold.co/200x100/b45309/ffffff?text=Media", website_url: "#" },
];

// 10 leaderboard teams. We generate 18 hole-scores per team so the live
// leaderboard has data to render. Target totals roughly match the spec.
export const MOCK_TEAMS = [
  { name: "Team Mulligan", target: -8 },
  { name: "Albany Auto Group", target: -6 },
  { name: "First Tee Foundation", target: -5 },
  { name: "Coastal Realty", target: -4 },
  { name: "Title Sponsor Team", target: -3 },
  { name: "Youth Golf Academy", target: -2 },
  { name: "Smith & Associates", target: -1 },
  { name: "Johnson Family", target: 0 },
  { name: "Team Charity", target: 2 },
  { name: "Birdie Club", target: 3 },
];

export function buildMockScoreRows(demoTournamentId: string) {
  const rows: { demo_tournament_id: string; player_name: string; hole_number: number; gross_score: number }[] = [];
  for (const team of MOCK_TEAMS) {
    // Par 4 baseline (72 par over 18 holes). Distribute the over/under target across holes.
    let remaining = team.target;
    for (let hole = 1; hole <= 18; hole++) {
      let delta = 0;
      if (remaining !== 0) {
        const step = remaining > 0 ? 1 : -1;
        // pick some holes to apply deltas
        if (Math.abs(remaining) >= 19 - hole || Math.random() < 0.4) {
          delta = step;
          remaining -= step;
        }
      }
      rows.push({
        demo_tournament_id: demoTournamentId,
        player_name: team.name,
        hole_number: hole,
        gross_score: 4 + delta,
      });
    }
  }
  return rows;
}
