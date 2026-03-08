export interface ScoringFormat {
  id: string;
  name: string;
  description: string;
  teamSize: number;
  /** How the final score per hole is determined */
  scoring: "individual" | "best_ball" | "scramble" | "stableford" | "alternate_shot" | "shamble";
}

export const SCORING_FORMATS: ScoringFormat[] = [
  {
    id: "stroke_play",
    name: "Individual Stroke Play",
    description: "Each player plays their own ball and records total strokes. Lowest total score wins.",
    teamSize: 1,
    scoring: "individual",
  },
  {
    id: "scramble_4",
    name: "4-Person Scramble",
    description: "All 4 players tee off, pick the best shot, then all play from that spot. Most popular charity format.",
    teamSize: 4,
    scoring: "scramble",
  },
  {
    id: "scramble_2",
    name: "2-Person Scramble",
    description: "Both players tee off each hole, select the best drive, then alternate or choose best shot to the hole.",
    teamSize: 2,
    scoring: "scramble",
  },
  {
    id: "best_ball_2",
    name: "2-Man Best Ball",
    description: "Both players play their own ball. The lowest score between the two on each hole counts as the team score.",
    teamSize: 2,
    scoring: "best_ball",
  },
  {
    id: "best_ball_4",
    name: "4-Man Best Ball",
    description: "All 4 players play their own ball. The lowest individual score on each hole counts for the team.",
    teamSize: 4,
    scoring: "best_ball",
  },
  {
    id: "stableford",
    name: "Stableford",
    description: "Points awarded per hole based on score vs. par: double bogey+ = 0, bogey = 1, par = 2, birdie = 3, eagle = 4. Highest points wins.",
    teamSize: 1,
    scoring: "stableford",
  },
  {
    id: "alternate_shot",
    name: "Alternate Shot (Foursomes)",
    description: "Two-person teams alternate hitting the same ball. Partners take turns teeing off on odd/even holes.",
    teamSize: 2,
    scoring: "alternate_shot",
  },
  {
    id: "shamble",
    name: "Shamble",
    description: "All players tee off and pick the best drive, then each plays their own ball from that spot. Best individual score counts.",
    teamSize: 4,
    scoring: "shamble",
  },
];

export function getFormatById(id: string): ScoringFormat | undefined {
  return SCORING_FORMATS.find((f) => f.id === id);
}

/** Stableford points for a hole given strokes and par */
export function stablefordPoints(strokes: number, holePar: number): number {
  const diff = strokes - holePar;
  if (diff >= 2) return 0;  // double bogey or worse
  if (diff === 1) return 1; // bogey
  if (diff === 0) return 2; // par
  if (diff === -1) return 3; // birdie
  if (diff === -2) return 4; // eagle
  return 5; // albatross or better
}
