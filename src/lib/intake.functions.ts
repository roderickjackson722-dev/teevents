import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tournamentIntakeSchema, leagueIntakeSchema, intakeSubject, intakeEmailText } from "./intake.schema";

const tokenSchema = z.object({ token: z.string().uuid() });

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function byToken(token: string) {
  const admin = await adminClient();
  const { data } = await admin.from("organizer_intakes").select("id, interest_area, status, details, contact, submitted_at").eq("access_token", token).maybeSingle();
  return { admin, row: data as null | { id: string; interest_area: "tournament" | "league"; status: string; details: Record<string, any>; contact: Record<string, any>; submitted_at: string | null } };
}

export const getIntake = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => tokenSchema.parse(i))
  .handler(async ({ data }) => {
    const { row } = await byToken(data.token);
    if (!row) return null;
    return { interest: row.interest_area, status: row.status, details: row.details, submitted: !!row.submitted_at };
  });

/** Signed-in organizer: returns their own intake link (for opening Step 4 after a plan payment). */
export const getMyIntakeToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any).from("organizer_intakes").select("access_token, status, submitted_at, interest_area").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    return data ? { token: data.access_token as string, submitted: !!data.submitted_at, interest: data.interest_area as string } : null;
  });

const logoSchema = tokenSchema.extend({ fileName: z.string().max(200), contentType: z.enum(["image/png", "image/jpeg"]), base64: z.string().max(7_000_000) });
export const uploadIntakeLogo = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => logoSchema.parse(i))
  .handler(async ({ data }) => {
    const { admin, row } = await byToken(data.token);
    if (!row) throw new Error("This link is no longer valid.");
    const bytes = Uint8Array.from(atob(data.base64), c => c.charCodeAt(0));
    if (bytes.length > 5 * 1024 * 1024) throw new Error("Logo must be under 5 MB.");
    const ext = data.contentType === "image/png" ? "png" : "jpg";
    const path = `intakes/${row.id}/logo-${Date.now()}.${ext}`;
    const { error } = await admin.storage.from("organizer-toolbox").upload(path, bytes, { contentType: data.contentType, upsert: true });
    if (error) throw new Error("Could not upload the logo. You can send it later.");
    return { path };
  });

const saveSchema = tokenSchema.extend({ details: z.record(z.any()) });
export const submitIntake = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => saveSchema.parse(i))
  .handler(async ({ data }) => {
    const { admin, row } = await byToken(data.token);
    if (!row) return { ok: false as const, message: "This link is no longer valid." };
    const parsed = (row.interest_area === "league" ? leagueIntakeSchema : tournamentIntakeSchema).safeParse(data.details);
    if (!parsed.success) return { ok: false as const, message: parsed.error.issues[0]?.message || "Please check the required fields." };
    const details = parsed.data as Record<string, any>;
    const status = row.status === "not_submitted" ? "new" : row.status;
    const { error } = await admin.from("organizer_intakes").update({ details, status, submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", row.id);
    if (error) return { ok: false as const, message: "We could not save your details. Please try again." };
    const key = process.env["RESEND_API_KEY"];
    let emailed = false;
    if (key) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "TeeVents Golf Management <info@notifications.teevents.golf>",
          to: ["info@teevents.golf"],
          ...(row.contact["email"] ? { reply_to: String(row.contact["email"]) } : {}),
          subject: intakeSubject(row.interest_area, details),
          text: intakeEmailText(row.interest_area, details, row.contact) + "\n\nAdmin queue: https://www.teevents.golf/admin/intakes",
        }),
        signal: AbortSignal.timeout(15000),
      }).catch(() => null);
      emailed = !!res?.ok;
    }
    return { ok: true as const, emailed, details };
  });
