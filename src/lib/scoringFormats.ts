export interface ScoringFormat {
  id: string;
  name: string;
  description: string;
  teamSize: number;
  /** How the final score per hole is determined */
  scoring: "individual" | "best_ball" | "scramble" | "stableford" | "alternate_shot" | "shamble" | "shootout";
}

export const SCORING_FORMATS: ScoringFormat[] = [
  {
    id: "stroke_play",
    name: "Individual Stroke Play",
    description: "Every player plays their own ball and counts every stroke. Lowest total score wins.",
    teamSize: 1,
    scoring: "individual",
  },
  {
    id: "scramble_4",
    name: "4-Person Scramble",
    description: "All four players hit from the best shot each time. One team score per hole. Lowest team total wins.",
    teamSize: 4,
    scoring: "scramble",
  },
  {
    id: "scramble_2",
    name: "2-Person Scramble",
    description: "Both players hit from the best shot each time. One team score per hole. Lowest team total wins.",
    teamSize: 2,
    scoring: "scramble",
  },
  {
    id: "scramble_3",
    name: "3-Person Scramble",
    description: "All three players hit from the best shot each time. One team score per hole. Lowest team total wins.",
    teamSize: 3,
    scoring: "scramble",
  },
  {
    id: "shootout",
    name: "Shootout",
    description: "Everyone plays, and the worst score on each hole is eliminated, one player per hole, until one player is left standing.",
    teamSize: 2,
    scoring: "shootout",
  },
  {

    id: "best_ball_2",
    name: "2-Man Best Ball",
    description: "Both partners play their own ball. The lowest score on each hole counts for the team.",
    teamSize: 2,
    scoring: "best_ball",
  },
  {
    id: "best_ball_4",
    name: "4-Man Best Ball",
    description: "All four partners play their own ball. The best score (or best two, if the organizer picks that) on each hole counts for the team.",
    teamSize: 4,
    scoring: "best_ball",
  },
  {
    id: "stableford",
    name: "Stableford",
    description: "Points instead of strokes. Points are earned per hole from your net score against par. Most points wins.",
    teamSize: 1,
    scoring: "stableford",
  },
  {
    id: "alternate_shot",
    name: "Alternate Shot (Foursomes)",
    description: "Two partners share one ball and take turns hitting it. One team score per hole. Lowest team total wins.",
    teamSize: 2,
    scoring: "alternate_shot",
  },
  {
    id: "shamble_2",
    name: "2-Person Shamble",
    description: "Both players tee off, the team picks the best drive, then each plays their own ball in from there.",
    teamSize: 2,
    scoring: "shamble",
  },
  {
    id: "shamble_3",
    name: "3-Person Shamble",
    description: "All three players tee off, the team picks the best drive, then each plays their own ball in from there.",
    teamSize: 3,
    scoring: "shamble",
  },
  {
    // Kept as "shamble" so existing events keep their saved format.
    id: "shamble",
    name: "4-Person Shamble",
    description: "All four players tee off, the team picks the best drive, then each plays their own ball in from there.",
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
