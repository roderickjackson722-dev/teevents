import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { button, esc, firstName, sendVettingEmail, shell } from "./vetting.server";

async function assertAdmin(context: any) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

/** Admin: list every signup (Vetting panel + Site Registrations). */
export const listVettingSignups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("signup_vetting")
      .select("*").order("created_at", { ascending: false }).limit(2000);
    if (error) throw new Error(error.message);
    return (data || []).map((r: any) => ({ ...r, review_token: undefined }));
  });

/** Admin: approve / reject / open document. */
export const vettingAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    action: z.enum(["approve", "reject", "doc_url"]),
    note: z.string().max(2000).optional(),
    origin: z.string().url().max(200).optional(),
  }).parse(d))
  .handler(async ({ data, context }: any) => {
    await assertAdmin(context);
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await admin.from("signup_vetting").select("*").eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Not found");
    const r: any = row;
    const note = (data.note || "").trim();
    const name = firstName(r.full_legal_name || r.full_name);

    if (data.action === "doc_url") {
      if (!r.doc_file_path) throw new Error("No document uploaded");
      const { data: s, error } = await admin.storage.from("vetting-docs").createSignedUrl(r.doc_file_path, 600);
      if (error) throw new Error(error.message);
      return { url: s.signedUrl };
    }

    const now = new Date().toISOString();
    if (data.action === "approve") {
      await admin.auth.admin.updateUserById(r.user_id, { ban_duration: "none" } as any);
      await admin.from("signup_vetting").update({
        vetting_status: "approved", vetting_notes: note || r.vetting_notes, reviewed_at: now, reviewed_by: context.userId,
      }).eq("id", r.id);
      const origin = data.origin || "https://www.teevents.golf";
      const { data: link } = await admin.auth.admin.generateLink({
        type: "recovery", email: r.email,
        options: { redirectTo: `${origin}/reset-password?new=1&type=${r.interest_area || "tournament"}` },
      });
      const al = (link as any)?.properties?.action_link;
      await sendVettingEmail(admin, r.email, "Your TeeVents account is approved",
        shell("You're approved!", `<p style="font-size:16px;">Hi ${esc(name)},</p>
          <p style="font-size:16px;">Great news — your TeeVents account has been approved.${al ? " Click below to verify your email, set your password, and get started:" : ""}</p>
          ${al ? button(al, "Set My Password &amp; Log In") : ""}
          ${note ? `<p style="font-size:14px;"><b>Note from our team:</b> ${esc(note)}</p>` : ""}`),
        "vetting-approved", { vetting_id: r.id });
      return { ok: true };
    }

    await admin.auth.admin.updateUserById(r.user_id, { ban_duration: "876000h" } as any);
    await admin.from("signup_vetting").update({
      vetting_status: "rejected", vetting_notes: note || r.vetting_notes, reviewed_at: now, reviewed_by: context.userId,
    }).eq("id", r.id);
    await sendVettingEmail(admin, r.email, "Update on your TeeVents account",
      shell("Account update", `<p style="font-size:16px;">Hi ${esc(name)},</p>
        <p style="font-size:16px;">Thank you for your interest in TeeVents. After reviewing your signup, we're unable to approve your account at this time.</p>
        <p style="font-size:15px;"><b>Reason:</b> ${esc(note || "We were unable to verify your organization.")}</p>
        <p style="font-size:15px;">If you believe this is a mistake, just reply to this email and we'll take another look.</p>`),
      "vetting-rejected", { vetting_id: r.id });
    return { ok: true };
  });

/** Signed-in user: mark email verified after opening their link + setting a password. */
export const markVettingEmailVerified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await admin.from("signup_vetting")
      .select("id, full_legal_name, full_name, email").eq("user_id", context.userId).eq("email_verified", false);
    if (!rows?.length) return { ok: true };
    await admin.from("signup_vetting").update({ email_verified: true }).eq("user_id", context.userId);
    const r: any = rows[0];
    await sendVettingEmail(admin, r.email, "Your TeeVents email is verified",
      shell("Email verified", `<p style="font-size:16px;">Hi ${esc(firstName(r.full_legal_name || r.full_name))},</p>
        <p style="font-size:16px;">Your email is verified and your TeeVents account is ready.</p>
        ${button("https://www.teevents.golf/dashboard", "Go to My Dashboard")}`),
      "vetting-email-verified", { vetting_id: r.id });
    return { ok: true };
  });
