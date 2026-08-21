import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Team members + pending invitations for one tournament. */
export const listTournamentTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { tournamentId: string }) => {
    if (!data?.tournamentId) throw new Error("tournamentId is required");
    return { tournamentId: data.tournamentId };
  })
  .handler(async ({ data, context }: any) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: canManage } = await supabaseAdmin.rpc("can_manage_tournament_team", {
      _user_id: userId,
      _tournament_id: data.tournamentId,
    });

    const { data: roles } = await supabaseAdmin
      .from("tournament_roles")
      .select("id, user_id, role, name, permissions, invited_at, accepted_at, is_active")
      .eq("tournament_id", data.tournamentId)
      .order("invited_at", { ascending: true });

    const members: any[] = [];
    for (const r of roles || []) {
      let email: string | null = null;
      try {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
        email = u?.user?.email ?? null;
      } catch {
        email = null;
      }
      members.push({
        id: r.id,
        userId: r.user_id,
        email,
        name: r.name,
        role: r.role,
        permissions: r.permissions || [],
        status: r.is_active === false ? "Inactive" : "Active",
      });
    }

    const { data: invites } = await supabaseAdmin
      .from("tournament_invitations")
      .select("id, email, name, role, invited_at, expires_at, accepted_at, is_active")
      .eq("tournament_id", data.tournamentId)
      .is("accepted_at", null)
      .eq("is_active", true)
      .order("invited_at", { ascending: true });

    return {
      canManage: canManage === true,
      members,
      invitations: (invites || []).map((i: any) => ({
        id: i.id,
        email: i.email,
        name: i.name,
        role: i.role,
        expiresAt: i.expires_at,
        status: "Pending",
      })),
    };
  });

/** Invites a team member to a tournament (existing account => instant access, otherwise email invite). */
export const inviteTournamentTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    tournamentId: string;
    email: string;
    name?: string;
    role?: string;
    permissions?: string[];
  }) => {
    if (!data?.tournamentId) throw new Error("tournamentId is required");
    const email = String(data.email || "").toLowerCase().trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("A valid email is required");
    return {
      tournamentId: data.tournamentId,
      email,
      name: (data.name || "").trim().slice(0, 255) || null,
      role: data.role || "editor",
      permissions: data.permissions || [],
    };
  })
  .handler(async ({ data, context }: any) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      TOURNAMENT_TEAM_ROLES,
      labelRole,
      siteBaseUrl,
      generateInviteToken,
      sendTeamEmail,
      findAuthUserByEmail,
    } = await import("./tournamentTeam.server");

    const { data: canManage } = await supabaseAdmin.rpc("can_manage_tournament_team", {
      _user_id: userId,
      _tournament_id: data.tournamentId,
    });
    if (canManage !== true) throw new Error("You don't have permission to manage this tournament's team");

    const role = (TOURNAMENT_TEAM_ROLES as readonly string[]).includes(data.role)
      ? data.role
      : "editor";

    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("id, title")
      .eq("id", data.tournamentId)
      .maybeSingle();
    if (!tournament) throw new Error("Tournament not found");

    const baseUrl = siteBaseUrl();
    const existing = await findAuthUserByEmail(supabaseAdmin, data.email);

    if (existing) {
      const { error } = await supabaseAdmin.from("tournament_roles").upsert(
        {
          user_id: existing.id,
          tournament_id: data.tournamentId,
          role,
          name: data.name,
          permissions: data.permissions,
          invited_by: userId,
          accepted_at: new Date().toISOString(),
          is_active: true,
        },
        { onConflict: "user_id,tournament_id" },
      );
      if (error) throw new Error(error.message);

      await supabaseAdmin
        .from("tournament_invitations")
        .update({ accepted_at: new Date().toISOString(), is_active: false })
        .eq("tournament_id", data.tournamentId)
        .eq("email", data.email);

      const mail = await sendTeamEmail({
        recipientEmail: data.email,
        recipientName: data.name,
        heading: `You've been added to ${tournament.title}`,
        body: `You now have <strong>${labelRole(role)}</strong> access to <strong>${tournament.title}</strong> on TeeVents. Sign in and you'll find it listed in your dashboard.`,
        buttonUrl: `${baseUrl}/dashboard`,
        buttonText: "Go to Dashboard",
      });

      return { success: true, existingUser: true, emailSent: mail.sent, emailError: mail.error ?? null };
    }

    const token = generateInviteToken();
    const { error: inviteErr } = await supabaseAdmin.from("tournament_invitations").upsert(
      {
        email: data.email,
        tournament_id: data.tournamentId,
        role,
        name: data.name,
        permissions: data.permissions,
        token,
        invited_by: userId,
        invited_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        accepted_at: null,
        is_active: true,
      },
      { onConflict: "tournament_id,email" },
    );
    if (inviteErr) throw new Error(inviteErr.message);

    const mail = await sendTeamEmail({
      recipientEmail: data.email,
      recipientName: data.name,
      heading: `You're invited to ${tournament.title}`,
      body: `You've been invited to join <strong>${tournament.title}</strong> as a <strong>${labelRole(role)}</strong> on TeeVents. Click below to create your account and get access. This link expires in 7 days.`,
      buttonUrl: `${baseUrl}/accept-team-invitation?token=${token}`,
      buttonText: "Accept Invitation",
    });

    return { success: true, existingUser: false, emailSent: mail.sent, emailError: mail.error ?? null };
  });

