import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { VETTING_ADMIN_EMAIL, button, esc, firstName, sendVettingEmail, shell } from "./vetting.server";

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

const tokenSchema = z.string().uuid();

/** Public, token-gated: look up a flagged signup for the documents page. */
export const lookupVettingToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: tokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: r } = await admin.from("signup_vetting")
      .select("full_legal_name, full_name, organization_name, vetting_status, docs_submitted_at")
      .eq("review_token", data.token).maybeSingle();
    if (!r) return { found: false as const };
    const x: any = r;
    return { found: true as const, name: firstName(x.full_legal_name || x.full_name), organization: x.organization_name as string | null, status: x.vetting_status as string, submitted: !!x.docs_submitted_at };
  });

/** Public, token-gated: submit verification documents (multipart). */
export const submitVettingDocs = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    if (!(d instanceof FormData)) throw new Error("Invalid form");
    const file = d.get("file");
    return {
      token: tokenSchema.parse(String(d.get("token") || "")),
      social_url: z.string().trim().url().max(300).parse(String(d.get("social_url") || "")),
      tax_id: z.string().trim().min(2).max(60).parse(String(d.get("tax_id") || "")),
      file: file instanceof File && file.size > 0 ? file : null,
    };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: r } = await admin.from("signup_vetting")
      .select("id, full_legal_name, full_name, email, organization_name, vetting_status")
      .eq("review_token", data.token).maybeSingle();
    if (!r) throw new Error("This link is invalid or has expired.");
    const row: any = r;
    if (row.vetting_status === "approved" || row.vetting_status === "rejected") throw new Error("This account has already been reviewed.");
    let path: string | null = null;
    if (data.file) {
      const f = data.file;
      if (f.size > 10 * 1024 * 1024) throw new Error("File must be under 10MB.");
      if (!["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(f.type)) throw new Error("Upload a PDF, PNG, JPG, or WEBP file.");
      const ext = (f.name.split(".").pop() || "bin").replace(/[^a-z0-9]/gi, "").slice(0, 5);
      path = `${row.id}/${Date.now()}.${ext}`;
      const { error } = await admin.storage.from("vetting-docs").upload(path, await f.arrayBuffer(), { contentType: f.type });
      if (error) throw new Error(error.message);
    }
    await admin.from("signup_vetting").update({
      doc_social_url: data.social_url, doc_tax_id: data.tax_id, ...(path ? { doc_file_path: path } : {}),
      docs_submitted_at: new Date().toISOString(), vetting_status: "pending",
    }).eq("id", row.id);
    await sendVettingEmail(admin, VETTING_ADMIN_EMAIL, `📄 Verification documents submitted – ${row.full_legal_name || row.email}`,
      shell("Documents ready for review", `<p><b>${esc(row.full_legal_name || row.full_name)}</b> (${esc(row.email)}) from ${esc(row.organization_name)} submitted verification details.</p>
        ${button("https://www.teevents.golf/admin?tab=vetting", "Review Now")}`),
      "admin-vetting-docs-submitted", { vetting_id: row.id });
    return { ok: true };
  });
