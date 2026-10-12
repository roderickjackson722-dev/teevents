import { createServerFn } from "@tanstack/react-start";
import { contactSchema } from "./contact.schema";

export const getContactCaptcha = createServerFn({ method: "GET" }).handler(async () => {
  const siteKey = process.env["HCAPTCHA_SITE_KEY"];
  return { siteKey: siteKey && process.env["HCAPTCHA_SECRET_KEY"] ? siteKey : null };
});

export const sendContactMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => contactSchema.parse(input))
  .handler(async ({ data }) => {
    const captchaSecret = process.env["HCAPTCHA_SECRET_KEY"];
    const siteKey = process.env["HCAPTCHA_SITE_KEY"];
    const emailKey = process.env["RESEND_API_KEY"];
    if (!captchaSecret || !siteKey || !emailKey) return { ok: false, message: "Messaging is temporarily unavailable. Please email info@teevents.golf or call (602) 413-1338." };
    try {
      const verification = await fetch("https://api.hcaptcha.com/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret: captchaSecret, response: data.captchaToken, sitekey: siteKey }),
        signal: AbortSignal.timeout(15000),
      });
      const result: unknown = await verification.json();
      if (!verification.ok || !result || typeof result !== "object" || !("success" in result) || result.success !== true) {
        return { ok: false, message: "Please complete a new CAPTCHA and try again." };
      }
      const sent = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${emailKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "TeeVents Golf Management <info@notifications.teevents.golf>",
          to: ["info@teevents.golf"],
          reply_to: data.email,
          subject: `Contact inquiry: ${data.topic}`,
          text: [`Full name: ${data.name}`, `Email: ${data.email}`, `Phone: ${data.phone}`, `Organization: ${data.organization || "Not provided"}`, `How can we help: ${data.topic}`, `Referral source: ${data.source || "Not provided"}`, "", "Message:", data.message].join("\n"),
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!sent.ok) return { ok: false, message: "We could not send your message. Please try again or email info@teevents.golf." };
      return { ok: true, message: "Thank you. Your message has been received. A TeeVents rep will reply within one business day." };
    } catch {
      return { ok: false, message: "Something went wrong sending your message. Please try again or email info@teevents.golf." };
    }
  });