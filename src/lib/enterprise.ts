/**
 * Enterprise section shared model.
 *
 * Enterprise events are ordinary rows in `tournaments` with `is_enterprise`
 * set, an `enterprise_event_type` and a simplified settings blob in
 * `enterprise_settings`. Everything else (scoring, leaderboards, printables,
 * registration, payouts) keeps using the existing tournament plumbing.
 */

export type EnterpriseEventType =
  | "single_round"
  | "multi_round"
  | "ryder_cup"
  | "match_bracket"
  | "round_robin";

export const ENTERPRISE_EVENT_TYPES: { value: EnterpriseEventType; label: string; blurb: string }[] = [
  { value: "single_round", label: "Single Round", blurb: "One round, one day." },
  { value: "multi_round", label: "Multi-Round", blurb: "Two or more rounds, same day or across days." },
  { value: "ryder_cup", label: "Ryder Cup", blurb: "Two teams, matches worth points." },
  { value: "match_bracket", label: "Match Bracket", blurb: "Single-elimination match play bracket." },
  { value: "round_robin", label: "Round Robin", blurb: "Every team plays every team." },
];

export const eventTypeLabel = (value?: string | null): string =>
  ENTERPRISE_EVENT_TYPES.find((t) => t.value === value)?.label || "Single Round";

/** Game types offered in the simplified wizard (mapped to scoring_format). */
export const ENTERPRISE_GAME_TYPES: { value: string; label: string }[] = [
  { value: "stroke_play", label: "Stroke Play" },
  { value: "scramble_4", label: "Scramble (4-Player)" },
  { value: "scramble_2", label: "Scramble (2-Player)" },
  { value: "best_ball", label: "Best Ball" },
  { value: "alternate_shot", label: "Alternate Shot" },
  { value: "stableford", label: "Stableford" },
  { value: "match_play", label: "Match Play" },
  { value: "modified_stableford", label: "Modified Stableford" },
  { value: "six_six_six", label: "6-6-6" },
];

export const gameTypeLabel = (value?: string | null): string =>
  ENTERPRISE_GAME_TYPES.find((g) => g.value === value)?.label || (value ? value.replace(/_/g, " ") : "Stroke Play");

export type EnterpriseStatus = "draft" | "ready" | "in_progress" | "complete";

export const ENTERPRISE_STATUSES: { value: EnterpriseStatus; label: string; className: string }[] = [
  { value: "draft", label: "Draft", className: "bg-muted text-muted-foreground" },
  { value: "ready", label: "Ready", className: "bg-secondary text-primary" },
  { value: "in_progress", label: "In Progress", className: "bg-primary/10 text-primary" },
  { value: "complete", label: "Complete", className: "bg-primary text-primary-foreground" },
];

/** Map any legacy tournament status onto the four enterprise statuses. */
export function enterpriseStatusOf(status?: string | null): EnterpriseStatus {
  const s = (status || "").toLowerCase();
  if (s === "complete" || s === "completed" || s === "closed" || s === "archived") return "complete";
  if (s === "in_progress" || s === "live" || s === "active") return "in_progress";
  if (s === "ready" || s === "published" || s === "open") return "ready";
  return "draft";
}

export const statusMeta = (status?: string | null) => {
  const value = enterpriseStatusOf(status);
  return ENTERPRISE_STATUSES.find((s) => s.value === value)!;
};

export interface EnterpriseRound {
  /** "Round 1 — Morning" */
  label: string;
  date: string;
  time: string;
  holes: 9 | 18;
}

export interface EnterpriseRegistrationSettings {
  enabled: boolean;
  closeAt: string;
  maxPlayers: number | null;
  requireFullTeam: boolean;
  requireGhin: boolean;
  allowWaitlist: boolean;
  hideRegisteredPlayers: boolean;
  paid: boolean;
  feeCents: number;
  questions: { id: string; label: string; kind: "text" | "choice" | "tee_time"; options: string[] }[];
}

