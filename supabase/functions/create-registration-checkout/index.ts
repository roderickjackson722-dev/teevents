import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendNotificationEmails, buildNotificationHtml, sendRegistrantConfirmationEmail, buildRegistrationAnswersHtml } from "../_shared/notify.ts";
import { requireConnectedAccount, logDirectCharge, PLATFORM_FEE_RATE, stripeAccountOpts, acctQuerySuffix, applicationFeeBlock, notifyPlatformFallback } from "../_shared/connectRouting.ts";

const calculateGrossedUpStripeFee = (subtotalCents: number) =>
  Math.max(0, Math.round((subtotalCents + 30) / (1 - 0.029)) - subtotalCents);
const calculateProcessingFee = (chargeAmountCents: number) =>
  Math.max(0, Math.round(chargeAmountCents * 0.029 + 30));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const isFoursome = body.foursome === true && Array.isArray(body.players);
    const coverFees = body.cover_fees === true;
    const tierId = body.tier_id || null;
    const flightId = body.flight_id || null;
    const addonSelections: { addon_id: string; qty_per_player: number }[] = Array.isArray(body.addons)
      ? body.addons.filter((a: any) => a && typeof a.addon_id === "string" && Number.isFinite(Number(a.qty_per_player)) && Number(a.qty_per_player) > 0)
        .map((a: any) => ({ addon_id: String(a.addon_id), qty_per_player: Math.floor(Number(a.qty_per_player)) }))
      : [];
    // Optional donation amount, in cents. Clamp to non-negative int, cap at $10,000.
    const donationAmountCents = (() => {
      const n = Number(body.donation_amount_cents);
      if (!Number.isFinite(n) || n <= 0) return 0;
      return Math.min(Math.floor(n), 1_000_000);
    })();

    const players = isFoursome
      ? body.players
      : [{
          first_name: body.first_name,
          last_name: body.last_name,
          email: body.email,
          phone: body.phone,
          handicap: body.handicap,
          shirt_size: body.shirt_size,
          dietary_restrictions: body.dietary_restrictions,
          company: body.company,
          skill_level: body.skill_level,
          notes: body.notes,
          custom_answers: body.custom_answers,
        }];

    const tournament_id = body.tournament_id;
    const first_name = players[0].first_name;
    const last_name = players[0].last_name;
    const email = players[0].email;

    if (!tournament_id || !first_name || !last_name || !email) {
      throw new Error("Missing required fields");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tournament, error: tErr } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, slug, organization_id, registration_open, site_published, registration_fee_cents, date, end_date, location, pass_fees_to_participants, allow_cover_fees, early_registration_enabled, early_registration_price_cents, early_registration_price_2_cents, early_registration_price_4_cents, early_registration_expires_at")
      .eq("id", tournament_id)
      .single();

    if (tErr || !tournament) throw new Error("Tournament not found");
    if (!tournament.registration_open || !tournament.site_published) {
      throw new Error("Registration is not open for this tournament");
    }

    const { data: registrationFields, error: fieldsErr } = await supabaseAdmin
      .from("tournament_registration_fields")
      .select("id, label, field_type, is_required, is_enabled, is_default")
      .eq("tournament_id", tournament_id)
      .eq("is_enabled", true)
      .order("sort_order", { ascending: true });
    if (fieldsErr) throw new Error("Failed to validate registration fields: " + fieldsErr.message);

    const defaultFieldKey = (label: string) => {
      const normalized = label.trim().toLowerCase();
      const map: Record<string, string> = {
        "phone": "phone",
        "handicap": "handicap",
        "shirt size": "shirt_size",
        "dietary restrictions": "dietary_restrictions",
        "company / organization": "company",
        "skill level": "skill_level",
      };
      return map[normalized] || null;
    };

    const readSubmittedAnswer = (player: any, field: any) => {
      const mappedKey = defaultFieldKey(String(field.label || ""));
      if (mappedKey && player[mappedKey] !== undefined && player[mappedKey] !== null) {
        return player[mappedKey];
      }

      const submitted = Array.isArray(player.custom_answers) ? player.custom_answers : [];
      const found = submitted.find((a: any) => {
        const sameId = a?.field_id === field.id || a?.id === field.id;
        const sameLabel = String(a?.label || "").trim().toLowerCase() === String(field.label || "").trim().toLowerCase();
        return sameId || sameLabel;
      });
      return found?.answer ?? found?.value ?? "";
    };

    const buildCanonicalAnswers = (player: any, playerIndex: number) => {
      return ((registrationFields || []) as any[]).map((field) => {
        const answer = readSubmittedAnswer(player, field);
        const missing = answer === undefined || answer === null || (typeof answer === "string" && answer.trim() === "");
        if (field.is_required && missing) {
          throw new Error(`Missing required field: ${field.label}${players.length > 1 ? ` for Player ${playerIndex + 1}` : ""}`);
        }
        return {
          field_id: field.id,
          label: field.label,
          field_type: field.field_type,
          answer: answer ?? "",
        };
      });
    };

    const canonicalPlayerAnswers = players.map((p: any, i: number) => buildCanonicalAnswers(p, i));

    // Determine effective default fee (early-bird if enabled and not expired)
    const earlyActive =
      (tournament as any).early_registration_enabled === true &&
      (tournament as any).early_registration_price_cents != null &&
      (!(tournament as any).early_registration_expires_at ||
        new Date((tournament as any).early_registration_expires_at).getTime() > Date.now());
    const defaultFeeCents = earlyActive
      ? Number((tournament as any).early_registration_price_cents) || 0
      : tournament.registration_fee_cents || 0;

    // Early-bird team-total overrides (only used when no tier selected)
    const earlyTeam2Cents = earlyActive && (tournament as any).early_registration_price_2_cents != null
      ? Number((tournament as any).early_registration_price_2_cents)
      : null;
    const earlyTeam4Cents = earlyActive && (tournament as any).early_registration_price_4_cents != null
      ? Number((tournament as any).early_registration_price_4_cents)
      : null;

    // Determine fee per player: use tier price if tier selected, else effective default
    let feePerPlayer = defaultFeeCents;
    let teamTotalOverride: number | null = null;
    if (tierId) {
      const { data: tier } = await supabaseAdmin
        .from("tournament_registration_tiers")
        .select("price_cents")
        .eq("id", tierId)
        .eq("tournament_id", tournament_id)
        .eq("is_active", true)
        .single();
      if (tier) feePerPlayer = tier.price_cents;
    } else if (earlyActive) {
      if (players.length === 4 && earlyTeam4Cents != null) teamTotalOverride = earlyTeam4Cents;
      else if (players.length === 2 && earlyTeam2Cents != null) teamTotalOverride = earlyTeam2Cents;
    }

    const passFeesToParticipants = (tournament as any).pass_fees_to_participants !== false;
    const registrationFeeCents = teamTotalOverride != null
      ? teamTotalOverride
      : feePerPlayer * players.length;
    if (teamTotalOverride != null && players.length > 0) {
      // Keep feePerPlayer consistent for the per-player line item below.
      feePerPlayer = Math.round(teamTotalOverride / players.length);
    }

    // Validate add-on selections against DB and compute add-on totals
    type ResolvedAddon = { id: string; name: string; price_cents: number; max_per_golfer: number; qty_per_player: number };
    let resolvedAddons: ResolvedAddon[] = [];
    let addonsTotalCents = 0;
    if (addonSelections.length > 0) {
      const ids = addonSelections.map((a) => a.addon_id);
      const { data: dbAddons, error: addonErr } = await supabaseAdmin
        .from("tournament_registration_addons")
        .select("id, name, price_cents, max_per_golfer, is_active, tournament_id")
        .in("id", ids);
      if (addonErr) throw new Error("Failed to load add-ons: " + addonErr.message);
      const byId = new Map((dbAddons || []).map((a: any) => [a.id, a]));
      for (const sel of addonSelections) {
        const a = byId.get(sel.addon_id);
        if (!a || !a.is_active || a.tournament_id !== tournament_id) continue;
        const qty = Math.min(Math.max(1, sel.qty_per_player), Math.max(1, a.max_per_golfer || 1));
        if (qty <= 0) continue;
        resolvedAddons.push({
          id: a.id,
          name: a.name,
          price_cents: a.price_cents,
          max_per_golfer: a.max_per_golfer || 1,
          qty_per_player: qty,
        });
        addonsTotalCents += qty * players.length * a.price_cents;
      }
    }

    let baseTotalCents = registrationFeeCents + addonsTotalCents;

    // ── Promo code validation & discount ─────────────────────────────
    const rawPromo = typeof body.promo_code === "string" ? body.promo_code.trim().toUpperCase() : "";
    let promoRecord: any = null;
    let discountCents = 0;
    if (rawPromo && baseTotalCents > 0) {
      const { data: promo } = await supabaseAdmin
        .from("tournament_promo_codes")
        .select("*")
        .eq("tournament_id", tournament_id)
        .eq("code", rawPromo)
        .eq("is_active", true)
        .maybeSingle();
      if (!promo) throw new Error("Invalid or inactive promo code");
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) throw new Error("Promo code has expired");
      if (promo.max_uses && promo.current_uses >= promo.max_uses) throw new Error("Promo code has reached its usage limit");

      // Validate applies_to rule
      const appliesTo = (promo as any).applies_to || "all";
      const count = players.length;
      let ruleOk = true;
      if (appliesTo === "individual") ruleOk = count === 1;
      else if (appliesTo === "team_2") ruleOk = count === 2;
      else if (appliesTo === "team_4") ruleOk = count === 4;
      else if (appliesTo === "custom") {
        const want = String((promo as any).applies_to_custom || "").trim().toLowerCase();
        let tierName = "";
        if (tierId) {
          const { data: tierRow } = await supabaseAdmin
            .from("tournament_registration_tiers")
            .select("name")
            .eq("id", tierId)
            .maybeSingle();
          tierName = String(tierRow?.name || "").trim().toLowerCase();
        }
        ruleOk = !!want && tierName === want;
      }
      if (!ruleOk) throw new Error("Promo code does not apply to this registration type");

      promoRecord = promo;
      if (promo.discount_type === "percent") {
        discountCents = Math.min(baseTotalCents, Math.round(baseTotalCents * (Number(promo.discount_value) / 100)));
      } else {
        discountCents = Math.min(baseTotalCents, Math.round(Number(promo.discount_value) * 100));
      }
      baseTotalCents = Math.max(0, baseTotalCents - discountCents);
    }

    // Donation adds to charge but is NOT subject to promo discounts.
    baseTotalCents = baseTotalCents + donationAmountCents;

    const hasAnyCharge = baseTotalCents > 0;

    // Resolve promoter from referral code (if any)
    const referralCode = typeof body.referral_code === "string" && body.referral_code.trim()
      ? body.referral_code.trim()
      : null;
    let promoterId: string | null = null;
    if (referralCode) {
      const { data: promoter } = await supabaseAdmin
        .from("team_promoters")
        .select("id")
        .eq("unique_ref_code", referralCode)
        .eq("tournament_id", tournament_id)
        .eq("is_active", true)
        .maybeSingle();
      promoterId = promoter?.id ?? null;
    }

    // Insert registration records. Donation is attached to the first (captain) row.
    // Multi-player (twosome/threesome/foursome) sign-ups get a shared group id so
    // organizers can see who registered together and keep them paired.
    let groupId: string | null = null;
    if (players.length > 1) {
      const captain = players[0];
      const teamName = typeof body.team_name === "string" ? body.team_name.trim().slice(0, 100) : "";
      const { data: groupRow } = await supabaseAdmin
        .from("registration_groups")
        .insert({
          tournament_id,
          team_name: teamName || null,
          group_name: teamName || `${(captain.first_name || "").trim()} ${(captain.last_name || "").trim()}`.trim() || "Team",
        })
        .select("id")
        .maybeSingle();
      groupId = groupRow?.id ?? null;
    }

    const registrationInserts = players.map((p: any, i: number) => ({
      tournament_id,

      first_name: (p.first_name || "").trim(),
      last_name: (p.last_name || "").trim(),
      email: (p.email || "").trim(),
      phone: p.phone || null,
      handicap: p.handicap ?? null,
      shirt_size: p.shirt_size || null,
      dietary_restrictions: p.dietary_restrictions || null,
      notes: p.notes || null,
      payment_status: hasAnyCharge ? "pending" : "paid",
      tier_id: tierId || null,
      flight_id: flightId || null,
      covered_fees: coverFees,
      referral_code_used: referralCode,
      promoter_id: promoterId,
      donation_amount_cents: i === 0 ? donationAmountCents : 0,
      custom_answers: canonicalPlayerAnswers[i] || [],
      group_id: groupId,
      group_leader: groupId ? i === 0 : false,
      is_captain: groupId ? i === 0 : false,

    }));


    const { data: registrations, error: regErr } = await supabaseAdmin
      .from("tournament_registrations")
      .insert(registrationInserts)
      .select("id");

    if (regErr) throw new Error(regErr.message);
    const registrationIds = (registrations || []).map((r: any) => r.id);

    // NOTE: Notification emails to the organizer + admin are intentionally NOT
    // sent here. They are sent ONLY after Stripe confirms payment in
    // verify-registration, so organizers never receive "pending" emails for
    // transactions that may never complete. (Free / $0 registrations are
    // confirmed immediately in the !hasAnyCharge branch below.)
    if (!hasAnyCharge) {
      try {
        const playerNames = players.map((p: any) => `${p.first_name} ${p.last_name}`).join(", ");
        const answersHtml = await buildRegistrationAnswersHtml(supabaseAdmin, registrationIds);
        await sendNotificationEmails(
          supabaseAdmin,
          tournament.organization_id,
          "notify_registration",
          `✅ New Registration Confirmed — ${tournament.title}`,
          buildNotificationHtml("New Registration Confirmed 🎉", [
            `<strong>${playerNames}</strong> registered for <strong>${tournament.title}</strong>.`,
            `📧 ${email}${players[0].phone ? ` • 📱 ${players[0].phone}` : ""}`,
            isFoursome ? `👥 Foursome registration (${players.length} players)` : "",
            `✅ No fee — confirmed.`,
          ].filter(Boolean), answersHtml),
          tournament.id,
        );
      } catch (e) {
        console.error("Notification error:", e);
      }
    }

    // If no charges at all (no fee, no addons), registration is complete
    if (!hasAnyCharge) {
      try {
        await sendRegistrantConfirmationEmail(
          first_name, last_name, email.trim(),
          tournament.title, tournament.date, tournament.location,
          tournament.slug, tournament.id,
        );
      } catch (e) {
        console.error("Registrant confirmation error:", e);
      }
      return new Response(
        JSON.stringify({ success: true, paid: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Fee required — initialize Stripe and require an onboarded connected account.
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const connected = await requireConnectedAccount(
      supabaseAdmin,
      stripe,
      tournament.organization_id,
      "registration",
    );
    const organizerStripeAccountId = connected.stripeAccountId;

    const origin = req.headers.get("origin") || "https://teevents.lovable.app";
    const playerNames = players.map((p: any) => `${p.first_name} ${p.last_name}`).join(", ");

    // Determine if golfer pays fees:
    // - passFeesToParticipants=true → always pass fees
    // - coverFees=true → golfer opted to cover fees voluntarily
    const golferPaysFees = passFeesToParticipants || coverFees;

    const lineItems: any[] = [];
    // Fees are computed on the COMBINED total (registration + add-ons)
    const platformFeeCents = Math.round(baseTotalCents * PLATFORM_FEE_RATE);
    const stripeFeeCents = golferPaysFees
      ? calculateGrossedUpStripeFee(baseTotalCents + platformFeeCents)
      : calculateProcessingFee(baseTotalCents);
    const combinedFeesCents = platformFeeCents + stripeFeeCents;
    // Application fee = our 5% only. Stripe takes its processing fee from the
    // gross charge automatically — we don't add it to the application fee.
    const applicationFeeAmount = platformFeeCents;
    const organizerNetCents = golferPaysFees
      ? baseTotalCents
      : Math.max(baseTotalCents - combinedFeesCents, 0);
    const chargeTotalCents = golferPaysFees
      ? baseTotalCents + combinedFeesCents
      : baseTotalCents;

    // When a promo discount is applied, collapse registration + add-on lines into
    // a single subtotal line at the discounted amount. Otherwise list them
    // separately as before. The Fees line is always a separate item so the
    // coupon math never touches it.
    if (discountCents > 0) {
      // subtotal excludes donation (donation is added as its own line below).
      const subtotalCents = baseTotalCents - donationAmountCents;
      if (subtotalCents > 0) {
        const addonNames = resolvedAddons.length > 0
          ? ` + ${resolvedAddons.map(a => a.name).join(", ")}`
          : "";
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: `Registration${addonNames} — ${tournament.title}`,
              description: `${isFoursome ? `Foursome: ${playerNames}` : playerNames} • Promo ${promoRecord.code} applied (-$${(discountCents / 100).toFixed(2)})`,
            },
            unit_amount: subtotalCents,
          },
          quantity: 1,
        });
      }
    } else {
      if (registrationFeeCents > 0) {
        if (teamTotalOverride != null) {
          // Single team-total line to avoid per-player rounding drift.
          lineItems.push({
            price_data: {
              currency: "usd",
              product_data: {
                name: `Early Bird Team Registration — ${tournament.title}`,
                description: `${players.length}-player team: ${playerNames}`,
              },
              unit_amount: registrationFeeCents,
            },
            quantity: 1,
          });
        } else {
          lineItems.push({
            price_data: {
              currency: "usd",
              product_data: {
                name: `Registration — ${tournament.title}`,
                description: isFoursome ? `Foursome: ${playerNames}` : playerNames,
              },
              unit_amount: feePerPlayer,
            },
            quantity: players.length,
          });
        }
      }


      for (const a of resolvedAddons) {
        const totalQty = a.qty_per_player * players.length;
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: a.name,
              description: players.length > 1 ? `${a.qty_per_player} × ${players.length} players` : undefined,
            },
            unit_amount: a.price_cents,
          },
          quantity: totalQty,
        });
      }
    }

    // Donation line item (separate so it's visible on the receipt).
    if (donationAmountCents > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Donation" },
          unit_amount: donationAmountCents,
        },
        quantity: 1,
      });
    }

    if (golferPaysFees && combinedFeesCents > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Fees" },
          unit_amount: combinedFeesCents,
        },
        quantity: 1,
      });
    }

    // Compact add-on selections for metadata (Stripe metadata values must be < 500 chars)
    const addonMetaStr = resolvedAddons
      .map((a) => `${a.id}:${a.qty_per_player}:${a.price_cents}:${a.name.replace(/[|,]/g, " ").slice(0, 40)}`)
      .join("|")
      .slice(0, 480);

    // Discount is baked into the line items above — no Stripe coupon needed.



    const checkoutParams: any = {
      customer_email: email.trim(),
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/t/${tournament.slug}?registered=true&session_id={CHECKOUT_SESSION_ID}${acctQuerySuffix(connected)}`,
      cancel_url: `${origin}/t/${tournament.slug}#register`,
      ...applicationFeeBlock(connected, applicationFeeAmount),
      
      metadata: {
        type: "registration",
        tournament_id,
        organization_id: tournament.organization_id,
        registration_ids: registrationIds.join(","),
        pass_fees_to_golfer: String(golferPaysFees),
        cover_fees: String(coverFees),
        tier_id: tierId || "",
        gross_registration_cents: String(registrationFeeCents),
        addons_total_cents: String(addonsTotalCents),
        base_total_cents: String(baseTotalCents),
        discount_cents: String(discountCents),
        promo_code: promoRecord?.code || "",
        promo_code_id: promoRecord?.id || "",
        platform_fee_cents: String(platformFeeCents),
        stripe_fee_cents: String(stripeFeeCents),
        application_fee_cents: String(applicationFeeAmount),
        organizer_net_cents: String(organizerNetCents),
        charge_total_cents: String(chargeTotalCents),
        routing: "direct",
        addon_selections: addonMetaStr,
        player_count: String(players.length),
      },
    };

    const session = await stripe.checkout.sessions.create(
      checkoutParams,
      stripeAccountOpts(connected),
    );

    await logDirectCharge(supabaseAdmin, {
      context: "registration",
      tournamentId: (tournament as any).id,
      organizationId: tournament.organization_id,
      stripeAccountId: organizerStripeAccountId,
      grossCents: baseTotalCents,
      platformFeeCents,
      stripeFeeCents,
      applicationFeeCents: applicationFeeAmount,
      passFeesToParticipants: golferPaysFees,
      stripeSessionId: session.id,
      buyerEmail: email?.trim() || null,
      isPlatformFallback: connected.isPlatformFallback
    });

    if (connected.isPlatformFallback) {
      await notifyPlatformFallback({
        context: "registration",
        organizationId: tournament.organization_id,
        organizationName: connected.organizationName,
        tournamentId: (tournament as any).id,
        tournamentTitle: null,
        grossCents: baseTotalCents,
        buyerEmail: email?.trim() || null,
        stripeSessionId: session.id,
      });
    }

    return new Response(
      JSON.stringify({ success: true, paid: false, checkout_url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("[create-registration-checkout] ERROR:", (error as Error).message, (error as Error).stack);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
