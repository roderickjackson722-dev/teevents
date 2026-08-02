import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------------------------------------------------------------------------
// Public: record a platform event + run automated security checks.
// Called on login / failed login / signup / tournament creation.
// ---------------------------------------------------------------------------
export const recordSecurityEvent = createServerFn({ method: "POST" })
  .inputValidator((input: {
    actionType: string;
    userEmail?: string | null;
    userId?: string | null;
    details?: Record<string, unknown>;
  }) => input)
  .handler(async ({ data }) => {
    const {
      getAdminClient, geoLookup, clientIpFromHeaders, logActivity, createFlag,
      ALLOWED_ACTION_TYPES,
    } = await import("./security.server");

    const actionType = String(data.actionType || "");
    if (!(ALLOWED_ACTION_TYPES as readonly string[]).includes(actionType)) {
      return { allow: true, message: null as string | null };
    }

    const request = getRequest();
    const ip = clientIpFromHeaders(request.headers);
    const userAgent = request.headers.get("user-agent");
    const email = (data.userEmail || "").trim().toLowerCase() || null;
    const admin = await getAdminClient();
    const geo = await geoLookup(ip);

    await logActivity(admin, {
      userId: data.userId ?? null,
      userEmail: email,
      actionType,
      actionDetails: data.details ?? {},
      ip,
      userAgent,
      geo,
    });

    let allow = true;
    let message: string | null = null;

    // 1. IP blacklist
    const { data: blocked } = await admin
      .from("security_ip_blacklist")
      .select("id, reason")
      .eq("ip_address", ip)
      .maybeSingle();
    if (blocked) {
      allow = false;
      message = "Access from this network has been blocked. Contact info@teevents.golf.";
      await createFlag(admin, {
        userId: data.userId ?? null, userEmail: email,
        flagType: "suspicious_ip", severity: "high",
        description: `Blocked IP attempted ${actionType}${blocked.reason ? ` (blacklist reason: ${blocked.reason})` : ""}`,
        ip, geo,
      });
    }

    // 2. Suspension check
    if (allow && email) {
      const { data: susp } = await admin
        .from("security_suspensions")
        .select("id, is_active, expires_at")
        .eq("user_email", email)
        .eq("is_active", true)
        .maybeSingle();
      if (susp && (!susp.expires_at || new Date(susp.expires_at) > new Date())) {
        allow = false;
        message = "This account is suspended. Contact info@teevents.golf for assistance.";
      }
    }

    // 3. Failed login burst: 5+ in 10 minutes from same IP
    if (actionType === "login_failed") {
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count } = await admin
        .from("security_activity_log")
        .select("id", { count: "exact", head: true })
        .eq("action_type", "login_failed")
        .eq("ip_address", ip)
        .gte("created_at", since);
      if ((count ?? 0) >= 5) {
        const { data: existing } = await admin
          .from("security_flags")
          .select("id")
          .eq("flag_type", "multiple_failed_logins")
          .eq("ip_address", ip)
          .eq("is_resolved", false)
          .maybeSingle();
        if (!existing) {
          await createFlag(admin, {
            userId: data.userId ?? null, userEmail: email,
            flagType: "multiple_failed_logins", severity: "high",
            description: `${count} failed login attempts in 10 minutes`,
            ip, geo,
          });
        }
      }
    }

    // 4. Login from a new country
    if (actionType === "login" && email && geo.country) {
      const { data: prior } = await admin
        .from("security_activity_log")
        .select("location_country")
        .eq("user_email", email)
        .eq("action_type", "login")
        .not("location_country", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);
      const countries = new Set((prior ?? []).map((r: any) => r.location_country));
      if (countries.size > 0 && !countries.has(geo.country)) {
        await createFlag(admin, {
          userId: data.userId ?? null, userEmail: email,
          flagType: "unusual_activity", severity: "medium",
          description: `Login from a new location (${geo.city ? `${geo.city}, ` : ""}${geo.country})`,
          ip, geo,
        });
      }
    }

    // 5. 3+ tournaments created from same IP within an hour
    if (actionType === "tournament_create") {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await admin
        .from("security_activity_log")
        .select("id", { count: "exact", head: true })
        .eq("action_type", "tournament_create")
        .eq("ip_address", ip)
        .gte("created_at", since);
      if ((count ?? 0) >= 3) {
        await createFlag(admin, {
          userId: data.userId ?? null, userEmail: email,
          flagType: "unusual_activity", severity: "medium",
          description: `${count} tournaments created from the same IP within 1 hour`,
          ip, geo,
        });
      }
    }

    // 6. Suspicious signup email pattern
    if ((actionType === "signup" || actionType === "registration") && email) {
      const spammy = /(\+.*){2,}|\d{5,}@|(mailinator|guerrillamail|10minutemail|tempmail|yopmail|trashmail)\./i;
      if (spammy.test(email)) {
        await createFlag(admin, {
          userId: data.userId ?? null, userEmail: email,
          flagType: "spam_registration", severity: "low",
          description: `Registration with suspicious email pattern: ${email}`,
          ip, geo,
        });
      }
    }

    return { allow, message };
  });

