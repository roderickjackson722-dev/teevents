import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type TierInput = {
  name?: string;
  description?: string | null;
  price_cents?: number;
  benefits?: string | null;
  display_order?: number;
  is_active?: boolean;
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeOptionalText = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
};

const sanitizeTierPayload = (payload: TierInput, tournamentId: string, fallbackOrder = 0) => {
  const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 100) : "";
  const priceCents = Number(payload.price_cents);
  const displayOrder = Number.isFinite(Number(payload.display_order))
    ? Math.max(0, Math.trunc(Number(payload.display_order)))
    : fallbackOrder;

  if (!name) throw new Error("Tier name is required");
  if (!Number.isFinite(priceCents) || priceCents <= 0) throw new Error("Tier price must be greater than $0");

  return {
    tournament_id: tournamentId,
    name,
    description: normalizeOptionalText(payload.description, 200),
    price_cents: Math.trunc(priceCents),
    benefits: normalizeOptionalText(payload.benefits, 4000),
    display_order: displayOrder,
    is_active: payload.is_active ?? true,
  };
};

const getAuthenticatedUser = async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.split(" ")[1]?.trim();
  if (!token) throw new Error("Unauthorized");

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  const { data, error } = await supabaseClient.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");

  return data.user;
};

const resolveTournamentId = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  tournamentId?: string,
  tierId?: string,
) => {
  if (tournamentId) return tournamentId;
  if (!tierId) throw new Error("Tournament not specified");

  const { data: tier, error } = await supabaseAdmin
    .from("sponsorship_tiers")
    .select("tournament_id")
    .eq("id", tierId)
    .maybeSingle();

  if (error || !tier?.tournament_id) throw new Error("Sponsorship tier not found");
  return tier.tournament_id as string;
};

const verifyAccess = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  tournamentId: string,
) => {
  const [{ data: tournament, error: tournamentError }, { data: isAdmin }] = await Promise.all([
    supabaseAdmin.from("tournaments").select("organization_id").eq("id", tournamentId).maybeSingle(),
    supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" }),
  ]);

  if (tournamentError || !tournament?.organization_id) throw new Error("Tournament not found");
  if (isAdmin) return tournament.organization_id as string;

  const { data: membership } = await supabaseAdmin
    .from("org_members")
    .select("id")
    .eq("organization_id", tournament.organization_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) throw new Error("You do not have permission to manage sponsorship tiers for this tournament");

  return tournament.organization_id as string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const action = body?.action as string | undefined;
    const tierId = body?.tier_id as string | undefined;
    const rawTournamentId = body?.tournament_id as string | undefined;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const tournamentId = await resolveTournamentId(supabaseAdmin, rawTournamentId, tierId);
    await verifyAccess(supabaseAdmin, user.id, tournamentId);

    if (action === "create") {
      const payload = sanitizeTierPayload(body?.payload ?? {}, tournamentId);
      const { data, error } = await supabaseAdmin
        .from("sponsorship_tiers")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;
      return json({ success: true, id: data.id });
    }

    if (action === "update") {
      if (!tierId) throw new Error("Tier not specified");
      const payload = sanitizeTierPayload(body?.payload ?? {}, tournamentId);
      const { error } = await supabaseAdmin
        .from("sponsorship_tiers")
        .update(payload)
        .eq("id", tierId);

      if (error) throw error;
      return json({ success: true });
    }

    if (action === "delete") {
      if (!tierId) throw new Error("Tier not specified");
      const { error } = await supabaseAdmin
        .from("sponsorship_tiers")
        .delete()
        .eq("id", tierId);

      if (error) throw error;
      return json({ success: true });
    }

    if (action === "apply_template") {
      const tiers = Array.isArray(body?.tiers) ? (body.tiers as TierInput[]) : [];
      if (tiers.length === 0) throw new Error("No sponsorship tiers were provided");

      const inserts = tiers.map((tier, index) => sanitizeTierPayload(tier, tournamentId, index + 1));
      const { error } = await supabaseAdmin.from("sponsorship_tiers").insert(inserts);
      if (error) throw error;

      return json({ success: true, count: inserts.length });
    }

    throw new Error("Unsupported action");
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 400);
  }
});