/** Updates a team member's role (or an outstanding invitation's role). */
export const updateTournamentTeamRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { tournamentId: string; kind: "member" | "invitation"; id: string; role: string; name?: string }) => {
    if (!data?.tournamentId || !data?.id) throw new Error("tournamentId and id are required");
    return {
      tournamentId: data.tournamentId,
      kind: data.kind === "invitation" ? "invitation" : "member",
      id: data.id,
      role: data.role,
      name: (data.name || "").trim().slice(0, 255) || null,
    };
  })
  .handler(async ({ data, context }: any) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { TOURNAMENT_TEAM_ROLES } = await import("./tournamentTeam.server");

    const { data: canManage } = await supabaseAdmin.rpc("can_manage_tournament_team", {
      _user_id: userId,
      _tournament_id: data.tournamentId,
    });
    if (canManage !== true) throw new Error("You don't have permission to manage this tournament's team");

    if (!(TOURNAMENT_TEAM_ROLES as readonly string[]).includes(data.role)) {
      throw new Error("Invalid role");
    }

    const table = data.kind === "invitation" ? "tournament_invitations" : "tournament_roles";
    const { error } = await supabaseAdmin
      .from(table)
      .update({ role: data.role, name: data.name })
      .eq("id", data.id)
      .eq("tournament_id", data.tournamentId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

/** Removes a team member or cancels a pending invitation. */
export const removeTournamentTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { tournamentId: string; kind: "member" | "invitation"; id: string }) => {
    if (!data?.tournamentId || !data?.id) throw new Error("tournamentId and id are required");
    return {
      tournamentId: data.tournamentId,
      kind: data.kind === "invitation" ? "invitation" : "member",
      id: data.id,
    };
  })
  .handler(async ({ data, context }: any) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: canManage } = await supabaseAdmin.rpc("can_manage_tournament_team", {
      _user_id: userId,
      _tournament_id: data.tournamentId,
    });
    if (canManage !== true) throw new Error("You don't have permission to manage this tournament's team");

    const table = data.kind === "invitation" ? "tournament_invitations" : "tournament_roles";
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq("id", data.id)
      .eq("tournament_id", data.tournamentId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

/** Re-sends a pending invitation email with a fresh token + expiry. */
export const resendTournamentInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { tournamentId: string; invitationId: string }) => {
    if (!data?.tournamentId || !data?.invitationId) throw new Error("tournamentId and invitationId are required");
    return { tournamentId: data.tournamentId, invitationId: data.invitationId };
  })
  .handler(async ({ data, context }: any) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { labelRole, siteBaseUrl, generateInviteToken, sendTeamEmail } = await import(
      "./tournamentTeam.server"
    );

    const { data: canManage } = await supabaseAdmin.rpc("can_manage_tournament_team", {
      _user_id: userId,
      _tournament_id: data.tournamentId,
    });
    if (canManage !== true) throw new Error("You don't have permission to manage this tournament's team");

    const { data: invite } = await supabaseAdmin
      .from("tournament_invitations")
      .select("id, email, name, role")
      .eq("id", data.invitationId)
      .eq("tournament_id", data.tournamentId)
      .maybeSingle();
    if (!invite) throw new Error("Invitation not found");

    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("title")
      .eq("id", data.tournamentId)
      .maybeSingle();

    const token = generateInviteToken();
    await supabaseAdmin
      .from("tournament_invitations")
      .update({
        token,
        invited_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        accepted_at: null,
      })
      .eq("id", invite.id);

    const mail = await sendTeamEmail({
      recipientEmail: invite.email,
      recipientName: invite.name,
      heading: `You're invited to ${tournament?.title || "a TeeVents tournament"}`,
      body: `You've been invited to join <strong>${tournament?.title || "a tournament"}</strong> as a <strong>${labelRole(invite.role)}</strong> on TeeVents. Click below to create your account and get access. This link expires in 7 days.`,
      buttonUrl: `${siteBaseUrl()}/accept-team-invitation?token=${token}`,
      buttonText: "Accept Invitation",
    });

    return { success: true, emailSent: mail.sent, emailError: mail.error ?? null };
  });

