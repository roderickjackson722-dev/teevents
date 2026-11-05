import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { quoteSubmissionSchema } from "./fullServiceQuote.schema";

export const submitFullServiceQuote = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => quoteSubmissionSchema.parse(input))
  .handler(async ({ data }) => {
    const secret = process.env["HCAPTCHA_SECRET_KEY"], siteKey = process.env["HCAPTCHA_SITE_KEY"], emailKey = process.env["RESEND_API_KEY"];
    if (!secret || !siteKey) return { ok: false, message: "CAPTCHA is unavailable. Please email info@teevents.golf." };
    const { deliverQuote, quoteEmailText } = await import("./fullServiceQuote.server");
    try {
      return await deliverQuote(data, {
        verify: async token => {
          const response = await fetch("https://api.hcaptcha.com/siteverify", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ secret, response: token, sitekey: siteKey }), signal: AbortSignal.timeout(15000) });
          const result = await response.json() as { success?: boolean };
          return response.ok && result.success === true;
        },
        save: async (requestKey, answers) => {
          // Only CAPTCHA-verified, strictly validated public intake may use privileged insertion.
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const existing = await supabaseAdmin.from("full_service_inquiries").select("id,answers,submitted_at,email_sent_at,email_provider_id").eq("request_key", requestKey).maybeSingle();
          if (existing.error) throw new Error("Inquiry lookup failed");
          if (existing.data) return existing.data;
          const result = await supabaseAdmin.from("full_service_inquiries").insert({ request_key: requestKey, answers }).select("id,answers,submitted_at,email_sent_at,email_provider_id").single();
          if (result.error || !result.data) throw new Error("Inquiry save failed");
          return result.data;
        },
        send: async (id, answers, submittedAt) => {
          if (!emailKey) throw new Error("Email unavailable");
          const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${emailKey}`, "Content-Type": "application/json", "Idempotency-Key": `full-service-quote-${id}` }, body: JSON.stringify({ from: "TeeVents Golf Management <info@notifications.teevents.golf>", to: ["info@teevents.golf"], reply_to: answers.email, subject: "Full Service Management quote inquiry", text: quoteEmailText(answers, submittedAt) }), signal: AbortSignal.timeout(15000) });
          if (!response.ok) throw new Error("Email provider did not accept the message");
          const result = await response.json() as { id?: string };
          if (!result.id) throw new Error("Missing email receipt");
          return result.id;
        },
        markSent: async (id, providerId) => {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const result = await supabaseAdmin.from("full_service_inquiries").update({ email_sent_at: new Date().toISOString(), email_provider_id: providerId }).eq("id", id);
          if (result.error) throw new Error("Email receipt could not be saved");
        },
      });
    } catch { return { ok: false, message: "Your request could not be saved. Please try again or email info@teevents.golf." }; }
  });

export const listFullServiceInquiries = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (role.error || role.data !== true) throw new Error("Platform admin access is required.");
  const result = await context.supabase.from("full_service_inquiries").select("id,answers,submitted_at,email_sent_at").order("submitted_at", { ascending: false });
  if (result.error) throw new Error("Could not load quote inquiries.");
  return result.data;
});