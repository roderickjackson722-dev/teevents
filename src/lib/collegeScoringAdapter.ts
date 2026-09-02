/**
 * Data adapters for the college scoring workspace.
 *
 * The same workspace UI is used by two audiences:
 *  - signed-in organizers / org members (RLS-scoped table access)
 *  - scoring admins signed in with an email + 6-digit passcode (token RPCs)
 *
 * Both implement the same interface so the workspace stays free of auth logic.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  type PlayerRow,
  type ScoreCell,
  type PlayerStatus,
  normalizeStatus,
  parseDivisions,
  type Division,
} from "@/lib/collegeScoring";

export interface ScoringEvent {
  id: string;
  title: string;
  eventTitle: string | null;
  date: string | null;
  divisions: Division[];
  rounds: number;
  /** Players per team (college events); defaults to 5. */
  teamSize: number;
  /** How many player scores count toward the team total; defaults to 4. */
  countingScores: number;
  /** True when the College Golf Scoring add-on is paid for (or admin-enabled) on this event. */
  entitled: boolean;
  /** Number of divisions covered by the purchase (0 = none). */
  divisionsPurchased: number;
}

export interface ScoringAdapter {
  /** Events this user may score. */
  listEvents: () => Promise<ScoringEvent[]>;
  loadRoster: (tournamentId: string) => Promise<PlayerRow[]>;
  loadScores: (tournamentId: string) => Promise<ScoreCell[]>;
  saveRound: (
    tournamentId: string,
    registrationId: string,
    round: number,
    scores: Record<number, string>
  ) => Promise<void>;
  setStatus: (
    tournamentId: string,
    registrationId: string,
    status: PlayerStatus,
    reason?: string
  ) => Promise<void>;
  /** Only organizers may edit divisions, teams and rounds. */
  canEditSetup: boolean;
}

function mapRoster(rows: any[]): PlayerRow[] {
  return (rows || []).map((r) => ({
    registration_id: r.registration_id ?? r.id,
    first_name: r.first_name ?? null,
    last_name: r.last_name ?? null,
    status: normalizeStatus(r.status),
    status_reason: r.status_reason ?? null,
    team_id: r.team_id ?? null,
    team_name: r.team_name ?? r.tournament_teams?.team_name ?? null,
    division_id: r.division_id ?? null,
    group_number: r.group_number ?? null,
    group_label: r.group_label ?? null,
  }));
}