export interface EnterpriseLeaderboardSettings {
  allowancePlayer1: number;
  allowancePlayer2: number;
  maxCourseHandicap: number | null;
  maxCourseHandicapDiff: number | null;
  startAtHandicap: boolean;
  showFirstLastNames: boolean;
  showFlightUnderTeam: boolean;
  hideScorecards: boolean;
  hideDues: boolean;
  hideLeaderboard: boolean;
  showTotalScore: boolean;
  codelessScoring: boolean;
  showGross: boolean;
  showNet: boolean;
  sponsorImageUrl: string;
  rulesSheetUrl: string;
  tv: {
    speed: number;
    size: number;
    backgroundImageUrl: string;
    leaderOnTop: boolean;
    switchGrossNet: boolean;
    showSkins: boolean;
    switchFlights: boolean;
  };
  eventOptions: {
    showInfoBanner: boolean;
    infoBannerText: string;
    takeItScoring: boolean;
    maxHoleScore: number | null;
    specificHoles: number[];
    bestHoles: "all" | "front9" | "back9";
  };
}

export interface EnterpriseSettings {
  playersPerTeam: number;
  gameType: string;
  holes: 9 | 18;
  skinsGross: boolean;
  skinsNet: boolean;
  deucesGross: boolean;
  deucesNet: boolean;
  rounds: EnterpriseRound[];
  pairings: {
    playersPerPairing: number;
    groupsPerHole: number;
    useLetters: boolean;
  };
  registration: EnterpriseRegistrationSettings;
  leaderboard: EnterpriseLeaderboardSettings;
  scorecardTemplate: string;
  wizardStep: number;
}

export const defaultEnterpriseSettings = (): EnterpriseSettings => ({
  playersPerTeam: 4,
  gameType: "scramble_4",
  holes: 18,
  skinsGross: true,
  skinsNet: false,
  deucesGross: false,
  deucesNet: false,
  rounds: [{ label: "Round 1", date: "", time: "08:00", holes: 18 }],
  pairings: { playersPerPairing: 4, groupsPerHole: 1, useLetters: false },
  registration: {
    enabled: true,
    closeAt: "",
    maxPlayers: null,
    requireFullTeam: false,
    requireGhin: false,
    allowWaitlist: true,
    hideRegisteredPlayers: false,
    paid: false,
    feeCents: 0,
    questions: [],
  },
  leaderboard: {
    allowancePlayer1: 100,
    allowancePlayer2: 100,
    maxCourseHandicap: null,
    maxCourseHandicapDiff: null,
    startAtHandicap: false,
    showFirstLastNames: true,
    showFlightUnderTeam: true,
    hideScorecards: false,
    hideDues: false,
    hideLeaderboard: false,
    showTotalScore: false,
    codelessScoring: false,
    showGross: true,
    showNet: true,
    sponsorImageUrl: "",
    rulesSheetUrl: "",
    tv: {
      speed: 5,
      size: 5,
      backgroundImageUrl: "",
      leaderOnTop: true,
      switchGrossNet: true,
      showSkins: true,
      switchFlights: true,
    },
    eventOptions: {
      showInfoBanner: false,
      infoBannerText: "",
      takeItScoring: false,
      maxHoleScore: null,
      specificHoles: [],
      bestHoles: "all",
    },
  },
  scorecardTemplate: "standard_stroke",
  wizardStep: 0,
});

/** Merge stored JSON over the defaults so older rows never break the UI. */
export function parseEnterpriseSettings(raw: unknown): EnterpriseSettings {
  const base = defaultEnterpriseSettings();
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  return {
    ...base,
    ...obj,
    rounds: Array.isArray(obj.rounds) && obj.rounds.length ? obj.rounds : base.rounds,
    pairings: { ...base.pairings, ...(obj.pairings || {}) },
    registration: { ...base.registration, ...(obj.registration || {}) },
    leaderboard: {
      ...base.leaderboard,
      ...(obj.leaderboard || {}),
      tv: { ...base.leaderboard.tv, ...((obj.leaderboard || {}).tv || {}) },
      eventOptions: { ...base.leaderboard.eventOptions, ...((obj.leaderboard || {}).eventOptions || {}) },
    },
  } as EnterpriseSettings;
}

export interface EnterpriseEventRow {
  id: string;
  title: string;
  date: string | null;
  course_name: string | null;
  status: string;
  slug: string | null;
  scoring_format: string | null;
  enterprise_event_type: string | null;
  enterprise_settings: unknown;
  player_count?: number;
}
