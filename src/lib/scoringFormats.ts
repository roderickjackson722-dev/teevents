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

/**
 * Formats that record exactly ONE score per team per hole (stored as a single
 * team record, never one per player): every Scramble and Alternate Shot.
 */
export const TEAM_SCORE_FORMAT_IDS = ["scramble_2", "scramble_3", "scramble_4", "alternate_shot"] as const;
export function isTeamScoreFormat(id: string | null | undefined): boolean {
  return !!id && (TEAM_SCORE_FORMAT_IDS as readonly string[]).includes(id);
}

/**
 * Stableford points for a hole from strokes and par: more than 1 over par 0,
 * bogey 1, par 2, birdie 3, eagle 4, albatross 5, 4 under par 6.
 * A blank or picked-up hole (null) is worth 0.
 */
export function stablefordPoints(strokes: number | null | undefined, holePar: number): number {
  if (strokes == null || !Number.isFinite(strokes) || strokes <= 0) return 0;
  const diff = strokes - holePar;
  if (diff >= 2) return 0;
  if (diff === 1) return 1;
  if (diff === 0) return 2;
  if (diff === -1) return 3;
  if (diff === -2) return 4;
  if (diff === -3) return 5;
  return 6;
}
