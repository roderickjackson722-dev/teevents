import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const {
      tournament_id,
      task_id,
      task_key,
      status,
      recompute,
    } = body as {
      tournament_id?: string;
      task_id?: string;
      task_key?: string;
      status?: "not_started" | "in_progress" | "completed";
      recompute?: boolean;
    };

    if (!tournament_id || typeof tournament_id !== "string") {
      return new Response(JSON.stringify({ error: "tournament_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: user must belong to the tournament's organization
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: t } = await admin
      .from("tournaments")
      .select("id, organization_id")
      .eq("id", tournament_id)
      .maybeSingle();
    if (!t) {
      return new Response(JSON.stringify({ error: "Tournament not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: member } = await admin
      .from("org_members")
      .select("user_id")
      .eq("organization_id", t.organization_id)
      .eq("user_id", userId)
      .maybeSingle();

    // Allow admins too
    const { data: adminRole } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!member && !adminRole) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve task_id from task_key when needed
    let resolvedTaskId = task_id ?? null;
    if (!resolvedTaskId && task_key) {
      const { data: taskRow } = await admin
        .from("setup_checklist_tasks")
        .select("id")
        .eq("task_key", task_key)
        .maybeSingle();
      resolvedTaskId = taskRow?.id ?? null;
    }

    if (status && resolvedTaskId) {
      const completed_at = status === "completed" ? new Date().toISOString() : null;
      await admin
        .from("tournament_setup_progress")
        .upsert(
          {
            tournament_id,
            task_id: resolvedTaskId,
            status,
            completed_at,
          },
          { onConflict: "tournament_id,task_id" },
        );
    }

    if (recompute) {
      await admin.rpc("recompute_tournament_setup_progress", {
        _tournament_id: tournament_id,
      });
    }

    // Return overall percentage
    const { data: progress } = await admin
      .from("tournament_setup_progress")
      .select("status")
      .eq("tournament_id", tournament_id);

    const total = progress?.length ?? 0;
    const completed = progress?.filter((p) => p.status === "completed").length ?? 0;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    return new Response(
      JSON.stringify({ ok: true, total, completed, percent }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("update-checklist-task error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