/** Public: details for an invitation token so the accept page can show context. */
export const getTournamentInvitation = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => {
    if (!data?.token) throw new Error("token is required");
    return { token: String(data.token).slice(0, 128) };
  })
  .handler(async ({ data }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { findAuthUserByEmail } = await import("./tournamentTeam.server");

    const { data: invite } = await supabaseAdmin
      .from("tournament_invitations")
      .select("id, email, name, role, tournament_id, expires_at, accepted_at, is_active")
      .eq("token", data.token)
      .maybeSingle();

    if (!invite) return { valid: false as const, reason: "This invitation link is not valid." };
    if (invite.accepted_at || invite.is_active === false) {
      return { valid: false as const, reason: "This invitation has already been used." };
    }
    if (new Date(invite.expires_at) < new Date()) {
      return { valid: false as const, reason: "This invitation has expired. Ask the organizer to resend it." };
    }

    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("title, date")
      .eq("id", invite.tournament_id)
      .maybeSingle();

    const existing = await findAuthUserByEmail(supabaseAdmin, invite.email);

    return {
      valid: true as const,
      email: invite.email,
      name: invite.name,
      role: invite.role,
      hasAccount: !!existing,
      tournamentTitle: tournament?.title || "Tournament",
      tournamentDate: tournament?.date || null,
    };
  });

/** Public: accepts a team invitation, creating the account when needed. */
export const acceptTournamentInvitation = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; password?: string; fullName?: string }) => {
    if (!data?.token) throw new Error("token is required");
    return {
      token: String(data.token).slice(0, 128),
      password: data.password ? String(data.password) : "",
      fullName: (data.fullName || "").trim().slice(0, 255),
    };
  })
  .handler(async ({ data }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { findAuthUserByEmail } = await import("./tournamentTeam.server");

    const { data: invite } = await supabaseAdmin
      .from("tournament_invitations")
      .select("id, email, name, role, permissions, tournament_id, invited_by, expires_at, accepted_at, is_active")
      .eq("token", data.token)
      .maybeSingle();
    if (!invite) throw new Error("This invitation link is not valid.");
    if (invite.accepted_at || invite.is_active === false) {
      throw new Error("This invitation has already been used.");
    }
    if (new Date(invite.expires_at) < new Date()) {
      throw new Error("This invitation has expired. Ask the organizer to resend it.");
    }

    let user = await findAuthUserByEmail(supabaseAdmin, invite.email);
    let createdAccount = false;

    if (!user) {
      if (!data.password || data.password.length < 8) {
        throw new Error("Choose a password of at least 8 characters to create your account.");
      }
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: invite.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.fullName || invite.name || null },
      });
      if (createErr || !created?.user) {
        throw new Error(createErr?.message || "Could not create your account.");
      }
      user = created.user;
      createdAccount = true;
    }

    const { error: roleErr } = await supabaseAdmin.from("tournament_roles").upsert(
      {
        user_id: user.id,
        tournament_id: invite.tournament_id,
        role: invite.role,
        name: invite.name,
        permissions: invite.permissions || [],
        invited_by: invite.invited_by,
        accepted_at: new Date().toISOString(),
        is_active: true,
      },
      { onConflict: "user_id,tournament_id" },
    );
    if (roleErr) throw new Error(roleErr.message);

    await supabaseAdmin
      .from("tournament_invitations")
      .update({ accepted_at: new Date().toISOString(), is_active: false })
      .eq("id", invite.id);

    return {
      success: true,
      email: invite.email,
      createdAccount,
      tournamentId: invite.tournament_id,
    };
  });

/** Every tournament the signed-in user can reach — as organizer (org owner) or team member. */
export const getUserTournaments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: orgs } = await supabaseAdmin
      .from("org_members")
      .select("organization_id, role")
      .eq("user_id", userId);

    const orgIds = (orgs || []).map((o: any) => o.organization_id);
    const results: Record<string, any> = {};

    if (orgIds.length > 0) {
      const { data: orgTournaments } = await supabaseAdmin
        .from("tournaments")
        .select("id, title, date, slug, max_players, organization_id")
        .in("organization_id", orgIds)
        .order("date", { ascending: false });
      for (const t of orgTournaments || []) {
        results[t.id] = { ...t, access: "organizer", role: "organizer" };
      }
    }

    const { data: roles } = await supabaseAdmin
      .from("tournament_roles")
      .select("tournament_id, role, is_active")
      .eq("user_id", userId)
      .eq("is_active", true);

    const memberIds = (roles || [])
      .map((r: any) => r.tournament_id)
      .filter((id: string) => !results[id]);

    if (memberIds.length > 0) {
      const { data: memberTournaments } = await supabaseAdmin
        .from("tournaments")
        .select("id, title, date, slug, max_players, organization_id")
        .in("id", memberIds);
      for (const t of memberTournaments || []) {
        const role = (roles || []).find((r: any) => r.tournament_id === t.id)?.role || "viewer";
        results[t.id] = { ...t, access: role === "organizer" ? "organizer" : "team_member", role };
      }
    }

    const ids = Object.keys(results);
    if (ids.length > 0) {
      const { data: counts } = await supabaseAdmin
        .from("tournament_registrations")
        .select("tournament_id")
        .in("tournament_id", ids);
      for (const id of ids) {
        results[id].playerCount = (counts || []).filter((c: any) => c.tournament_id === id).length;
      }
    }

    return {
      tournaments: Object.values(results).sort((a: any, b: any) =>
        String(b.date || "").localeCompare(String(a.date || "")),
      ),
    };
  });