/** Organizer / org-member adapter. */
export function createOrgAdapter(organizationId: string): ScoringAdapter {
  return {
    canEditSetup: true,
    async listEvents() {
      const { data, error } = await (supabase as any)
        .from("tournaments")
        .select(
          "id, title, event_title, date, divisions, scoring_rounds, college_team_size, college_counting_scores, college_scoring_paid, college_scoring_enabled, college_scoring_divisions, college_scoring_divisions_purchased, paid_features",
        )
        .eq("organization_id", organizationId)
        .eq("archived", false)
        .order("date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        eventTitle: t.event_title ?? null,
        date: t.date ?? null,
        divisions: parseDivisions(t.divisions),
        rounds: Math.max(1, Number(t.scoring_rounds) || 1),
        teamSize: Math.max(1, Number(t.college_team_size) || 5),
        countingScores: Math.max(1, Number(t.college_counting_scores) || 4),
        entitled:
          !!t.college_scoring_paid ||
          !!t.college_scoring_enabled ||
          !!t.paid_features?.college_scoring ||
          !!t.paid_features?.bundle,
        divisionsPurchased: Math.max(
          0,
          Number(t.college_scoring_divisions_purchased ?? t.college_scoring_divisions) || 0,
        ),
      }));
    },
    async loadRoster(tournamentId) {
      const { data, error } = await (supabase as any)
        .from("tournament_registrations")
        .select(
          "id, first_name, last_name, status, status_reason, team_id, division_id, group_number, group_label, tournament_teams(team_name)"
        )
        .eq("tournament_id", tournamentId)
        .order("last_name", { ascending: true });
      if (error) throw error;
      return mapRoster(data);
    },
    async loadScores(tournamentId) {
      const rows: ScoreCell[] = [];
      const pageSize = 5000;
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await (supabase as any)
          .from("tournament_scores")
          .select("registration_id, round_number, hole_number, strokes")
          .eq("tournament_id", tournamentId)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        rows.push(
          ...(data || []).map((r: any) => ({
            registration_id: r.registration_id,
            round_number: Number(r.round_number || 1),
            hole_number: Number(r.hole_number),
            strokes: Number(r.strokes),
          }))
        );
        if (!data || data.length < pageSize) break;
      }
      return rows;
    },
    async saveRound(tournamentId, registrationId, round, scores) {
      const upserts: any[] = [];
      const deletes: number[] = [];
      Object.entries(scores).forEach(([hole, raw]) => {
        const holeNumber = Number(hole);
        const value = String(raw ?? "").trim();
        if (!value) {
          deletes.push(holeNumber);
          return;
        }
        const strokes = parseInt(value, 10);
        if (!Number.isFinite(strokes) || strokes < 1 || strokes > 20) return;
        upserts.push({
          tournament_id: tournamentId,
          registration_id: registrationId,
          round_number: round,
          hole_number: holeNumber,
          strokes,
        });
      });

      if (deletes.length) {
        const { error } = await (supabase as any)
          .from("tournament_scores")
          .delete()
          .eq("tournament_id", tournamentId)
          .eq("registration_id", registrationId)
          .eq("round_number", round)
          .in("hole_number", deletes);
        if (error) throw error;
      }
      if (upserts.length) {
        const { error } = await (supabase as any)
          .from("tournament_scores")
          .upsert(upserts, { onConflict: "registration_id,round_number,hole_number" });
        if (error) throw error;
      }
    },
    async setStatus(tournamentId, registrationId, status, reason) {
      const { error } = await (supabase as any)
        .from("tournament_registrations")
        .update({
          status,
          status_reason: reason || null,
          status_updated_at: new Date().toISOString(),
        })
        .eq("id", registrationId)
        .eq("tournament_id", tournamentId);
      if (error) throw error;
    },
  };
}

/** Scoring-admin adapter: every call is gated by the session token server-side. */
export function createTokenAdapter(token: string): ScoringAdapter {
  return {
    canEditSetup: false,
    async listEvents() {
      const { data, error } = await (supabase as any).rpc("scoring_admin_events", { _token: token });
      if (error) throw error;
      return (data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        eventTitle: t.event_title ?? null,
        date: t.date ?? null,
        divisions: parseDivisions(t.divisions),
        rounds: Math.max(1, Number(t.scoring_rounds) || 1),
        teamSize: Math.max(1, Number(t.college_team_size) || 5),
        countingScores: Math.max(1, Number(t.college_counting_scores) || 4),
        entitled: true,
        divisionsPurchased: parseDivisions(t.divisions).length,
      }));
    },
    async loadRoster(tournamentId) {
      const { data, error } = await (supabase as any).rpc("scoring_admin_roster", {
        _token: token,
        _tournament_id: tournamentId,
      });
      if (error) throw error;
      return mapRoster(data);
    },
    async loadScores(tournamentId) {
      const { data, error } = await (supabase as any).rpc("scoring_admin_scores", {
        _token: token,
        _tournament_id: tournamentId,
      });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        registration_id: r.registration_id,
        round_number: Number(r.round_number || 1),
        hole_number: Number(r.hole_number),
        strokes: Number(r.strokes),
      }));
    },
    async saveRound(tournamentId, registrationId, round, scores) {
      const payload: Record<string, number | null> = {};
      Object.entries(scores).forEach(([hole, raw]) => {
        const value = String(raw ?? "").trim();
        payload[hole] = value ? parseInt(value, 10) : null;
      });
      const { error } = await (supabase as any).rpc("scoring_admin_save_round", {
        _token: token,
        _tournament_id: tournamentId,
        _registration_id: registrationId,
        _round_number: round,
        _scores: payload,
      });
      if (error) throw error;
    },
    async setStatus(tournamentId, registrationId, status, reason) {
      const { error } = await (supabase as any).rpc("scoring_admin_set_status", {
        _token: token,
        _tournament_id: tournamentId,
        _registration_id: registrationId,
        _status: status,
        _reason: reason || null,
      });
      if (error) throw error;
    },
  };
}