// ---------------------------------------------------------------------------
// Admin-only reads
// ---------------------------------------------------------------------------
export const adminListActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    search?: string; actionType?: string; from?: string; to?: string; limit?: number;
  }) => input)
  .handler(async ({ data, context }: any) => {
    const { getAdminClient, assertAdmin } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();

    let q = admin
      .from("security_activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 300, 1000));

    if (data.actionType && data.actionType !== "all") q = q.eq("action_type", data.actionType);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    if (data.search) {
      const s = data.search.trim();
      q = q.or(`user_email.ilike.%${s}%,ip_address.ilike.%${s}%,location_city.ilike.%${s}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const adminListFlags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const { getAdminClient, assertAdmin } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const { data, error } = await admin
      .from("security_flags")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const adminResolveFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }: any) => {
    const { getAdminClient, assertAdmin, logActivity } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const { error } = await admin
      .from("security_flags")
      .update({ is_resolved: true, resolved_by: context.userId, resolved_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(admin, {
      userId: context.userId, userEmail: (context.claims as any)?.email ?? null,
      actionType: "admin_action", actionDetails: { action: "resolve_flag", flag_id: data.id },
    });
    return { ok: true };
  });

export const adminListSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const { getAdminClient, assertAdmin, friendlyDevice } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();

    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const users: any[] = [];
    for (let page = 1; page <= 10; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      const batch = data?.users ?? [];
      users.push(...batch);
      if (batch.length < 200) break;
    }

    const active = users
      .filter((u) => u.last_sign_in_at && new Date(u.last_sign_in_at).getTime() > cutoff)
      .sort((a, b) => new Date(b.last_sign_in_at).getTime() - new Date(a.last_sign_in_at).getTime())
      .slice(0, 200);

    const emails = active.map((u) => (u.email || "").toLowerCase()).filter(Boolean);
    const { data: recent } = emails.length
      ? await admin
        .from("security_activity_log")
        .select("user_email, ip_address, user_agent, location_city, location_country, created_at")
        .in("user_email", emails)
        .eq("action_type", "login")
        .order("created_at", { ascending: false })
        .limit(1000)
      : { data: [] as any[] };

    const latest = new Map<string, any>();
    for (const r of recent ?? []) {
      const k = (r.user_email || "").toLowerCase();
      if (!latest.has(k)) latest.set(k, r);
    }

    return {
      rows: active.map((u) => {
        const meta = latest.get((u.email || "").toLowerCase());
        return {
          user_id: u.id,
          email: u.email,
          started_at: u.last_sign_in_at,
          ip_address: meta?.ip_address ?? null,
          location: [meta?.location_city, meta?.location_country].filter(Boolean).join(", ") || null,
          device: friendlyDevice(meta?.user_agent ?? null),
        };
      }),
    };
  });

export const adminEndSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId?: string; all?: boolean }) => input)
  .handler(async ({ data, context }: any) => {
    const { getAdminClient, assertAdmin, logActivity } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();

    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;

    const targets: string[] = [];
    if (data.all) {
      for (let page = 1; page <= 10; page++) {
        const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) break;
        const batch = list?.users ?? [];
        for (const u of batch) if (u.id !== context.userId) targets.push(u.id);
        if (batch.length < 200) break;
      }
    } else if (data.userId) {
      targets.push(data.userId);
    }

    let ended = 0;
    for (const id of targets) {
      const res = await fetch(`${url}/auth/v1/admin/users/${id}/logout`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      }).catch(() => null);
      if (res?.ok) ended++;
    }

    await logActivity(admin, {
      userId: context.userId, userEmail: (context.claims as any)?.email ?? null,
      actionType: "admin_action",
      actionDetails: { action: data.all ? "end_all_sessions" : "end_session", ended, attempted: targets.length },
    });

    return { ended, attempted: targets.length };
  });

// ---------------------------------------------------------------------------
// Tournaments (admin view)
// ---------------------------------------------------------------------------
export const adminListSecurityTournaments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const { getAdminClient, assertAdmin } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();

    const { data: tournaments, error } = await admin
      .from("tournaments")
      .select("id, title, slug, status, site_published, created_at, organization_id")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);

    const orgIds = [...new Set((tournaments ?? []).map((t: any) => t.organization_id).filter(Boolean))];
    const { data: orgs } = orgIds.length
      ? await admin.from("organizations").select("id, name").in("id", orgIds)
      : { data: [] as any[] };
    const orgName = new Map((orgs ?? []).map((o: any) => [o.id, o.name]));

    const { data: owners } = orgIds.length
      ? await admin.from("org_members").select("organization_id, user_id, role").in("organization_id", orgIds)
      : { data: [] as any[] };

    const ownerByOrg = new Map<string, string>();
    for (const m of owners ?? []) {
      if (!ownerByOrg.has(m.organization_id) || m.role === "owner") {
        ownerByOrg.set(m.organization_id, m.user_id);
      }
    }

    const emailById = new Map<string, string>();
    for (let page = 1; page <= 10; page++) {
      const { data: list, error: e } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (e) break;
      const batch = list?.users ?? [];
      for (const u of batch) emailById.set(u.id, u.email ?? "");
      if (batch.length < 200) break;
    }

    const { data: creates } = await admin
      .from("security_activity_log")
      .select("action_details, ip_address, location_city, location_country, user_email, created_at")
      .eq("action_type", "tournament_create")
      .order("created_at", { ascending: false })
      .limit(1000);
    const ipByTournament = new Map<string, any>();
    for (const r of creates ?? []) {
      const tid = (r.action_details as any)?.tournament_id;
      if (tid && !ipByTournament.has(tid)) ipByTournament.set(tid, r);
    }

    const ids = (tournaments ?? []).map((t: any) => t.id);
    const { data: regs } = ids.length
      ? await admin.from("tournament_registrations").select("tournament_id").in("tournament_id", ids)
      : { data: [] as any[] };
    const regCount = new Map<string, number>();
    for (const r of regs ?? []) regCount.set(r.tournament_id, (regCount.get(r.tournament_id) ?? 0) + 1);

    return {
      rows: (tournaments ?? []).map((t: any) => {
        const ownerId = t.organization_id ? ownerByOrg.get(t.organization_id) : undefined;
        const meta = ipByTournament.get(t.id);
        return {
          ...t,
          organization_name: t.organization_id ? (orgName.get(t.organization_id) ?? null) : null,
          organizer_id: ownerId ?? null,
          organizer_email: (ownerId ? emailById.get(ownerId) : null) || meta?.user_email || null,
          ip_address: meta?.ip_address ?? null,
          location: [meta?.location_city, meta?.location_country].filter(Boolean).join(", ") || null,
          registrations: regCount.get(t.id) ?? 0,
        };
      }),
    };
  });

export const adminSetTournamentState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string; mode: "suspend" | "archive" }) => input)
  .handler(async ({ data, context }: any) => {
    const { getAdminClient, assertAdmin, logActivity } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();

    const patch = data.mode === "suspend"
      ? { status: "draft", site_published: false }
      : { status: "past" };

    const { error } = await admin.from("tournaments").update(patch).eq("id", data.tournamentId);
    if (error) throw new Error(error.message);

    await logActivity(admin, {
      userId: context.userId, userEmail: (context.claims as any)?.email ?? null,
      actionType: "admin_action",
      actionDetails: { action: `tournament_${data.mode}`, tournament_id: data.tournamentId },
    });
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Suspensions
// ---------------------------------------------------------------------------
export const adminListSuspensions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const { getAdminClient, assertAdmin } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const { data, error } = await admin
      .from("security_suspensions")
      .select("*")
      .order("suspended_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const adminSuspendUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    userId?: string | null; email: string; reason: string;
    permanent?: boolean; notify?: boolean;
  }) => input)
  .handler(async ({ data, context }: any) => {
    const { getAdminClient, assertAdmin, logActivity, sendPlainEmail, suspensionEmailHtml } =
      await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();

    const email = (data.email || "").trim().toLowerCase();
    if (!email) throw new Error("Email is required");

    let userId = data.userId ?? null;
    if (!userId) {
      for (let page = 1; page <= 10; page++) {
        const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) break;
        const batch = list?.users ?? [];
        const hit = batch.find((u: any) => (u.email || "").toLowerCase() === email);
        if (hit) { userId = hit.id; break; }
        if (batch.length < 200) break;
      }
    }
    if (!userId) throw new Error("No account found for that email");

    const permanent = Boolean(data.permanent);
    const expiresAt = permanent ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await admin.from("security_suspensions").upsert({
      user_id: userId,
      user_email: email,
      suspended_by: context.userId,
      reason: data.reason || null,
      suspended_at: new Date().toISOString(),
      expires_at: expiresAt,
      is_active: true,
    }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);

    // Block sign-in at the auth layer and end active sessions.
    await admin.auth.admin.updateUserById(userId, {
      ban_duration: permanent ? "876000h" : "168h",
    }).catch(() => null);

    let emailed = false;
    if (data.notify !== false) {
      emailed = await sendPlainEmail(
        email,
        "Account Suspension – TeeVents Golf",
        suspensionEmailHtml(email.split("@")[0], data.reason || "", permanent),
      );
    }

    await logActivity(admin, {
      userId: context.userId, userEmail: (context.claims as any)?.email ?? null,
      actionType: "admin_action",
      actionDetails: { action: "suspend_user", target: email, permanent, emailed },
    });

    return { ok: true, emailed };
  });

export const adminUnsuspendUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }: any) => {
    const { getAdminClient, assertAdmin, logActivity } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();

    const { data: row } = await admin
      .from("security_suspensions").select("user_id, user_email").eq("id", data.id).maybeSingle();

    const { error } = await admin
      .from("security_suspensions")
      .update({ is_active: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (row?.user_id) {
      await admin.auth.admin.updateUserById(row.user_id, { ban_duration: "none" }).catch(() => null);
    }

    await logActivity(admin, {
      userId: context.userId, userEmail: (context.claims as any)?.email ?? null,
      actionType: "admin_action",
      actionDetails: { action: "unsuspend_user", target: row?.user_email ?? null },
    });
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// IP blacklist
// ---------------------------------------------------------------------------
export const adminListBlacklist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const { getAdminClient, assertAdmin } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const { data, error } = await admin
      .from("security_ip_blacklist").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const adminAddBlacklistIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ip: string; reason?: string }) => input)
  .handler(async ({ data, context }: any) => {
    const { getAdminClient, assertAdmin, logActivity } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();

    const ip = (data.ip || "").trim();
    if (!/^[0-9a-fA-F:.]{3,45}$/.test(ip)) throw new Error("Enter a valid IP address");

    const { error } = await admin.from("security_ip_blacklist").upsert({
      ip_address: ip,
      reason: data.reason?.slice(0, 500) || null,
      added_by: context.userId,
      added_by_email: (context.claims as any)?.email ?? null,
    }, { onConflict: "ip_address" });
    if (error) throw new Error(error.message);

    await logActivity(admin, {
      userId: context.userId, userEmail: (context.claims as any)?.email ?? null,
      actionType: "admin_action", actionDetails: { action: "blacklist_add", ip },
    });
    return { ok: true };
  });

export const adminRemoveBlacklistIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }: any) => {
    const { getAdminClient, assertAdmin, logActivity } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const { error } = await admin.from("security_ip_blacklist").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(admin, {
      userId: context.userId, userEmail: (context.claims as any)?.email ?? null,
      actionType: "admin_action", actionDetails: { action: "blacklist_remove", id: data.id },
    });
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Alert settings
// ---------------------------------------------------------------------------
export const adminGetAlertSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const { getAdminClient, assertAdmin } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const { data } = await admin
      .from("security_alert_settings").select("*").order("created_at", { ascending: true }).limit(1).maybeSingle();
    const { data: log } = await admin
      .from("security_alert_log").select("*").order("created_at", { ascending: false }).limit(25);
    return { settings: data ?? null, log: log ?? [] };
  });

export const adminSaveAlertSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    id: string; enabled: boolean; recipients: string;
    alert_high: boolean; alert_medium: boolean; alert_low: boolean;
  }) => input)
  .handler(async ({ data, context }: any) => {
    const { getAdminClient, assertAdmin, logActivity } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();

    const recipients = data.recipients
      .split(",").map((r: string) => r.trim()).filter((r: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r));
    if (data.enabled && recipients.length === 0) throw new Error("Add at least one valid recipient email");

    const { error } = await admin.from("security_alert_settings").update({
      enabled: data.enabled,
      recipients: recipients.join(", "),
      alert_high: data.alert_high,
      alert_medium: data.alert_medium,
      alert_low: data.alert_low,
    }).eq("id", data.id);
    if (error) throw new Error(error.message);

    await logActivity(admin, {
      userId: context.userId, userEmail: (context.claims as any)?.email ?? null,
      actionType: "admin_action", actionDetails: { action: "update_alert_settings" },
    });
    return { ok: true };
  });

/** Creates a test flag so the admin can verify the alert email pipeline. */
export const adminSendTestAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { severity: "high" | "medium" | "low" }) => input)
  .handler(async ({ data, context }: any) => {
    const { getAdminClient, assertAdmin, createFlag } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    await createFlag(admin, {
      userId: context.userId,
      userEmail: (context.claims as any)?.email ?? null,
      flagType: "manual_review",
      severity: data.severity,
      description: "Test security alert triggered from the admin dashboard",
      ip: "0.0.0.0",
    });
    return { ok: true };
  });
