import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { invitation_ids, tournament_id } = await req.json();

    // Fetch tournament
    const { data: tournament } = await supabase
      .from("college_tournaments")
      .select("*")
      .eq("id", tournament_id)
      .single();

    if (!tournament) throw new Error("Tournament not found");

    // Fetch invitations
    const { data: invitations } = await supabase
      .from("college_tournament_invitations")
      .select("*")
      .in("id", invitation_ids);

    if (!invitations || invitations.length === 0) throw new Error("No invitations found");

    const baseUrl = Deno.env.get("SITE_URL") || "https://teevents.lovable.app";
    const results = [];

    for (const inv of invitations) {
      const rsvpUrl = `${baseUrl}/college/${tournament.slug}?rsvp=${inv.token}`;

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Georgia, serif; background: #f5f0e8; padding: 40px 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <div style="background: #1a5c38; padding: 32px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 24px; margin: 0;">You're Invited!</h1>
      <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">College Golf Tournament</p>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; color: #333;">Dear Coach ${inv.coach_name},</p>
      <p style="font-size: 15px; color: #555; line-height: 1.6;">
        We are pleased to invite <strong>${inv.school_name}</strong> to participate in the
        <strong>${tournament.title}</strong>.
      </p>
      ${tournament.course_name ? `<p style="font-size: 14px; color: #666;">📍 <strong>Course:</strong> ${tournament.course_name}</p>` : ""}
      ${tournament.location ? `<p style="font-size: 14px; color: #666;">📍 <strong>Location:</strong> ${tournament.location}</p>` : ""}
      ${tournament.start_date ? `<p style="font-size: 14px; color: #666;">📅 <strong>Date:</strong> ${new Date(tournament.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}${tournament.end_date && tournament.end_date !== tournament.start_date ? " – " + new Date(tournament.end_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}</p>` : ""}
      ${tournament.flyer_url ? `
      <div style="text-align: center; margin: 24px 0;">
        <img src="${tournament.flyer_url}" alt="Event Flyer" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.1);" />
      </div>` : ""}
      <div style="text-align: center; margin: 32px 0;">
        <a href="${rsvpUrl}" style="display: inline-block; background: #1a5c38; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
          View Invitation & RSVP
        </a>
      </div>
      <p style="font-size: 13px; color: #999; text-align: center;">
        Click the button above to accept or decline, and register your team.
      </p>
    </div>
    <div style="background: #f5f0e8; padding: 20px; text-align: center; border-top: 1px solid #e5e0d8;">
      <p style="font-size: 12px; color: #888; margin: 0;">
        Powered by <a href="https://teevents.lovable.app" style="color: #1a5c38; text-decoration: none; font-weight: bold;">TeeVents</a>
      </p>
    </div>
  </div>
</body>
</html>`;

      if (resendApiKey) {
        try {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "TeeVents Golf Management <notifications@notifications.teevents.golf>",
              to: [inv.coach_email],
              subject: `Invitation: ${tournament.title}`,
              html,
            }),
          });

          if (emailRes.ok) {
            // Mark as sent
            await supabase.from("college_tournament_invitations").update({ status: "sent" }).eq("id", inv.id);
            results.push({ id: inv.id, status: "sent", email: inv.coach_email });
          } else {
            const err = await emailRes.text();
            console.error(`Failed to send to ${inv.coach_email}:`, err);
            results.push({ id: inv.id, status: "failed", email: inv.coach_email, error: err });
          }
        } catch (sendErr) {
          console.error(`Error sending to ${inv.coach_email}:`, sendErr);
          results.push({ id: inv.id, status: "failed", email: inv.coach_email });
        }
      } else {
        console.log(`No RESEND_API_KEY - skipping email to ${inv.coach_email}`);
        results.push({ id: inv.id, status: "skipped", email: inv.coach_email });
      }
    }

    return new Response(JSON.stringify({ sent: results.filter(r => r.status === "sent").length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
