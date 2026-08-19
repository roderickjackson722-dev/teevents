import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminScheduledEmail = {
  id: string;
  tournament_id: string;
  tournament_title: string | null;
  template_kind: string;
  scheduled_for: string;
  timezone: string | null;
  status: string;
  recipient_count: number | null;
  sent_at: string | null;
  sent_count: number | null;
  failed_count: number | null;
  error: string | null;
  note: string | null;
  created_at: string;
  created_by: string | null;
  created_by_email: string | null;
};

/** Platform-admin view of every scheduled template email across all events. */
export const adminListScheduledEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any): Promise<AdminScheduledEmail[]> => {
    const { getAdminClient, assertAdmin } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();

    const { data: jobs, error } = await admin
      .from("scheduled_emails")
      .select("*")
      .order("scheduled_for", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const rows: any[] = jobs ?? [];
    if (rows.length === 0) return [];

    const tournamentIds = Array.from(new Set(rows.map((r) => r.tournament_id).filter(Boolean)));
    const { data: tournaments } = await admin
      .from("tournaments")
      .select("id, title")
      .in("id", tournamentIds);
    const titleById = new Map<string, string>(
      ((tournaments ?? []) as any[]).map((t) => [t.id, t.title]),
    );

    const creatorIds = Array.from(new Set(rows.map((r) => r.created_by).filter(Boolean)));
    const emailById = new Map<string, string>();
    for (const id of creatorIds) {
      const { data } = await admin.auth.admin.getUserById(id as string);
      if (data?.user?.email) emailById.set(id as string, data.user.email);
    }

    return rows.map((r) => ({
      id: r.id,
      tournament_id: r.tournament_id,
      tournament_title: titleById.get(r.tournament_id) ?? null,
      template_kind: r.template_kind,
      scheduled_for: r.scheduled_for,
      timezone: r.timezone ?? null,
      status: r.status,
      recipient_count: r.recipient_count ?? null,
      sent_at: r.sent_at ?? null,
      sent_count: r.sent_count ?? null,
      failed_count: r.failed_count ?? null,
      error: r.error ?? null,
      note: r.note ?? null,
      created_at: r.created_at,
      created_by: r.created_by ?? null,
      created_by_email: r.created_by ? emailById.get(r.created_by) ?? null : null,
    }));
  });

/** Requeue a failed/canceled scheduled email so the processor tries again. */
export const adminRetryScheduledEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }: any) => {
    const { getAdminClient, assertAdmin } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const { error } = await admin
      .from("scheduled_emails")
      .update({ status: "scheduled", scheduled_for: new Date().toISOString(), error: null, sent_at: null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
