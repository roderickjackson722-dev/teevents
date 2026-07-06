import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyTournaments from "./tools/list-my-tournaments";
import getTournamentRegistrations from "./tools/get-tournament-registrations";
import searchPublicTournaments from "./tools/search-public-tournaments";

// OAuth issuer MUST be the direct Supabase host (built from the project ref,
// inlined by Vite at build time so this file stays import-safe).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "teevents-mcp",
  title: "TeeVents",
  version: "0.1.0",
  instructions:
    "Tools for TeeVents, a golf tournament management platform. Use `list_my_tournaments` to see the signed-in organizer's tournaments, `get_tournament_registrations` to inspect registrations for a specific tournament, and `search_public_tournaments` to find publicly listed tournaments (no auth required).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listMyTournaments, getTournamentRegistrations, searchPublicTournaments],
});
