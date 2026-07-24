// Pure logic for the "Switch Workspace" button so it can be unit-tested
// without React/router/Supabase context.

export type WorkspaceType = "tournament" | "league";

export interface MembershipRow {
  organization_id: string;
  workspace_type: WorkspaceType | null | undefined;
}

export interface SwitchDecision {
  action: "navigate";
  path: string;
}

/**
 * Decide where the Switch Workspace button should navigate.
 *
 * Rules:
 * - No session → sign-in via /select-workspace (guard redirects).
 * - User has any other workspace (tournament + league, or multiple of the
 *   opposite type) → send them to /select-workspace so they can pick without
 *   going through a create flow.
 * - User has exactly one workspace of the opposite type → jump straight to
 *   that dashboard.
 * - User has no workspace of the opposite type → /create-workspace with a
 *   ?reason=switch banner explaining why.
 */
export function decideWorkspaceSwitch(
  memberships: MembershipRow[],
  currentPathname: string,
): SwitchDecision {
  const onLeagueDashboard = currentPathname.startsWith("/dashboard/leagues");
  const currentType: WorkspaceType = onLeagueDashboard ? "league" : "tournament";
  const targetType: WorkspaceType = onLeagueDashboard ? "tournament" : "league";

  const opposites = memberships.filter(
    (m) => (m.workspace_type || "tournament") === targetType,
  );
  const others = memberships.filter(
    (m) => (m.workspace_type || "tournament") !== currentType,
  );

  if (opposites.length === 1) {
    const orgId = opposites[0].organization_id;
    return {
      action: "navigate",
      path:
        targetType === "league"
          ? `/dashboard/leagues?admin_org=${orgId}`
          : `/dashboard?admin_org=${orgId}`,
    };
  }

  if (others.length > 1) {
    return { action: "navigate", path: "/select-workspace" };
  }

  return {
    action: "navigate",
    path: `/create-workspace?type=${targetType}&reason=switch`,
  };
}
