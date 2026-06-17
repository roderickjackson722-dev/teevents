import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENDER = "TeeVents Bookings <info@notifications.teevents.golf>";

function html(title: string, lines: string[]) {
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f5;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
    <div style="background:#1a5c38;color:#fff;padding:20px 28px;font-size:18px;font-weight:600;">${title}</div>
    <div style="padding:24px 28px;color:#374151;font-size:14px;line-height:1.6;">
      ${lines.map((l) => `<p style="margin:0 0 10px;">${l}</p>`).join("")}
    </div>
    <div style="padding:14px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">
      Sent by TeeVents · <a href="https://teevents.golf" style="color:#1a5c38;">teevents.golf</a>
    </div>
  </div></body></html>`;
}

async function sendEmail(to: string | string[], subject: string, body: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.warn("RESEND_API_KEY missing");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: SENDER, to: Array.isArray(to) ? to : [to], subject, html: body }),
  });
  if (!res.ok) console.error("Email failed", await res.text());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { slot_id, coach_name, coach_email, coach_phone, team_name, notes, context: ctx } = body;

    if (!slot_id || !coach_name || !coach_email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(coach_email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: slot, error: slotErr } = await admin
      .from("booking_slots")
      .select("id,title,start_time,end_time,location,is_active,max_bookings,current_bookings")
      .eq("id", slot_id)
      .maybeSingle();
    if (slotErr || !slot) {
      return new Response(JSON.stringify({ error: "Slot not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!slot.is_active) {
      return new Response(JSON.stringify({ error: "Slot is not active" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: reservation, error: rErr } = await admin
      .from("booking_reservations")
      .insert({
        slot_id,
        coach_name: String(coach_name).slice(0, 200),
        coach_email: String(coach_email).toLowerCase().slice(0, 255),
        coach_phone: coach_phone ? String(coach_phone).slice(0, 50) : null,
        team_name: team_name ? String(team_name).slice(0, 200) : null,
        notes: notes ? String(notes).slice(0, 2000) : null,
      })
      .select()
      .single();
    if (rErr) {
      console.error(rErr);
      return new Response(JSON.stringify({ error: rErr.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Notification settings
    const { data: settings } = await admin
      .from("booking_notification_settings")
      .select("*")
      .eq("context", ctx || "college-hub")
      .maybeSingle();

    const startStr = new Date(slot.start_time).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
    const endStr = new Date(slot.end_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const waitlisted = reservation.status === "waitlisted";

    // Coach confirmation
    await sendEmail(
      coach_email,
      `${waitlisted ? "Waitlisted" : "Booking Confirmed"} — ${slot.title}`,
      html(waitlisted ? "You're on the waitlist" : "Your booking is confirmed", [
        waitlisted
          ? `This session is currently full. You've been added to the waitlist for <strong>${slot.title}</strong>. We'll contact you if a spot opens up.`
          : `Your booking has been confirmed.`,
        `<strong>Session:</strong> ${slot.title}`,
        `<strong>When:</strong> ${startStr} – ${endStr}`,
        slot.location ? `<strong>Location:</strong> ${slot.location}` : "",
        `<strong>Booking Reference:</strong> ${reservation.booking_reference}`,
        !waitlisted ? `Please arrive 5 minutes before your scheduled time.` : "",
        `Questions? Contact us at <a href="mailto:info@teevents.golf">info@teevents.golf</a>`,
      ].filter(Boolean)),
    );

    // Admin notification
    if (!settings || settings.send_on_booking !== false) {
      const recipients = [settings?.admin_email || "info@teevents.golf"];
      if (settings?.additional_email) recipients.push(settings.additional_email);
      await sendEmail(
        recipients,
        `New Booking — ${slot.title} — ${coach_name}`,
        html("New Booking Received", [
          `<strong>Session:</strong> ${slot.title}`,
          `<strong>When:</strong> ${startStr} – ${endStr}`,
          `<strong>Coach:</strong> ${coach_name}`,
          `<strong>Email:</strong> ${coach_email}`,
          coach_phone ? `<strong>Phone:</strong> ${coach_phone}` : "",
          team_name ? `<strong>Team:</strong> ${team_name}` : "",
          notes ? `<strong>Notes:</strong> ${notes}` : "",
          `<strong>Status:</strong> ${reservation.status}`,
          `<strong>Reference:</strong> ${reservation.booking_reference}`,
        ].filter(Boolean)),
      );
    }

    return new Response(JSON.stringify({
      success: true,
      booking_reference: reservation.booking_reference,
      status: reservation.status,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
