import { useEffect, useState, useCallback, type CSSProperties } from "react";
import { useParams, useSearchParams, useNavigate } from "@/lib/router-compat";
import { motion } from "framer-motion";
import { sanitizeHtml } from "@/components/ui/rich-text-editor";
import { autoFormatAgenda } from "@/lib/formatAgenda";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Calendar, Clock, Mail, Phone, ExternalLink, Loader2, UserPlus, Award, ShoppingBag, Package, Trophy, Gavel, Ticket, ImageIcon, Users, ClipboardList, Star, Send, Menu, X, Facebook, Instagram, ChevronLeft, ChevronRight, Heart, DollarSign, CheckCircle, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import RegistrationForm from "@/components/RegistrationForm";
import { parseGroupFieldRules } from "@/lib/groupFieldRules";

import WaitlistSignup from "@/components/WaitlistSignup";

import { toast } from "@/hooks/use-toast";
import { SponsorBanner } from "@/components/SponsorBanner";
import { getFormatById, stablefordPoints } from "@/lib/scoringFormats";
import { normalizeOrder, normalizeVisibility, PublicTabKey } from "@/lib/publicTabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PublicAuctionsRaffles } from "@/components/public/PublicAuctionsRaffles";
import { TeeventsFooter } from "@/components/TeeventsFooter";
import { formatCents, formatMoney } from "@/lib/formatCurrency";


interface PublicSponsor {
  id: string; name: string; tier: string; logo_url: string | null; website_url: string | null; show_on_leaderboard: boolean;
}
interface PublicProduct {
  id: string; name: string; description: string | null; price: number; image_url: string | null; category: string; purchase_url: string | null;
}
interface TournamentSite {
  id: string; title: string; slug: string | null; description: string | null; date: string | null;
  end_date: string | null;
  custom_slug?: string | null;
  image_url?: string | null;
  location: string | null; course_name: string | null; site_logo_url: string | null;
  site_logo_color_mode?: string | null;
  site_logo_color_value?: string | null;
  site_hero_title: string | null; site_hero_subtitle: string | null; site_primary_color: string | null;
  site_secondary_color: string | null; site_hero_image_url: string | null; site_hero_opacity: number | null; contact_email: string | null;
  contact_phone: string | null; schedule_info: string | null; schedule_info_html?: string | null; registration_url: string | null;
  registration_open: boolean | null; course_par: number | null; template: string | null;
  waitlist_enabled?: boolean; waitlist_deposit_cents?: number; max_players?: number | null; max_waitlist_slots?: number | null; show_registration_count?: boolean | null;
  donation_goal_cents: number | null; registration_fee_cents: number | null;
  leaderboard_sponsor_interval_ms: number; leaderboard_sponsor_style: string;
  leaderboard_rotating_logos?: Array<{ url: string; name?: string; website_url?: string }> | null;
  leaderboard_sponsor_banner_enabled?: boolean | null;
  leaderboard_sponsor_rotation_order?: string | null;
  scoring_format: string; countdown_style: string | null;
  foursome_registration: boolean; max_group_size?: number;
  pass_fees_to_registrants?: boolean;
  allow_cover_fees?: boolean;
  refund_policy_text?: string | null;
  // Public Page Design
  site_show_logo?: boolean | null;
  site_text_color?: string | null;
  site_background_color?: string | null;
  site_font_family?: string | null;
  site_heading_font_size?: number | null;
  site_body_font_size?: number | null;
  site_button_font_size?: number | null;
  site_logo_position?: string | null;
  site_logo_offset_x?: number | null;
  site_logo_offset_y?: number | null;
  site_title_position?: string | null;
  site_button_position?: string | null;
  site_button_radius?: number | null;
  site_button_hover_effect?: string | null;
  gallery_position?: string | null;
  media_position?: string | null;
  // Organizer-controlled public page tabs (visibility + order)
  public_tabs?: Record<string, boolean> | null;
  public_tabs_order?: string[] | null;
}
interface RegFieldPublic {
  id: string; label: string; field_type: string; options: string[] | null;
  is_required: boolean; is_enabled: boolean; is_default: boolean; sort_order: number;
}
interface TierPublic {
  id: string; name: string; description: string | null; eligibility_description: string | null;
  price_cents: number; max_registrants: number | null;
}

const SHARE_BASE_URL = "https://www.teevents.golf";
const DEFAULT_SHARE_IMAGE = `${SHARE_BASE_URL}/og-image.png`;
const SHARE_SITE_NAME = "TeeVents Golf Tournaments";

const toAbsoluteShareUrl = (url: string | null | undefined) => {
  if (!url) return DEFAULT_SHARE_IMAGE;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  return `${SHARE_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const tournamentShareMeta = (tournament: TournamentSite, fallbackSlug?: string) => {
  const publicSlug = tournament.custom_slug || tournament.slug || fallbackSlug || "";
  const pageUrl = `${SHARE_BASE_URL}/t/${publicSlug}`;
  const imageUrl = toAbsoluteShareUrl(tournament.site_hero_image_url || tournament.image_url || tournament.site_logo_url);
  const description = `Join us for ${tournament.title}${tournament.date ? ` on ${new Date(tournament.date).toLocaleDateString()}` : ""}${tournament.location ? ` at ${tournament.location}` : ""}. Register now!`;

  return {
    pageTitle: `${tournament.title} – ${SHARE_SITE_NAME}`,
    shareTitle: tournament.title,
    description,
    imageUrl,
    pageUrl,
  };
};

const upsertSingleMeta = (attr: "name" | "property", key: string, content: string) => {
  const selector = `meta[${attr}="${key}"]`;
  const matches = Array.from(document.head.querySelectorAll(selector)) as HTMLMetaElement[];
  const primary = matches[0] || document.createElement("meta");

  if (!matches[0]) {
    primary.setAttribute(attr, key);
    document.head.appendChild(primary);
  }

  primary.setAttribute("content", content);
  matches.slice(1).forEach((duplicate) => duplicate.remove());
};

const upsertSingleCanonical = (href: string) => {
  const matches = Array.from(document.head.querySelectorAll('link[rel="canonical"]')) as HTMLLinkElement[];
  const primary = matches[0] || document.createElement("link");

  if (!matches[0]) {
    primary.setAttribute("rel", "canonical");
    document.head.appendChild(primary);
  }

  primary.setAttribute("href", href);
  matches.slice(1).forEach((duplicate) => duplicate.remove());
};

interface LeaderboardEntry { name: string; total: number; thru: number; points?: number; isTeam?: boolean; players?: string[]; }
interface AuctionItem {
  id: string; title: string; description: string | null; type: string;
  starting_bid: number; current_bid: number; buy_now_price: number | null;
  raffle_ticket_price: number | null; image_url: string | null;
}
interface Photo { id: string; image_url: string; caption: string | null; }
interface VolunteerRole {
  id: string; title: string; description: string | null; max_volunteers: number; time_slot: string | null; filled: number;
}
interface SurveyQuestion {
  id: string; question: string; type: string; survey_id: string;
}

// Template style configs
const templateStyles = {
  classic: {
    navBg: "rgba(0,0,0,0.85)",
    navText: "#ffffff",
    heroOverlay: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.5) 100%)",
    heroAlign: "center" as const,
    ctaLayout: "three" as const,
    sectionDivider: true,
    footerStyle: "classic",
  },
  modern: {
    navBg: "rgba(15,25,40,0.92)",
    navText: "#ffffff",
    heroOverlay: "linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.5) 100%)",
    heroAlign: "right" as const,
    ctaLayout: "three" as const,
    sectionDivider: false,
    footerStyle: "modern",
  },
  charity: {
    navBg: "rgba(0,0,0,0.9)",
    navText: "#ffffff",
    heroOverlay: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.55) 100%)",
    heroAlign: "center" as const,
    ctaLayout: "two" as const,
    sectionDivider: true,
    footerStyle: "charity",
  },
};

function buildLeaderboard(scoresData: any[], t: TournamentSite): LeaderboardEntry[] {
  const fmt = getFormatById(t.scoring_format || "stroke_play");
  const isTeam = fmt && fmt.teamSize > 1;
  const isStableford = fmt?.scoring === "stableford";
  const cPar = t.course_par || 72;
  const holePar = Math.round(cPar / 18);

  // Build per-player data
  const playerData: Record<string, { name: string; group: number | null; holes: Record<number, number> }> = {};
  scoresData.forEach((s: any) => {
    const key = s.registration_id;
    if (!playerData[key]) {
      const reg = s.tournament_registrations;
      playerData[key] = {
        name: reg ? `${reg.first_name} ${reg.last_name}` : "Unknown",
        group: reg?.group_number ?? null,
        holes: {},
      };
    }
    playerData[key].holes[s.hole_number] = s.strokes;
  });

  if (isTeam && (fmt.scoring === "best_ball" || fmt.scoring === "scramble" || fmt.scoring === "shamble")) {
    // Group by group_number
    const groups: Record<number, typeof playerData[string][]> = {};
    Object.values(playerData).forEach((p) => {
      if (p.group != null) {
        if (!groups[p.group]) groups[p.group] = [];
        groups[p.group].push(p);
      }
    });

    return Object.entries(groups)
      .map(([gn, players]) => {
        let total = 0;
        let holesPlayed = 0;
        for (let h = 1; h <= 18; h++) {
          const strokes = players.map((p) => p.holes[h]).filter((v) => v != null);
          if (strokes.length > 0) {
            total += Math.min(...strokes);
            holesPlayed++;
          }
        }
        return {
          name: `Group ${gn}`,
          total,
          thru: holesPlayed,
          isTeam: true,
          players: players.map((p) => p.name),
        };
      })
      .sort((a, b) => {
        if (a.total === 0 && b.total === 0) return 0;
        if (a.total === 0) return 1;
        if (b.total === 0) return -1;
        return a.total - b.total;
      });
  }

  if (isStableford) {
    return Object.values(playerData)
      .map((p) => {
        let points = 0;
        const holesPlayed = Object.keys(p.holes).length;
        Object.values(p.holes).forEach((strokes) => {
          points += stablefordPoints(strokes, holePar);
        });
        return { name: p.name, total: points, thru: holesPlayed, points };
      })
      .sort((a, b) => {
        if (a.total === 0 && b.total === 0) return 0;
        if (a.total === 0) return 1;
        if (b.total === 0) return -1;
        return b.total - a.total; // Highest first
      });
  }

  // Default stroke play
  return Object.values(playerData)
    .map((p) => ({
      name: p.name,
      total: Object.values(p.holes).reduce((s, v) => s + v, 0),
      thru: Object.keys(p.holes).length,
    }))
    .sort((a, b) => {
      if (a.total === 0 && b.total === 0) return 0;
      if (a.total === 0) return 1;
      if (b.total === 0) return -1;
      return a.total - b.total;
    });
}

const PublicTournament = ({ slugOverride }: { slugOverride?: string }) => {
  const { slug: paramSlug } = useParams<{ slug: string }>();
  const slug = slugOverride || paramSlug;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const donated = searchParams.get("donated") === "true";
  const registered = searchParams.get("registered") === "true";
  const [showConfirmation, setShowConfirmation] = useState(registered);
  const sessionId = searchParams.get("session_id");
  const acct = searchParams.get("acct");
  // Legacy add-on links (?addon=<id>#register) land here — send buyers straight
  // to the dedicated add-on page so they never have to go through registration.
  const addonParam = searchParams.get("addon");
  useEffect(() => {
    if (!addonParam || !slug || typeof window === "undefined") return;
    window.location.replace(`/t/${slug}/add-ons?addon=${encodeURIComponent(addonParam)}`);
  }, [addonParam, slug]);
  const [tournament, setTournament] = useState<TournamentSite | null>(null);
   const [sponsors, setSponsors] = useState<PublicSponsor[]>([]);
   const [products, setProducts] = useState<PublicProduct[]>([]);
   const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
   const [auctionItems, setAuctionItems] = useState<AuctionItem[]>([]);
   const [photos, setPhotos] = useState<Photo[]>([]);
   const [mediaClips, setMediaClips] = useState<Array<{ id: string; title: string; description: string | null; video_url: string; thumbnail_url: string | null }>>([]);
   const [mediaClipOpen, setMediaClipOpen] = useState<string | null>(null);
   const [volunteerRoles, setVolunteerRoles] = useState<VolunteerRole[]>([]);
   const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>([]);
   const [regFields, setRegFields] = useState<RegFieldPublic[]>([]);
   const [regTiers, setRegTiers] = useState<TierPublic[]>([]);
  const [contests, setContests] = useState<{ id: string; name: string; description: string | null; icon: string; fee_cents: number }[]>([]);
  const [accommodations, setAccommodations] = useState<Array<{
    id: string; hotel_name: string; address: string | null; phone: string | null; website_url: string | null;
    group_code: string | null; booking_deadline: string | null; notes: string | null; display_order: number;
    accommodation_room_types: Array<{ id: string; room_type: string; rate_cents: number | null; rate_note: string | null; max_occupancy: number | null; display_order: number }>;
    accommodation_custom_fields: Array<{ id: string; field_name: string; field_value: string | null; display_order: number }>;
  }>>([]);
   const [loading, setLoading] = useState(true);
   const [notFound, setNotFound] = useState(false);
   const [nonprofitInfo, setNonprofitInfo] = useState<{ isNonprofit: boolean; nonprofitName?: string; ein?: string; platformFeeRate?: number }>({ isNonprofit: false });
   const [mobileNavOpen, setMobileNavOpen] = useState(false);
   const [sponsorIndex, setSponsorIndex] = useState(0);

  // Sponsorship tiers for public display
  const [sponsorshipTiers, setSponsorshipTiers] = useState<{ id: string; name: string; description: string | null; price_cents: number; benefits: string | null; display_order: number; total_spots: number | null; spots_used: number; package_type: string | null; custom_package_label: string | null; hide_price_when_sold_out?: boolean }[]>([]);
  const [paidSponsors, setPaidSponsors] = useState<Array<{ id: string; company_name: string; logo_url: string | null; website_url: string | null; tier_id: string | null; is_title_sponsor?: boolean }>>([]);
  const [sponsorSuccess, setSponsorSuccess] = useState(false);
  const [sponsorVerifying, setSponsorVerifying] = useState(false);

  // Vendor tiers for public display
  const [vendorTiers, setVendorTiers] = useState<{ id: string; name: string; description: string | null; price_cents: number; benefits: string | null; display_order: number; total_spots: number | null; spots_used: number }[]>([]);
  const [paidVendors, setPaidVendors] = useState<Array<{ id: string; vendor_name: string; company_name: string | null; logo_url: string | null; website_url: string | null; tier_id: string | null }>>([]);
  const [vendorSuccess, setVendorSuccess] = useState(false);
  const [vendorVerifying, setVendorVerifying] = useState(false);

  // Side events for public ticket sales
  const [sideEvents, setSideEvents] = useState<Array<{ id: string; name: string; description: string | null; event_date: string | null; location: string | null; price_cents: number; max_tickets: number | null; tickets_sold: number; custom_questions?: any[] | null }>>([]);
  const [sideEventSuccess, setSideEventSuccess] = useState(false);
  const [sideEventVerifying, setSideEventVerifying] = useState(false);
  const [sideEventDialog, setSideEventDialog] = useState<{ id: string; name: string; price_cents: number; custom_questions: Array<{ id: string; label: string; type: "checkbox" | "text" | "select"; required: boolean; options?: string[] }> } | null>(null);
  const [seForm, setSeForm] = useState({ name: "", email: "", phone: "", quantity: "1" });
  const [seAnswers, setSeAnswers] = useState<Record<string, string | boolean>>({});
  const [seSubmitting, setSeSubmitting] = useState(false);

   // Forms
   const [bidForm, setBidForm] = useState<{ itemId: string; name: string; email: string; amount: string } | null>(null);
   const [volForm, setVolForm] = useState<{ roleId: string; name: string; email: string; phone: string } | null>(null);
   const [surveyEmail, setSurveyEmail] = useState("");
   const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string>>({});
   const [donationAmount, setDonationAmount] = useState<number | null>(null);
   const [customDonation, setCustomDonation] = useState("");
   const [donorEmail, setDonorEmail] = useState("");
   const [donationLoading, setDonationLoading] = useState(false);
   const [surveySubmitted, setSurveySubmitted] = useState(false);
   const [donationTotal, setDonationTotal] = useState(0);
   const [storeBuyLoading, setStoreBuyLoading] = useState<string | null>(null);
   const [auctionBuyLoading, setAuctionBuyLoading] = useState<string | null>(null);
   const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number; passed: boolean } | null>(null);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [isTournamentFull, setIsTournamentFull] = useState(false);
  const [eventDaySalesItems, setEventDaySalesItems] = useState<Array<{ id: string; item_name: string; description: string | null; price_cents: number; category: string; max_quantity: number | null; sold_quantity: number; }>>([]);
  const [earlyNow, setEarlyNow] = useState(Date.now());


  // Redirect to standalone refund page if ?tab=refund
  useEffect(() => {
    if (searchParams.get("tab") === "refund" && tournament) {
      const email = searchParams.get("email") || "";
      navigate(`/refund/${tournament.id}${email ? `?email=${encodeURIComponent(email)}` : ""}`, { replace: true });
    }
  }, [searchParams, tournament, navigate]);

  // Track click from ref param
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref || !tournament) return;
    const sourceMap: Record<string, string> = {
      qr: "qr_code", facebook: "social_facebook", linkedin: "social_linkedin",
      twitter: "social_twitter", email: "email", sms: "short_link",
    };
    supabase.functions.invoke("track-click", {
      body: { tournament_id: tournament.id, source: sourceMap[ref] || "short_link", referrer: document.referrer || null },
    }).catch(() => {});

    // Team promoter referral tracking — if ref matches a team_promoter unique_ref_code, store it
    (async () => {
      // Use a SECURITY DEFINER RPC so anon visitors don't need direct SELECT
      // on team_promoters (which contains promoter email/name PII).
      const { data: rows } = await (supabase as any).rpc("validate_promoter_ref_code", {
        _tournament_id: tournament.id,
        _ref_code: ref,
      });
      const promoter = Array.isArray(rows) ? rows[0] : null;
      if (!promoter) return;
      // Store ref code for 30 days, but never overwrite existing attribution for this tournament
      const storageKey = `tv_ref_${tournament.id}`;
      const existing = localStorage.getItem(storageKey);
      if (!existing) {
        localStorage.setItem(storageKey, JSON.stringify({ code: ref, ts: Date.now() }));
      }
      // Log the click (anonymous)
      supabase.from("referral_clicks").insert({
        promoter_id: promoter.id,
        user_agent: navigator.userAgent.slice(0, 500),
      }).then(() => {}, () => {});
    })();
  }, [tournament, searchParams]);


  useEffect(() => {
    if (!slug) return;
    // Resolve via security-definer RPC: returns the published tournament row
    // (custom_slug takes precedence) with internal-only fields stripped out.
    (supabase as any)
      .rpc("get_public_tournament_site", { _slug: slug })
      .then(async ({ data, error }: { data: any; error: any }) => {
        if (error || !data) {
          // The first lookup can fail transiently (e.g. an auth token still in
          // flight while previewing from a sample dashboard). Retry once
          // automatically before telling the visitor anything is wrong.
          const retry = await (supabase as any).rpc("get_public_tournament_site", { _slug: slug });
          if (retry?.error || !retry?.data) { setNotFound(true); setLoading(false); return; }
          setTournament(retry.data as unknown as TournamentSite);
          setLoading(false);
          return;
        }
        const t = data as unknown as TournamentSite;
        setTournament(t);

        // Fetch nonprofit status for the org
        supabase.functions.invoke("get-nonprofit-status", { body: { tournament_id: t.id } })
          .then(({ data: npData }) => {
            setNonprofitInfo({
              isNonprofit: npData?.is_nonprofit || false,
              nonprofitName: npData?.nonprofit_name || undefined,
              ein: npData?.ein || undefined,
              platformFeeRate: npData?.platform_fee_rate ?? 0.05,
            });
          })
          .catch(() => {});

        const [sponsorRes, productRes, scoresRes, auctionRes, photoRes, roleRes, surveyRes, tiersRes, fieldsRes, contestsRes, sponsorshipTiersRes, accommodationsRes, paidSponsorsRes, vendorTiersRes, paidVendorsRes, sideEventsRes] = await Promise.all([
          supabase.from("tournament_sponsors").select("id, name, tier, logo_url, website_url, show_on_leaderboard").eq("tournament_id", t.id).order("sort_order"),
          supabase.from("tournament_store_products").select("id, name, description, price, image_url, category, purchase_url").eq("tournament_id", t.id).eq("is_active", true).order("sort_order"),
          supabase.from("tournament_scores").select("registration_id, hole_number, strokes, tournament_registrations(first_name, last_name, group_number)").eq("tournament_id", t.id),
          supabase.from("tournament_auction_items").select("id,tournament_id,title,description,image_url,type,starting_bid,current_bid,buy_now_price,raffle_ticket_price,is_active,sort_order,created_at").eq("tournament_id", t.id).eq("is_active", true).order("sort_order"),
          supabase.from("tournament_photos").select("id, image_url, caption").eq("tournament_id", t.id).order("sort_order"),
          supabase.from("tournament_volunteer_roles").select("*, tournament_volunteers(id)").eq("tournament_id", t.id).order("sort_order"),
          supabase.from("tournament_surveys").select("id, tournament_survey_questions(id, question, type, sort_order)").eq("tournament_id", t.id).eq("is_active", true).limit(1).single(),
          supabase.from("tournament_registration_tiers").select("id, name, description, eligibility_description, price_cents, max_registrants").eq("tournament_id", t.id).eq("is_active", true).order("sort_order"),
          supabase.from("tournament_registration_fields").select("id, label, field_type, options, is_required, is_enabled, is_default, sort_order").eq("tournament_id", t.id).eq("is_enabled", true).order("sort_order"),
          supabase.from("tournament_contests").select("id, name, description, icon, fee_cents").eq("tournament_id", t.id).eq("is_active", true).order("sort_order"),
          supabase.from("sponsorship_tiers").select("id, name, description, price_cents, benefits, display_order, total_spots, spots_used, package_type, custom_package_label, hide_price_when_sold_out").eq("tournament_id", t.id).eq("is_active", true).order("display_order", { ascending: true }),
          (supabase as any).from("tournament_accommodations").select("id, hotel_name, address, phone, website_url, group_code, booking_deadline, notes, display_order, accommodation_room_types(id, room_type, rate_cents, rate_note, max_occupancy, display_order, is_active), accommodation_custom_fields(id, field_name, field_value, display_order)").eq("tournament_id", t.id).eq("is_active", true).order("display_order"),
          (supabase as any).rpc("get_public_sponsor_registrations", { _tournament_id: t.id }),
          supabase.from("vendor_tiers").select("id, name, description, price_cents, benefits, display_order, total_spots, spots_used").eq("tournament_id", t.id).eq("is_active", true).order("display_order", { ascending: true }),
          (supabase as any).rpc("get_public_vendor_registrations", { _tournament_id: t.id }),
          (supabase as any).from("side_events").select("id, name, description, event_date, location, price_cents, max_tickets, tickets_sold, custom_questions").eq("tournament_id", t.id).eq("is_active", true).eq("show_on_public", true).order("display_order"),
        ]);

        setSponsors((sponsorRes.data as PublicSponsor[]) || []);
        setProducts((productRes.data as PublicProduct[]) || []);
        setAuctionItems((auctionRes.data as AuctionItem[]) || []);
        setPhotos((photoRes.data as Photo[]) || []);
        setRegTiers((tiersRes.data as TierPublic[]) || []);
        setRegFields((fieldsRes.data as RegFieldPublic[]) || []);
        setContests((contestsRes.data as any[]) || []);
        setSponsorshipTiers((sponsorshipTiersRes.data as any[]) || []);
        setAccommodations(((accommodationsRes as any)?.data as any[]) || []);
        setPaidSponsors((paidSponsorsRes.data as any[]) || []);
        setVendorTiers((vendorTiersRes.data as any[]) || []);
        setPaidVendors((paidVendorsRes.data as any[]) || []);
        setSideEvents(((sideEventsRes as any)?.data as any[]) || []);

        (supabase as any).from("media_clips").select("id, title, description, video_url, thumbnail_url").eq("tournament_id", t.id).eq("is_active", true).order("display_order")
          .then(({ data }: any) => setMediaClips((data as any[]) || []));

        if (scoresRes.data && scoresRes.data.length > 0) {
          setLeaderboard(buildLeaderboard(scoresRes.data as any[], t));
        }

        if (roleRes.data) {
          setVolunteerRoles((roleRes.data as any[]).map((r) => ({
            ...r, filled: r.tournament_volunteers?.length || 0,
          })));
        }

        if (surveyRes.data && (surveyRes.data as any).tournament_survey_questions) {
          const qs = (surveyRes.data as any).tournament_survey_questions as SurveyQuestion[];
          setSurveyQuestions(qs.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)));
        }

        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (!tournament || loading) return;
    if (searchParams.get("tab") !== "sponsors") return;

    const timer = window.setTimeout(() => {
      document.querySelector("#become-a-sponsor")?.scrollIntoView({ behavior: "smooth" });
    }, 150);

    return () => window.clearTimeout(timer);
  }, [loading, tournament, searchParams, sponsorshipTiers.length, sponsors.length]);

  // Realtime leaderboard
  useEffect(() => {
    if (!tournament) return;
    const channel = supabase
      .channel("live-scores")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_scores", filter: `tournament_id=eq.${tournament.id}` }, () => {
        supabase.from("tournament_scores").select("registration_id, hole_number, strokes, tournament_registrations(first_name, last_name, group_number)").eq("tournament_id", tournament.id).then(({ data }) => {
          if (!data) return;
          setLeaderboard(buildLeaderboard(data as any[], tournament));
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tournament]);

  // Check if tournament is full (for waitlist)
  useEffect(() => {
    if (!tournament) return;
    supabase
      .from("tournament_registrations")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournament.id)
      .then(({ count }) => {
        const regCount = count || 0;
        setRegistrationCount(regCount);
        if (tournament.max_players && regCount >= tournament.max_players) {
          setIsTournamentFull(true);
        }
      });
  }, [tournament]);

  // Fetch donation totals for goal progress (online + offline)
  useEffect(() => {
    if (!tournament) return;
    Promise.all([
      (supabase as any).rpc("get_public_donation_total", { _tournament_id: tournament.id }),
      (supabase as any)
        .from("tournament_offline_donations")
        .select("amount_cents")
        .eq("tournament_id", tournament.id),
    ]).then(([onRes, offRes]: any[]) => {
      const onlineTotal = Number(onRes?.data || 0);
      const offlineTotal = ((offRes.data || []) as any[]).reduce((s, d) => s + (d.amount_cents || 0), 0);
      setDonationTotal(onlineTotal + offlineTotal);
    });
  }, [tournament, donated]);


  // Fetch active event day sales items
  useEffect(() => {
    if (!tournament) return;
    (supabase as any)
      .from("event_day_sales_items")
      .select("id, item_name, description, price_cents, category, max_quantity, sold_quantity")
      .eq("tournament_id", tournament.id)
      .eq("is_active", true)
      .eq("show_on_public", true)
      .order("sort_order", { ascending: true })
      .then(({ data }: any) => setEventDaySalesItems((data || []) as any));
  }, [tournament]);

  // Verify donation on return from Stripe
  useEffect(() => {
    if (donated && sessionId) {
      supabase.functions.invoke("verify-donation", {
        body: { session_id: sessionId, acct },
      });
    }
  }, [donated, sessionId, acct]);

  // Verify registration payment on return from Stripe
  useEffect(() => {
    if (registered && sessionId) {
      supabase.functions.invoke("verify-registration", {
        body: { session_id: sessionId, acct },
      });
    }
  }, [registered, sessionId, acct]);

  // Verify sponsor payment on return from Stripe
  useEffect(() => {
    const sponsorSuccessParam = searchParams.get("sponsor_success");
    if (sponsorSuccessParam === "true" && sessionId) {
      setSponsorVerifying(true);
      supabase.functions.invoke("verify-sponsor-payment", {
        body: { session_id: sessionId, acct },
      }).then(({ data }) => {
        if (data?.verified) {
          setSponsorSuccess(true);
        }
        setSponsorVerifying(false);
      }).catch(() => setSponsorVerifying(false));
    }
  }, [searchParams, sessionId, acct]);

  // Verify vendor payment on return from Stripe
  useEffect(() => {
    const vendorSuccessParam = searchParams.get("vendor_success");
    if (vendorSuccessParam === "true" && sessionId) {
      setVendorVerifying(true);
      supabase.functions.invoke("verify-vendor-payment", {
        body: { session_id: sessionId, acct },
      }).then(({ data }) => {
        if ((data as any)?.verified) setVendorSuccess(true);
        setVendorVerifying(false);
      }).catch(() => setVendorVerifying(false));
    }
  }, [searchParams, sessionId, acct]);

  // Verify side event ticket payment on return from Stripe
  useEffect(() => {
    const seParam = searchParams.get("side_event_success");
    if (seParam === "true" && sessionId) {
      setSideEventVerifying(true);
      supabase.functions.invoke("verify-side-event-payment", {
        body: { session_id: sessionId, acct },
      }).then(({ data }) => {
        if ((data as any)?.verified) setSideEventSuccess(true);
        setSideEventVerifying(false);
      }).catch(() => setSideEventVerifying(false));
    }
  }, [searchParams, sessionId, acct]);

  useEffect(() => {
    if (!tournament?.date) return;
    const update = () => {
      const now = new Date();
      const event = new Date(tournament.date + "T08:00:00");
      const diff = event.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, passed: true });
        return;
      }
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        passed: false,
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [tournament]);

  // Early-bird pricing timer — keep hook before conditional returns.
  const earlyEnabledRaw = (tournament as any)?.early_registration_enabled === true;
  const earlyExpiresAt = (tournament as any)?.early_registration_expires_at
    ? new Date((tournament as any).early_registration_expires_at)
    : null;
  const earlyPriceCents = (tournament as any)?.early_registration_price_cents ?? null;
  const earlyPrice2Cents = (tournament as any)?.early_registration_price_2_cents ?? null;
  const earlyPrice4Cents = (tournament as any)?.early_registration_price_4_cents ?? null;
  const earlyActive = !!tournament && earlyEnabledRaw && earlyPriceCents != null && (!earlyExpiresAt || earlyExpiresAt.getTime() > Date.now());
  const effectiveFeeCents = earlyActive ? Number(earlyPriceCents) : (tournament?.registration_fee_cents || 0);
  const earlyTeamTotals = earlyActive
    ? {
        2: earlyPrice2Cents != null ? Number(earlyPrice2Cents) : null,
        4: earlyPrice4Cents != null ? Number(earlyPrice4Cents) : null,
      }
    : null;

  useEffect(() => {
    if (!earlyActive || !earlyExpiresAt) return;
    const id = setInterval(() => setEarlyNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, [earlyActive, earlyExpiresAt]);

  useEffect(() => {
    if (!tournament || loading) return;

    const meta = tournamentShareMeta(tournament, slug);
    document.title = meta.pageTitle;
    upsertSingleMeta("name", "description", meta.description);
    upsertSingleMeta("property", "og:title", meta.shareTitle);
    upsertSingleMeta("property", "og:description", meta.description);
    upsertSingleMeta("property", "og:image", meta.imageUrl);
    upsertSingleMeta("property", "og:image:secure_url", meta.imageUrl);
    upsertSingleMeta("property", "og:image:width", "1200");
    upsertSingleMeta("property", "og:image:height", "630");
    upsertSingleMeta("property", "og:image:alt", meta.shareTitle);
    upsertSingleMeta("property", "og:url", meta.pageUrl);
    upsertSingleMeta("property", "og:type", "website");
    upsertSingleMeta("property", "og:site_name", SHARE_SITE_NAME);
    upsertSingleMeta("name", "twitter:card", "summary_large_image");
    upsertSingleMeta("name", "twitter:title", meta.shareTitle);
    upsertSingleMeta("name", "twitter:description", meta.description);
    upsertSingleMeta("name", "twitter:image", meta.imageUrl);
    upsertSingleMeta("name", "twitter:image:alt", meta.shareTitle);
    upsertSingleCanonical(meta.pageUrl);
  }, [loading, slug, tournament]);

  const handlePlaceBid = async () => {
    if (!bidForm) return;
    const amount = parseFloat(bidForm.amount);
    if (!amount || !bidForm.name || !bidForm.email) return;
    const { error } = await supabase.from("tournament_auction_bids").insert({
      item_id: bidForm.itemId, bidder_name: bidForm.name, bidder_email: bidForm.email, amount,
    });
    if (error) { toast({ title: "Error placing bid", variant: "destructive" }); return; }
    await supabase.from("tournament_auction_items").update({ current_bid: amount }).eq("id", bidForm.itemId);
    toast({ title: "Bid placed!" });
    setBidForm(null);
    const { data } = await supabase.from("tournament_auction_items").select("id,tournament_id,title,description,image_url,type,starting_bid,current_bid,buy_now_price,raffle_ticket_price,is_active,sort_order,created_at").eq("tournament_id", tournament!.id).eq("is_active", true).order("sort_order");
    if (data) setAuctionItems(data as AuctionItem[]);
  };

  const handleVolunteerSignup = async () => {
    if (!volForm || !tournament) return;
    const { error } = await supabase.from("tournament_volunteers").insert({
      role_id: volForm.roleId, tournament_id: tournament.id, name: volForm.name, email: volForm.email, phone: volForm.phone || null,
    });
    if (error) { toast({ title: "Signup failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Thank you for volunteering!" });
    setVolForm(null);
  };

  const handleSurveySubmit = async () => {
    if (!surveyEmail || surveyQuestions.length === 0) return;
    const inserts = surveyQuestions.map((q) => ({
      survey_id: q.survey_id, question_id: q.id, respondent_email: surveyEmail, answer: surveyAnswers[q.id] || "",
    })).filter((r) => r.answer);
    const { error } = await supabase.from("tournament_survey_responses").insert(inserts);
    if (error) { toast({ title: "Error submitting survey", variant: "destructive" }); return; }
    toast({ title: "Thank you for your feedback!" });
    setSurveySubmitted(true);
  };

  const handleStoreBuy = async (productId: string) => {
    if (!tournament) return;
    setStoreBuyLoading(productId);
    try {
      const { data, error } = await supabase.functions.invoke("create-store-checkout", {
        body: { product_id: productId, tournament_slug: tournament.slug },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      toast({
        title: "Unable to process purchase",
        description: "Please try again or contact the tournament organizer.",
        variant: "destructive",
      });
      console.error("Store checkout error:", err);
    } finally {
      setStoreBuyLoading(null);
    }
  };

  const handleAuctionBuyNow = async (itemId: string) => {
    if (!tournament) return;
    setAuctionBuyLoading(itemId);
    try {
      const { data, error } = await supabase.functions.invoke("create-auction-checkout", {
        body: { item_id: itemId, tournament_slug: tournament.slug },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    } finally {
      setAuctionBuyLoading(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (notFound || !tournament) {
    // Shown as a friendly pop-up card (not a scary "not found" page) because in
    // sample mode the page usually loads fine after a quick reload.
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/20 text-2xl">
            ⛳
          </div>
          <h1 className="mb-2 text-xl font-display font-bold text-foreground">
            Just a moment — loading this tournament page
          </h1>
          <p className="mb-5 text-sm text-muted-foreground">
            We couldn't load the page on the first try. This is common in sample mode — tap reload
            and the live tournament page will open right up.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-secondary/80"
            >
              Reload page
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Back to home
            </a>
          </div>
        </div>
      </div>
    );
  }

  const primary = tournament.site_primary_color || "#1a5c38";
  const secondary = tournament.site_secondary_color || "#c8a84e";
  const heroTitle = tournament.site_hero_title || tournament.title;
  const coursePar = tournament.course_par || 72;
  const tpl = tournament.template || "classic";
  const style = templateStyles[tpl as keyof typeof templateStyles] || templateStyles.classic;

  // Public Page Design (organizer-customizable)
  const showLogo = tournament.site_show_logo !== false;
  const textColor = tournament.site_text_color || "#1F2937";
  const pageBg = tournament.site_background_color || "#ffffff";
  const fontFamilyId = tournament.site_font_family || "Inter";
  const fontStackCss = (() => {
    const stacks: Record<string, string> = {
      Inter: "'Inter', system-ui, sans-serif",
      Roboto: "'Roboto', system-ui, sans-serif",
      Montserrat: "'Montserrat', sans-serif",
      Lato: "'Lato', sans-serif",
      "Open Sans": "'Open Sans', sans-serif",
      Poppins: "'Poppins', sans-serif",
      "Playfair Display": "'Playfair Display', Georgia, serif",
      Merriweather: "'Merriweather', Georgia, serif",
    };
    return stacks[fontFamilyId] || stacks.Inter;
  })();
  const headingSize = tournament.site_heading_font_size ?? 60;
  const bodySize = tournament.site_body_font_size ?? 16;
  const buttonSize = tournament.site_button_font_size ?? 16;
  const logoPos = (tournament.site_logo_position || "center") as "left" | "center" | "right";
  const titlePos = (tournament.site_title_position || "center") as "left" | "center" | "right";
  const buttonPos = (tournament.site_button_position || "center") as "left" | "center" | "right";
  const buttonRadius = tournament.site_button_radius ?? 8;
  const flexJustify: Record<string, string> = { left: "justify-start", center: "justify-center", right: "justify-end" };
  const textAlignClass: Record<string, "left" | "center" | "right"> = { left: "left", center: "center", right: "right" };

  // Organizer-controlled public page tabs (visibility + order).
  // A tab is shown only if (a) the organizer enabled it AND (b) it has data to render.
  const tabVisibility = normalizeVisibility(tournament.public_tabs);
  const tabOrder = normalizeOrder(tournament.public_tabs_order);

  const customOrgSections: Array<{ id: string; title: string; content: string }> =
    Array.isArray((tournament as any).custom_org_sections) ? (tournament as any).custom_org_sections : [];
  const hasOrgContent =
    !!(tournament as any).about_us ||
    !!(tournament as any).mission_statement ||
    !!(tournament as any).vision_statement ||
    !!(tournament as any).history ||
    !!(tournament as any).org_contact_email ||
    !!(tournament as any).org_contact_phone ||
    !!(tournament as any).org_address ||
    customOrgSections.some((s) => (s.title?.trim() || s.content?.trim()));

  const tabHasData: Record<PublicTabKey, boolean> = {
    about_event: !!(tournament as any).description_html?.replace(/<[^>]*>/g, "").trim() || !!tournament.description,
    registration: !!tournament.registration_open,
    leaderboard: leaderboard.length > 0,
    sponsors: ((tournament as any).show_sponsorships ?? true) && (sponsors.length > 0 || sponsorshipTiers.length > 0),
    gallery: photos.length > 0,
    media: mediaClips.length > 0,
    volunteers: volunteerRoles.length > 0,
    auction: auctionItems.length > 0,
    donations: !!tournament.donation_goal_cents || donationTotal > 0,
    course_details: !!tournament.course_name || !!tournament.location,
    contests: contests.length > 0,
    travel: !!tournament.location,
    schedule: !!tournament.schedule_info || !!(tournament as any).schedule_info_html,
    about_organizer: ((tournament as any).show_org_tab ?? true) && hasOrgContent,
    lodging: accommodations.length > 0,
  };

  const isTabVisible = (key: PublicTabKey) => tabVisibility[key] && tabHasData[key];

  const tabHrefByKey: Record<PublicTabKey, string> = {
    about_event: "#about",
    registration: "#register",
    leaderboard: "#leaderboard",
    sponsors: "#sponsors",
    gallery: "#photos",
    media: "#media",
    volunteers: "#volunteers",
    auction: "#auction",
    donations: "#donation",
    course_details: "#location",
    contests: "#contests",
    travel: "#location",
    schedule: "#schedule",
    about_organizer: "#about-organizer",
    lodging: "#lodging",
  };
  const tabLabelByKey: Record<PublicTabKey, string> = {
    about_event: "About",
    registration: "Registration",
    leaderboard: "Leaderboard",
    sponsors: "Sponsors",
    gallery: "Photos",
    media: (tournament as any).media_tab_title || "Media",
    volunteers: "Volunteers",
    auction: "Auction & Raffle",
    donations: "Donation",
    course_details: "Course",
    contests: "Event Day Contests",
    travel: "Location",
    schedule: "Schedule",
    about_organizer: "About the Organizer",
    lodging: "Lodging",
  };

  // Build nav links: Home + Registration always; optional tabs in organizer order; Contact last.
  const orderedOptionalLinks = tabOrder
    .filter((k) => isTabVisible(k))
    .map((k) => ({ label: tabLabelByKey[k], href: tabHrefByKey[k] }))
    // De-duplicate hrefs (course_details + travel both anchor to #location)
    .filter((link, idx, arr) => arr.findIndex((l) => l.href === link.href) === idx);

  const navLinks: { label: string; href: string }[] = [
    { label: "Home", href: "#top" },
    ...orderedOptionalLinks,
    { label: "Contact Us", href: "#contact" },
  ];

  const scrollTo = (href: string) => {
    setMobileNavOpen(false);
    if (href === "#top") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    let el = document.querySelector(href);
    // Fallback: Sponsors nav points to #sponsors (thank-you carousel). If that
    // section isn't rendered (no paid sponsors yet), jump to the "Become a
    // Sponsor" tiers section instead so the link is never a no-op.
    if (!el && href === "#sponsors") el = document.querySelector("#become-a-sponsor");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // Logo color override CSS filter
  const getLogoFilterStyle = (): CSSProperties => {
    const mode = tournament?.site_logo_color_mode;
    if (!mode || mode === "original") return {};
    if (mode === "white") return { filter: "brightness(0) invert(1)" };
    if (mode === "black") return { filter: "brightness(0)" };
    if (mode === "custom" && tournament?.site_logo_color_value) {
      // Tint via mask: render solid color box, mask by logo. Done inline via CSS filter chain isn't perfect; use mask-image fallback approach via data attr is complex—use background-color trick.
      return {};
    }
    return {};
  };
  const renderLogo = (src: string, alt: string, className: string, extraStyle: CSSProperties = {}) => {
    const mode = tournament?.site_logo_color_mode;
    const customColor = tournament?.site_logo_color_value;
    if (mode === "custom" && customColor) {
      return (
        <div
          aria-label={alt}
          role="img"
          className={className}
          style={{
            ...extraStyle,
            backgroundColor: customColor,
            WebkitMaskImage: `url(${src})`,
            maskImage: `url(${src})`,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            WebkitMaskSize: "contain",
            maskSize: "contain",
          }}
        />
      );
    }
    return <img src={src} alt={alt} className={className} style={{ ...extraStyle, ...getLogoFilterStyle() }} />;
  };

  // Format the event date — supports an optional end_date for multi-day events
  const formattedEventDate = (() => {
    if (!tournament?.date) return null;
    const start = new Date(tournament.date + "T00:00:00");
    const startStr = start.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    if (!tournament.end_date || tournament.end_date === tournament.date) return startStr;
    const end = new Date(tournament.end_date + "T00:00:00");
    const sameYear = end.getFullYear() === start.getFullYear();
    const sameMonth = sameYear && end.getMonth() === start.getMonth();
    if (sameMonth) {
      return `${start.toLocaleDateString("en-US", { month: "long", day: "numeric" })}–${end.getDate()}, ${end.getFullYear()}`;
    }
    if (sameYear) {
      return `${start.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "long", day: "numeric" })}, ${end.getFullYear()}`;
    }
    return `${startStr} – ${end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
  })();

  // Sponsor carousel — merge organizer-added sponsors with publicly-approved sponsor_registrations
  const _sponsorTierWeight = (tier: string) => {
    const order: Record<string, number> = { title: 0, presenting: 1, platinum: 2, gold: 3, silver: 4, bronze: 5, hole: 6, supporter: 7, inkind: 8 };
    return order[tier] ?? 99;
  };
  const allSponsors: PublicSponsor[] = [
    ...sponsors,
    ...paidSponsors
      .filter((p) => !sponsors.some((s) => s.name.trim().toLowerCase() === p.company_name.trim().toLowerCase()))
      .map((p) => ({
        id: `reg-${p.id}`,
        name: p.company_name,
        tier: p.is_title_sponsor ? "title" : "supporter",
        logo_url: p.logo_url,
        website_url: p.website_url,
        show_on_leaderboard: false,
      })),
  ].sort((a, b) => _sponsorTierWeight(a.tier) - _sponsorTierWeight(b.tier));
  const sponsorsPerPage = 3;
  const sponsorPages = Math.ceil(allSponsors.length / sponsorsPerPage);
  const visibleSponsors = allSponsors.slice(sponsorIndex * sponsorsPerPage, (sponsorIndex + 1) * sponsorsPerPage);

  // Hover effect for design-controlled buttons
  const hoverFilter =
    tournament.site_button_hover_effect === "lighten" ? "brightness(1.12)" :
    tournament.site_button_hover_effect === "none" ? "none" :
    "brightness(0.88)";

  // Photo gallery — rendered in the position the organizer picks (default: between Store and Volunteers)
  const galleryPosition = tournament.gallery_position || "default";
  const galleryNode = (isTabVisible("gallery") && photos.length > 0) ? (
    <section id="photos" className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <figure key={photo.id} className="rounded-lg overflow-hidden border bg-gray-50 flex flex-col" style={{ borderColor: "#e5e5e5" }}>
                <img
                  src={photo.image_url}
                  alt={photo.caption || ""}
                  loading="lazy"
                  className="w-full max-h-80 object-contain hover:scale-[1.02] transition-transform duration-300"
                />
                {photo.caption && (
                  <figcaption className="px-3 py-2 text-xs text-center" style={{ color: "#666" }}>{photo.caption}</figcaption>
                )}
              </figure>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  ) : null;

  // Media clips — rendered in the position the organizer picks.
  // Shown whenever active clips exist (independent of the "Media" tab-visibility toggle,
  // since adding a clip is itself an explicit publish action).
  const mediaPosition = (tournament as any).media_position || "default";
  const mediaNode = mediaClips.length > 0 ? (
    <section id="media" className="py-16" style={{ backgroundColor: "#fff" }}>
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-2xl font-display font-bold text-center mb-2" style={{ color: "#1a1a1a" }}>
          {((tournament as any).media_tab_title || "MEDIA").toUpperCase()}
        </h2>
        <div className="w-16 h-0.5 mx-auto mb-8" style={{ backgroundColor: secondary }} />
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {mediaClips.map((clip) => (
            <button
              key={clip.id}
              onClick={() => setMediaClipOpen(clip.id)}
              className="group relative aspect-video rounded-lg overflow-hidden bg-muted border hover:shadow-lg transition-shadow"
            >
              {clip.thumbnail_url ? (
                <img src={clip.thumbnail_url} alt={clip.title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 text-white text-sm">No thumbnail</div>
              )}
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z" /></svg>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-white text-sm font-medium text-left">
                {clip.title}
              </div>
            </button>
          ))}
        </div>
      </div>
      {mediaClipOpen && (() => {
        const clip = mediaClips.find((c) => c.id === mediaClipOpen);
        if (!clip) return null;
        const url = clip.video_url;
        let embed: string | null = null;
        const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
        if (yt) embed = `https://www.youtube.com/embed/${yt[1]}?autoplay=1`;
        const vm = url.match(/vimeo\.com\/(\d+)/);
        if (!embed && vm) embed = `https://player.vimeo.com/video/${vm[1]}?autoplay=1`;
        return (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setMediaClipOpen(null)}
          >
            <div className="w-full max-w-4xl aspect-video" onClick={(e) => e.stopPropagation()}>
              {embed ? (
                <iframe src={embed} className="w-full h-full rounded-lg" allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
              ) : (
                <video src={url} controls autoPlay className="w-full h-full rounded-lg bg-black" />
              )}
              {clip.description && <p className="text-white text-sm mt-3">{clip.description}</p>}
            </div>
          </div>
        );
      })()}
    </section>
  ) : null;




  const showRegistrationSection = isTabVisible("registration");

  const formatCountdown = () => {
    if (!earlyExpiresAt) return "";
    const ms = earlyExpiresAt.getTime() - earlyNow;
    if (ms <= 0) return "Expired";
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${days}d ${hours}h ${minutes}m`;
  };

  /* Scheduled registration close */
  const regCloseAt = (tournament as any).registration_close_at as string | null;
  const regAutoClose = !!(tournament as any).registration_auto_close_enabled;
  const regClosedByTime = regAutoClose && !!regCloseAt && new Date(regCloseAt).getTime() <= Date.now();
  const showClosedNotice = regAutoClose && regClosedByTime && !tournament.registration_url;
  const closedMessage =
    ((tournament as any).registration_closed_message as string | null)?.trim() ||
    "Registration for this event is now closed. Thank you for your interest — we have reached our registration deadline. If you would still like to play, be added to our waitlist, or ask about sponsorship opportunities, please contact us and we will do our best to help.";
  const closedEmail = (tournament as any).registration_closed_contact_email as string | null;
  const closedPhone = (tournament as any).registration_closed_contact_phone as string | null;

  const registrationSection = (
    <>
      {/* ===== REGISTRATION CLOSED NOTICE ===== */}
      {showClosedNotice && (
        <section id="register" className="py-16" style={{ backgroundColor: "#fafafa" }}>
          <div className="max-w-xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-display font-bold mb-2" style={{ color: "#1a1a1a" }}>REGISTRATION CLOSED</h2>
            <div className="w-16 h-0.5 mx-auto mb-4" style={{ backgroundColor: secondary }} />
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "#666" }}>{closedMessage}</p>
            {(closedEmail || closedPhone) && (
              <div className="mt-5 space-y-1 text-sm">
                {closedEmail && (
                  <div>
                    <a href={`mailto:${closedEmail}`} className="font-semibold underline" style={{ color: primary }}>{closedEmail}</a>
                  </div>
                )}
                {closedPhone && (
                  <div>
                    <a href={`tel:${closedPhone}`} className="font-semibold underline" style={{ color: primary }}>{closedPhone}</a>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===== REGISTRATION ===== */}
      {tournament.registration_open && !regClosedByTime && !tournament.registration_url && (

        <section id="register" className="py-16" style={{ backgroundColor: "#fafafa" }}>
          <div className="max-w-xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-display font-bold mb-2" style={{ color: "#1a1a1a" }}>REGISTRATION</h2>
                <div className="w-16 h-0.5 mx-auto mb-4" style={{ backgroundColor: secondary }} />
                {(tournament as any).registration_intro_html?.trim() ? (
                  <div
                    className="prose prose-sm max-w-none mx-auto"
                    style={{ color: "#666" }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml((tournament as any).registration_intro_html) }}
                  />
                ) : (
                  <p style={{ color: "#666" }}>
                    {isTournamentFull && tournament.waitlist_enabled
                      ? "This tournament is currently full. Join the waitlist below."
                      : tournament.foursome_registration
                        ? "Register your foursome below to secure your spots."
                        : "Fill out the form below to secure your spot."}
                  </p>
                )}
                {earlyActive && (
                  <div className="mt-4 inline-flex flex-col items-center gap-1 px-4 py-3 rounded-lg" style={{ backgroundColor: secondary + "20", border: `1px solid ${secondary}` }}>
                    <div className="text-sm" style={{ color: "#666" }}>
                      <span className="line-through mr-2">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((tournament.registration_fee_cents || 0) / 100)}</span>
                      <span className="text-lg font-bold" style={{ color: secondary }}>
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(effectiveFeeCents / 100)}
                      </span>
                      <span className="ml-2 text-xs uppercase tracking-wider font-semibold">Early Bird</span>
                    </div>
                    {(earlyPrice2Cents != null || earlyPrice4Cents != null) && (
                      <div className="text-xs mt-1" style={{ color: "#666" }}>
                        {earlyPrice2Cents != null && (
                          <span className="mr-3">
                            2-player team: <strong style={{ color: secondary }}>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(earlyPrice2Cents) / 100)}</strong>
                          </span>
                        )}
                        {earlyPrice4Cents != null && (
                          <span>
                            4-player team: <strong style={{ color: secondary }}>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(earlyPrice4Cents) / 100)}</strong>
                          </span>
                        )}
                      </div>
                    )}
                    {earlyExpiresAt && (
                      <div className="text-xs" style={{ color: "#666" }}>
                        Early bird pricing ends in <strong>{formatCountdown()}</strong>
                      </div>
                    )}
                  </div>
                )}
                {tournament.max_players && (tournament as any).show_registration_count === true && (() => {
                  // When the only allowed registration size is a fixed group (e.g. foursomes only),
                  // count in teams rather than individual players.
                  const sizes = Array.isArray((tournament as any).allowed_group_sizes) ? ((tournament as any).allowed_group_sizes as number[]) : [];
                  const fixedSize = sizes.length === 1 && sizes[0] > 1
                    ? sizes[0]
                    : (sizes.length === 0 && tournament.foursome_registration && ((tournament as any).max_group_size ?? 4) === 4 ? 4 : null);
                  if (fixedSize) {
                    const teamCapacity = Math.floor((tournament.max_players || 0) / fixedSize);
                    const teamsFilled = Math.min(teamCapacity, Math.ceil(registrationCount / fixedSize));
                    const label = fixedSize === 4 ? "foursome" : fixedSize === 3 ? "threesome" : fixedSize === 2 ? "twosome" : "team";
                    return (
                      <p className="text-xs mt-2" style={{ color: "#999" }}>
                        {teamsFilled} / {teamCapacity} {label} spots filled
                      </p>
                    );
                  }
                  return (
                    <p className="text-xs mt-2" style={{ color: "#999" }}>
                      {registrationCount} / {tournament.max_players} spots filled
                    </p>
                  );
                })()}
              </div>


              {isTournamentFull && tournament.waitlist_enabled ? (
                <div className="bg-white rounded-xl border p-6 shadow-sm" style={{ borderColor: "#e5e5e5" }}>
                  <WaitlistSignup
                    tournamentId={tournament.id}
                    primaryColor={primary}
                    secondaryColor={secondary}
                    depositCents={tournament.waitlist_deposit_cents || 0}
                    maxWaitlistSlots={tournament.max_waitlist_slots ?? null}
                    maxGroupSize={4}
                  />
                </div>
              ) : isTournamentFull ? (
                <div className="bg-white rounded-xl border p-8 shadow-sm text-center" style={{ borderColor: "#e5e5e5" }}>
                  <Users className="h-12 w-12 mx-auto mb-3" style={{ color: "#999" }} />
                  <h3 className="text-xl font-bold mb-2" style={{ color: "#1a1a1a" }}>Tournament Full</h3>
                  <p style={{ color: "#666" }}>All spots have been filled. Check back later for cancellations.</p>
                </div>
              ) : showConfirmation ? (
                <div className="bg-white rounded-xl border p-8 shadow-sm text-center relative" style={{ borderColor: "#e5e5e5" }}>
                  <button onClick={() => setShowConfirmation(false)} className="absolute top-3 right-3 rounded-full p-1 hover:bg-gray-100 transition-colors" aria-label="Close">
                    <X className="h-5 w-5" style={{ color: "#999" }} />
                  </button>
                  <CheckCircle className="h-16 w-16 mx-auto mb-4" style={{ color: secondary }} />
                  <h3 className="text-2xl font-display font-bold mb-2" style={{ color: "#1a1a1a" }}>You're Registered!</h3>
                  <p style={{ color: "#666" }}>Payment confirmed. You'll receive confirmation details via email.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border p-6 shadow-sm" style={{ borderColor: "#e5e5e5" }}>
                  <RegistrationForm
                    tournamentId={tournament.id}
                    primaryColor={primary}
                    secondaryColor={secondary}
                    registrationFeeCents={effectiveFeeCents}
                    earlyTeamTotalsCents={earlyTeamTotals}
                    foursomeMode={tournament.foursome_registration}
                    maxGroupSize={(tournament as any).max_group_size || (tournament.foursome_registration ? 4 : 1)}
                    allowedGroupSizes={Array.isArray((tournament as any).allowed_group_sizes) && (tournament as any).allowed_group_sizes.length > 0 ? (tournament as any).allowed_group_sizes as number[] : null}
                    isNonprofit={nonprofitInfo.isNonprofit}
                    nonprofitName={nonprofitInfo.nonprofitName}
                    ein={nonprofitInfo.ein}
                    platformFeeRate={nonprofitInfo.platformFeeRate}
                    passFeesToRegistrants={tournament.pass_fees_to_registrants || false}
                    allowCoverFees={tournament.allow_cover_fees !== false}
                    tiers={regTiers}
                    fields={regFields}
                    addonsSectionTitle={((tournament as any).store_section_title || "Add-Ons").toString()}
                    showAddons={((tournament as any).add_on_display_location || "both") !== "addon_page"}
                    captainLabel={(tournament as any).captain_label || null}
                    groupFieldRules={parseGroupFieldRules((tournament as any).group_field_rules)}

                    showPromoCodeInput={(tournament as any).show_promo_code_input !== false}
                    donationPrompt={(tournament as any).donation_prompt_enabled ? {
                      enabled: true,
                      title: (tournament as any).donation_prompt_title || "Support Our Mission",
                      description: (tournament as any).donation_prompt_description || null,
                      presetsCents: Array.isArray((tournament as any).donation_preset_amounts)
                        ? ((tournament as any).donation_preset_amounts as number[])
                        : [1000, 2500, 5000, 10000, 25000, 50000],
                      allowCustom: (tournament as any).donation_allow_custom !== false,
                      customLabel: (tournament as any).donation_custom_label || "Enter your own amount",
                    } : null}
                  />
                </div>
              )}
              {(tournament as any).refund_policy_text && (
                <div className="mt-4 p-4 rounded-lg border text-sm" style={{ borderColor: "#e5e5e5", backgroundColor: "#fff" }}>
                  <p className="font-semibold text-xs uppercase tracking-wider mb-1" style={{ color: primary }}>Refund Policy</p>
                  <p style={{ color: "#666" }}>{(tournament as any).refund_policy_text}</p>
                </div>
              )}
              {(tournament as any).registration_promo_html?.trim() && (
                <div
                  className="mt-4 p-5 rounded-xl border-2 prose prose-sm max-w-none"
                  style={{ borderColor: secondary, backgroundColor: secondary + "10", color: "#333" }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml((tournament as any).registration_promo_html) }}
                />
              )}
            </motion.div>
          </div>
        </section>
      )}

      {tournament.registration_url && (
        <section id="register" className="py-16" style={{ backgroundColor: primary }}>
          <div className="max-w-4xl mx-auto px-4 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">Ready to Play?</h2>
              <p className="text-white/70 max-w-xl mx-auto mb-8">Secure your spot today. Space is limited!</p>
              <a href={tournament.registration_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-3 rounded-md text-lg font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: secondary, color: primary }}>
                Register Now <ExternalLink className="h-4 w-4" />
              </a>
            </motion.div>
          </div>
        </section>
      )}
    </>
  );

  const sponsorsBeforeRegistration =
    tabOrder.indexOf("sponsors" as PublicTabKey) < tabOrder.indexOf("registration" as PublicTabKey);

  const sponsorsBlock = (
    <>
      {/* ===== THANK YOU SPONSORS CAROUSEL ===== */}
      {isTabVisible("sponsors") && allSponsors.length > 0 && (
        <section id="sponsors" className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-2" style={{ color: "#1a1a1a" }}>
              THANK YOU SPONSORS
            </h2>
            <div className="w-16 h-0.5 mx-auto mb-10" style={{ backgroundColor: secondary }} />

            <div className="relative flex items-center justify-center gap-2 sm:gap-8">
              {sponsorPages > 1 && (
                <button
                  onClick={() => setSponsorIndex((prev) => (prev - 1 + sponsorPages) % sponsorPages)}
                  className="shrink-0 p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Previous sponsors"
                >
                  <ChevronLeft className="h-6 w-6 text-gray-400" />
                </button>
              )}

              <div className="flex-1 flex flex-wrap items-center justify-center gap-x-8 gap-y-8 sm:gap-x-12 min-h-[120px] py-4">
                {(() => {
                  const size = (tournament as any).sponsor_logo_display_size || "medium";
                  const sizeMap: Record<string, { box: string; featured: string }> = {
                    small:  { box: "h-16 sm:h-20 w-[140px] sm:w-[170px]", featured: "h-20 sm:h-24 w-[180px] sm:w-[220px]" },
                    medium: { box: "h-24 sm:h-28 w-[180px] sm:w-[220px]", featured: "h-28 sm:h-36 w-[220px] sm:w-[280px]" },
                    large:  { box: "h-32 sm:h-40 w-[220px] sm:w-[280px]", featured: "h-40 sm:h-48 w-[260px] sm:w-[340px]" },
                    xlarge: { box: "h-40 sm:h-52 w-[260px] sm:w-[340px]", featured: "h-48 sm:h-64 w-[300px] sm:w-[400px]" },
                  };
                  const dims = sizeMap[size] || sizeMap.medium;
                  return visibleSponsors.map((s) => {
                    const sponsorUrl = s.website_url
                      ? (s.website_url.startsWith("http://") || s.website_url.startsWith("https://") ? s.website_url : `https://${s.website_url}`)
                      : null;
                    const isFeatured = s.tier === "title" || s.tier === "presenting" || s.tier === "platinum";
                    const boxClass = `${isFeatured ? dims.featured : dims.box} flex items-center justify-center`;
                    const imgClass = "max-h-full max-w-full object-contain";
                    return (
                    <div key={s.id} className="flex flex-col items-center">
                      {sponsorUrl ? (
                        <a href={sponsorUrl} target="_blank" rel="noopener noreferrer" className="group">
                          <div className={boxClass}>
                            {s.logo_url ? (
                              <img src={s.logo_url} alt={s.name} className={`${imgClass} group-hover:scale-105 transition-transform`} />
                            ) : (
                              <span className="text-lg font-bold text-gray-700 group-hover:text-gray-900 transition-colors text-center">{s.name}</span>
                            )}
                          </div>
                        </a>
                      ) : (
                        <div className={boxClass}>
                          {s.logo_url ? (
                            <img src={s.logo_url} alt={s.name} className={imgClass} />
                          ) : (
                            <span className="text-lg font-bold text-gray-700 text-center">{s.name}</span>
                          )}
                        </div>
                      )}
                      {(s.tier === "presenting" || s.tier === "title") && (
                        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-2 text-center">
                          {s.tier === "title" ? "Title Sponsor" : "Thanks to Our Presenting Sponsor"}
                        </span>
                      )}
                    </div>
                    );
                  });
                })()}
              </div>


              {sponsorPages > 1 && (
                <button
                  onClick={() => setSponsorIndex((prev) => (prev + 1) % sponsorPages)}
                  className="shrink-0 p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Next sponsors"
                >
                  <ChevronRight className="h-6 w-6 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===== DIVIDER BETWEEN SPONSORS AND BECOME A SPONSOR ===== */}
      {isTabVisible("sponsors") && (
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px" style={{ backgroundColor: "#e0e0e0" }} />
            <Award className="h-5 w-5" style={{ color: secondary }} />
            <div className="flex-1 h-px" style={{ backgroundColor: "#e0e0e0" }} />
          </div>
        </div>
      )}

      {/* ===== SPONSORSHIP TIERS (Become a Sponsor) ===== */}
      {isTabVisible("sponsors") && (
      <section id="become-a-sponsor" className="py-16" style={{ backgroundColor: "#fafafa" }}>
          <div className="max-w-5xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-2" style={{ color: "#1a1a1a" }}>
                BECOME A SPONSOR
              </h2>
              <div className="w-16 h-0.5 mx-auto mb-4" style={{ backgroundColor: secondary }} />
              <p className="text-center text-sm mb-10" style={{ color: "#888" }}>
                Partner with us to make this event a success. Choose a sponsorship level below.
              </p>

              {sponsorSuccess && (
                <div className="max-w-md mx-auto mb-10 bg-white rounded-xl border-2 p-8 text-center" style={{ borderColor: `${secondary}40` }}>
                  <CheckCircle className="h-16 w-16 mx-auto mb-4" style={{ color: secondary }} />
                  <h3 className="text-2xl font-display font-bold mb-2" style={{ color: "#1a1a1a" }}>Thank You!</h3>
                  <p style={{ color: "#666" }}>
                    Your sponsorship has been confirmed. The tournament organizer will reach out with next steps.
                  </p>
                </div>
              )}

              {sponsorVerifying && (
                <div className="flex items-center justify-center gap-2 mb-8">
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color: primary }} />
                  <p style={{ color: "#666" }}>Verifying your sponsorship payment...</p>
                </div>
              )}

              {sponsorshipTiers.length > 0 ? (
                <>
                  <div className={`grid gap-6 ${sponsorshipTiers.length === 1 ? "max-w-md mx-auto" : sponsorshipTiers.length === 2 ? "sm:grid-cols-2 max-w-2xl mx-auto" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
                    {sponsorshipTiers.map((tier, i) => {
                      const remaining = tier.total_spots != null ? Math.max(0, tier.total_spots - (tier.spots_used || 0)) : null;
                      const soldOut = remaining === 0;
                      const packageLabel = tier.custom_package_label?.trim() || null;
                      return (
                      <motion.div
                        key={tier.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className={`bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-shadow flex flex-col ${soldOut ? "opacity-70" : ""}`}
                        style={{ borderColor: "#e5e5e5" }}
                      >
                        <div className="p-6 text-center" style={{ backgroundColor: primary + "08" }}>
                          <Award className="h-8 w-8 mx-auto mb-2" style={{ color: secondary }} />
                          {packageLabel && (
                            <span className="inline-block text-[10px] font-semibold uppercase tracking-wider mb-1 px-2 py-0.5 rounded" style={{ backgroundColor: secondary + "20", color: "#555" }}>
                              {packageLabel}
                            </span>
                          )}
                          <h3 className="text-xl font-display font-bold" style={{ color: "#1a1a1a" }}>{tier.name}</h3>
                          {soldOut && (tier as any).hide_price_when_sold_out !== false ? (
                            <p className="text-2xl font-bold mt-1 uppercase tracking-wider" style={{ color: "#999" }}>Sold Out</p>
                          ) : (
                            <p className="text-2xl font-bold mt-1" style={{ color: primary }}>
                              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(tier.price_cents / 100)}
                            </p>
                          )}
                          {tier.description && (
                            <p className="text-sm mt-2" style={{ color: "#666" }}>{tier.description}</p>
                          )}
                          {remaining != null && !soldOut && (
                            <p className="text-xs mt-2 font-semibold text-emerald-700">
                              {`${remaining} of ${tier.total_spots} ${remaining === 1 ? "spot" : "spots"} left`}
                            </p>
                          )}
                        </div>

                        {tier.benefits && (
                          <div className="flex-1 px-6 py-4 border-t" style={{ borderColor: "#f0f0f0" }}>
                            <div className="text-sm whitespace-pre-line" style={{ color: "#555" }}>
                              {tier.benefits}
                            </div>
                          </div>
                        )}

                        <div className="p-6 pt-2">
                          {soldOut ? (
                            <button
                              type="button"
                              disabled
                              className="block w-full py-3 rounded-lg text-center font-bold text-sm tracking-wider uppercase bg-gray-200 text-gray-500 cursor-not-allowed"
                            >
                              Sold Out
                            </button>
                          ) : (
                            <a
                              href={`/t/${slug}/sponsor?tier=${tier.id}`}
                              className="block w-full py-3 rounded-lg text-center font-bold text-sm tracking-wider uppercase transition-opacity hover:opacity-90"
                              style={{ backgroundColor: secondary, color: primary }}
                            >
                              Select
                            </a>
                          )}
                        </div>
                      </motion.div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="max-w-2xl mx-auto bg-white rounded-xl border p-8 text-center" style={{ borderColor: "#e5e5e5" }}>
                  <Heart className="h-10 w-10 mx-auto mb-4" style={{ color: secondary }} />
                  <h3 className="text-xl font-display font-bold mb-2" style={{ color: "#1a1a1a" }}>Sponsorship opportunities coming soon</h3>
                  <p className="text-sm" style={{ color: "#666" }}>
                    Contact the tournament organizer for details{tournament.contact_email ? ` at ${tournament.contact_email}` : "."}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </section>
      )}
    </>
  );

  return (

    <div className="min-h-screen" style={{ backgroundColor: pageBg, color: textColor, fontFamily: fontStackCss, fontSize: `${bodySize}px` }} id="top">
      {/* Design-system button hover effect (organizer-controlled) */}
      <style>{`.tv-design-btn{transition:filter .2s ease, transform .2s ease;} .tv-design-btn:hover{filter:${hoverFilter};}`}</style>
      {/* ===== REGISTRATION CONFIRMATION BANNER (top of page) ===== */}
      {showConfirmation && (
        <div className="fixed top-14 left-0 right-0 z-40">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl mx-auto m-4"
          >
            <div className="bg-white rounded-xl border-2 p-8 shadow-2xl text-center relative" style={{ borderColor: `${secondary}40` }}>
              <button
                onClick={() => setShowConfirmation(false)}
                className="absolute top-3 right-3 rounded-full p-1 hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" style={{ color: "#999" }} />
              </button>
              <CheckCircle className="h-16 w-16 mx-auto mb-4" style={{ color: secondary }} />
              <h3 className="text-2xl font-display font-bold mb-2" style={{ color: "#1a1a1a" }}>You're Registered!</h3>
              <p style={{ color: "#666" }}>Payment confirmed. You'll receive confirmation details via email.</p>
            </div>
          </motion.div>
        </div>
      )}
      {/* ===== TOP NAVIGATION BAR ===== */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b"
        style={{ background: style.navBg, borderColor: "rgba(255,255,255,0.1)" }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between h-14 px-4">

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="px-3 py-1.5 text-xs font-semibold tracking-[0.15em] uppercase transition-colors hover:opacity-80"
                style={{ color: style.navText }}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Social icons placeholder */}
          <div className="hidden md:flex items-center gap-2">
            <div className="w-7 h-7 rounded-full border flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity cursor-pointer" style={{ borderColor: "rgba(255,255,255,0.3)" }}>
              <Facebook className="h-3.5 w-3.5" style={{ color: style.navText }} />
            </div>
            <div className="w-7 h-7 rounded-full border flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity cursor-pointer" style={{ borderColor: "rgba(255,255,255,0.3)" }}>
              <Instagram className="h-3.5 w-3.5" style={{ color: style.navText }} />
            </div>
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
            {mobileNavOpen
              ? <X className="h-5 w-5" style={{ color: style.navText }} />
              : <Menu className="h-5 w-5" style={{ color: style.navText }} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileNavOpen && (
          <div className="md:hidden border-t" style={{ background: style.navBg, borderColor: "rgba(255,255,255,0.1)" }}>
            <div className="flex flex-col p-4 gap-2">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="text-left text-sm font-semibold tracking-wider uppercase py-2 transition-colors hover:opacity-80"
                  style={{ color: style.navText }}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section
        id="hero"
        className="relative min-h-[75vh] sm:min-h-screen flex flex-col items-center justify-center pt-14 pb-10 sm:pb-0"
        style={{
          backgroundColor: primary,
        }}
      >
        {/* Background image — on mobile the full image is shown (contain) below the fixed nav so the top isn't clipped */}
        {tournament.site_hero_image_url && (
          <div
            className="absolute inset-x-0 bottom-0 top-14 sm:top-0 bg-contain bg-top sm:bg-cover sm:bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${tournament.site_hero_image_url})`,
              opacity: (tournament.site_hero_opacity ?? 100) / 100,
            }}
          />
        )}

        {/* Overlay */}
        <div className="absolute inset-0" style={{ background: style.heroOverlay }} />

        {/* Hero content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 w-full max-w-4xl mx-auto"
          style={{ textAlign: style.heroAlign }}
        >
          {/* Logo */}
          {showLogo && tournament.site_logo_url && (
            <div className={`w-full flex mb-6 ${flexJustify[logoPos]}`}>
              {renderLogo(
                tournament.site_logo_url,
                heroTitle,
                `object-contain ${tpl === "charity" ? "h-20 w-20" : "h-28 w-auto max-w-xs"}`,
                { transform: `translate(${tournament.site_logo_offset_x ?? 0}px, ${tournament.site_logo_offset_y ?? 0}px)` },
              )}
            </div>
          )}

          {/* Title */}
          <h1
            className="font-bold leading-tight tournament-title"
            style={{
              color: "#ffffff",
              textShadow: "0 2px 20px rgba(0,0,0,0.4)",
              fontSize: `clamp(${Math.max(24, Math.round(headingSize * 0.5))}px, ${Math.max(5, Math.round(headingSize / 12))}vw, ${headingSize}px)`,
              letterSpacing: "normal",
              textAlign: textAlignClass[titlePos],
              width: "100%",
              fontFamily: fontStackCss,
            }}
          >
            {heroTitle}
          </h1>

          {/* Subtitle */}
          {tournament.site_hero_subtitle && (
            <p
              className="mt-4 mx-auto text-center max-w-full sm:max-w-2xl whitespace-pre-line break-words"
              style={{
                color: "rgba(255,255,255,0.85)",
                fontSize: "clamp(0.875rem, 2vw, 1.25rem)",
                lineHeight: 1.45,
              }}
            >
              {tournament.site_hero_subtitle}
            </p>
          )}


          {/* Event meta badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full">
            {formattedEventDate && (
              <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                <Calendar className="h-4 w-4 shrink-0" />
                {formattedEventDate}
              </span>
            )}
            {tournament.course_name && (
              <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap max-w-full truncate">
                <span className="shrink-0">⛳</span>
                <span className="truncate">{tournament.course_name}</span>
              </span>
            )}
            {tournament.location && (
              <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap max-w-full truncate">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{tournament.location}</span>
              </span>
            )}
          </div>

          {/* Countdown Timer (organizer-controlled) */}
          {countdown && !countdown.passed && (tournament as any)?.show_countdown && (() => {
            const countdownStyle = (tournament as any)?.countdown_style || "glass";
            const units = [
              { value: countdown.days, label: "Days" },
              { value: countdown.hours, label: "Hours" },
              { value: countdown.minutes, label: "Min" },
              { value: countdown.seconds, label: "Sec" },
            ];

            if (countdownStyle === "minimal") {
              return (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  className="mt-8 flex items-center gap-2 sm:gap-3">
                  {units.map((unit, i) => (
                    <div key={unit.label} className="flex items-center gap-2 sm:gap-3">
                      <div className="text-center">
                        <span className="text-3xl sm:text-4xl font-display font-bold text-white">{String(unit.value).padStart(2, "0")}</span>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">{unit.label}</p>
                      </div>
                      {i < units.length - 1 && <span className="text-2xl text-white/40 font-light">:</span>}
                    </div>
                  ))}
                </motion.div>
              );
            }

            if (countdownStyle === "solid") {
              return (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                  className="mt-8 flex items-center gap-3 sm:gap-4">
                  {units.map((unit) => (
                    <div key={unit.label} className="text-center">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: primary, border: `2px solid ${secondary}` }}>
                        <span className="text-2xl sm:text-3xl font-display font-bold text-white">{String(unit.value).padStart(2, "0")}</span>
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-wider mt-2 text-white/70">{unit.label}</p>
                    </div>
                  ))}
                </motion.div>
              );
            }

            if (countdownStyle === "circle") {
              return (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                  className="mt-8 flex items-center gap-3 sm:gap-5">
                  {units.map((unit) => (
                    <div key={unit.label} className="text-center">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "rgba(255,255,255,0.1)", border: `2px solid ${secondary}` }}>
                        <span className="text-2xl sm:text-3xl font-display font-bold text-white">{String(unit.value).padStart(2, "0")}</span>
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-wider mt-2 text-white/70">{unit.label}</p>
                    </div>
                  ))}
                </motion.div>
              );
            }

            // Default: glass
            return (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                className="mt-8 flex items-center gap-4 sm:gap-6">
                {units.map((unit) => (
                  <div key={unit.label} className="text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex items-center justify-center backdrop-blur-md"
                      style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}>
                      <span className="text-2xl sm:text-3xl font-display font-bold text-white">{String(unit.value).padStart(2, "0")}</span>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider mt-2 text-white/70">{unit.label}</p>
                  </div>
                ))}
              </motion.div>
            );
          })()}
          {countdown?.passed && (
            <p className="mt-8 text-lg font-bold" style={{ color: secondary }}>
              🎉 Event Day is Here!
            </p>
          )}
        </motion.div>

        {/* ===== CTA BUTTONS AT BOTTOM OF HERO ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative z-10 w-full max-w-3xl mx-auto px-4 pb-0 -mb-[1px]"
        >
          <div className={`flex flex-wrap gap-3 ${flexJustify[buttonPos]}`}>
            {/* Registration button */}
            {((tournament.registration_open && !regClosedByTime) || tournament.registration_url || showClosedNotice) && (
              <a
                href={tournament.registration_url || "#register"}
                onClick={(e) => {
                  if (!tournament.registration_url) { e.preventDefault(); scrollTo("#register"); }
                }}
                target={tournament.registration_url ? "_blank" : undefined}
                rel={tournament.registration_url ? "noopener noreferrer" : undefined}
                className="tv-design-btn flex-1 min-w-[180px] max-w-[260px] py-4 text-center font-bold tracking-wider uppercase"
                style={{
                  backgroundColor: tpl === "modern" ? "#1565c0" : secondary,
                  color: tpl === "modern" ? "#ffffff" : primary,
                  borderRadius: `${buttonRadius}px`,
                  fontSize: `${buttonSize}px`,
                }}
              >
                {showClosedNotice ? "Registration Closed" : tpl === "charity" ? "Golf & Sponsor Registration" : "Registration"}
              </a>
            )}

            {/* Sponsors button */}
            {style.ctaLayout === "three" && isTabVisible("sponsors") && (
              <button
                onClick={() => scrollTo("#become-a-sponsor")}
                className="tv-design-btn flex-1 min-w-[180px] max-w-[260px] py-4 text-center font-bold tracking-wider uppercase"
                style={{
                  backgroundColor: tpl === "modern" ? "#b71c1c" : primary,
                  color: "#ffffff",
                  borderRadius: `${buttonRadius}px`,
                  fontSize: `${buttonSize}px`,
                }}
              >
                Sponsorship Opportunities
              </button>
            )}

            {/* Auction button */}
            {auctionItems.length > 0 && (
              <button
                onClick={() => scrollTo("#auction")}
                className="tv-design-btn flex-1 min-w-[180px] max-w-[260px] py-4 text-center font-bold tracking-wider uppercase"
                style={{
                  backgroundColor: tpl === "modern" ? "#424242" : tpl === "charity" ? "#1a1a1a" : "#333333",
                  color: "#ffffff",
                  borderRadius: `${buttonRadius}px`,
                  fontSize: `${buttonSize}px`,
                }}
              >
                View Auction Items
              </button>
            )}
          </div>
        </motion.div>
      </section>

      {galleryPosition === "top" && galleryNode}
      {mediaPosition === "top" && mediaNode}

      {sponsorsBeforeRegistration && sponsorsBlock}


      {/* Side Events / Tickets */}
      {sideEvents.length > 0 && (
        <section id="side-events" className="py-16" style={{ backgroundColor: "#fafafa" }}>
          <div className="max-w-5xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              {(() => {
                const raw = ((tournament as any).side_events_section_title ?? "Side Events & Tickets").toString();
                const trimmed = raw.trim();
                if (trimmed === "__hidden__") return null;
                const title = trimmed === "" ? "Side Events & Tickets" : trimmed;
                return (
                  <div className="text-center mb-10">
                    <h2 className="text-3xl font-display font-bold" style={{ color: "#1a1a1a" }}>{title}</h2>
                    <p className="text-sm mt-2" style={{ color: "#666" }}>Buy tickets to dinners, parties, clinics and more.</p>
                  </div>
                );
              })()}

              {sideEventSuccess && (
                <div className="max-w-xl mx-auto mb-8 rounded-lg border p-4 text-sm" style={{ borderColor: "#10b98140", backgroundColor: "#10b98110", color: "#065f46" }}>
                  Thanks! Your ticket is confirmed. Check your email for your ticket code.
                </div>
              )}
              {sideEventVerifying && (
                <div className="flex items-center justify-center gap-2 mb-8">
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color: primary }} />
                  <p style={{ color: "#666" }}>Verifying your ticket payment…</p>
                </div>
              )}

              <div className={`grid gap-6 ${sideEvents.length === 1 ? "max-w-md mx-auto" : sideEvents.length === 2 ? "sm:grid-cols-2 max-w-2xl mx-auto" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
                {sideEvents.map((ev) => {
                  const remaining = ev.max_tickets != null ? Math.max(0, ev.max_tickets - (ev.tickets_sold || 0)) : null;
                  const soldOut = remaining === 0;
                  return (
                    <div key={ev.id} className={`bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-shadow flex flex-col ${soldOut ? "opacity-70" : ""}`} style={{ borderColor: "#e5e5e5" }}>
                      <div className="p-6" style={{ backgroundColor: primary + "08" }}>
                        <Ticket className="h-8 w-8 mb-2" style={{ color: secondary }} />
                        <h3 className="text-xl font-display font-bold" style={{ color: "#1a1a1a" }}>{ev.name}</h3>
                        <p className="text-2xl font-bold mt-1" style={{ color: primary }}>
                          {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(ev.price_cents / 100)}
                        </p>
                        {ev.event_date && (
                          <p className="text-sm mt-2" style={{ color: "#666" }}>
                            <Calendar className="inline h-3 w-3 mr-1" />
                            {new Date(ev.event_date).toLocaleString()}
                          </p>
                        )}
                        {ev.location && (
                          <p className="text-sm" style={{ color: "#666" }}>
                            <MapPin className="inline h-3 w-3 mr-1" />
                            {ev.location}
                          </p>
                        )}
                        {remaining != null && (
                          <p className={`text-xs mt-2 font-semibold ${soldOut ? "text-red-600" : "text-emerald-700"}`}>
                            {soldOut ? "Sold Out" : `${remaining} ticket${remaining === 1 ? "" : "s"} left`}
                          </p>
                        )}
                      </div>
                      {ev.description && (
                        <div className="flex-1 px-6 py-4 border-t" style={{ borderColor: "#f0f0f0" }}>
                          <div className="text-sm whitespace-pre-line" style={{ color: "#555" }}>{ev.description}</div>
                        </div>
                      )}
                      <div className="p-6 pt-2">
                        {soldOut ? (
                          <button type="button" disabled className="block w-full py-3 rounded-lg text-center font-bold text-sm tracking-wider uppercase bg-gray-200 text-gray-500 cursor-not-allowed">
                            Sold Out
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setSideEventDialog({ id: ev.id, name: ev.name, price_cents: ev.price_cents, custom_questions: Array.isArray((ev as any).custom_questions) ? (ev as any).custom_questions : [] }); setSeForm({ name: "", email: "", phone: "", quantity: "1" }); setSeAnswers({}); }}
                            className="block w-full py-3 rounded-lg text-center font-bold text-sm tracking-wider uppercase transition-opacity hover:opacity-90"
                            style={{ backgroundColor: secondary, color: primary }}
                          >
                            Buy Tickets
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      <Dialog open={!!sideEventDialog} onOpenChange={(o) => !o && setSideEventDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buy Tickets — {sideEventDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Your Name *</Label>
              <Input value={seForm.name} onChange={(e) => setSeForm({ ...seForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={seForm.email} onChange={(e) => setSeForm({ ...seForm, email: e.target.value })} />
            </div>
            <div>
              <Label>Phone (optional)</Label>
              <Input value={seForm.phone} onChange={(e) => setSeForm({ ...seForm, phone: e.target.value })} />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" min="1" value={seForm.quantity} onChange={(e) => setSeForm({ ...seForm, quantity: e.target.value })} />
            </div>
            {sideEventDialog && (
              <p className="text-sm text-muted-foreground">
                Total: {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                  (sideEventDialog.price_cents * (parseInt(seForm.quantity || "1", 10) || 1)) / 100
                )} (plus fees)
              </p>
            )}
            {sideEventDialog?.custom_questions && sideEventDialog.custom_questions.length > 0 && (
              <div className="border-t pt-3 space-y-3">
                {sideEventDialog.custom_questions.map((q) => {
                  if (q.type === "checkbox") {
                    return (
                      <label key={q.id} className="flex items-start gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={!!seAnswers[q.id]}
                          onChange={(e) => setSeAnswers({ ...seAnswers, [q.id]: e.target.checked })}
                        />
                        <span>{q.label}{q.required && <span className="text-destructive"> *</span>}</span>
                      </label>
                    );
                  }
                  if (q.type === "select") {
                    return (
                      <div key={q.id}>
                        <Label>{q.label}{q.required && <span className="text-destructive"> *</span>}</Label>
                        <select
                          className="w-full mt-1 border rounded-md h-10 px-3 bg-background"
                          value={(seAnswers[q.id] as string) || ""}
                          onChange={(e) => setSeAnswers({ ...seAnswers, [q.id]: e.target.value })}
                        >
                          <option value="">Select…</option>
                          {(q.options || []).map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    );
                  }
                  return (
                    <div key={q.id}>
                      <Label>{q.label}{q.required && <span className="text-destructive"> *</span>}</Label>
                      <Input
                        value={(seAnswers[q.id] as string) || ""}
                        onChange={(e) => setSeAnswers({ ...seAnswers, [q.id]: e.target.value })}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSideEventDialog(null)}>Cancel</Button>
            <Button
              disabled={seSubmitting}
              onClick={async () => {
                if (!sideEventDialog) return;
                if (!seForm.name.trim() || !seForm.email.trim()) {
                  toast({ title: "Name and email required", variant: "destructive" });
                  return;
                }
                // Validate required custom questions
                const missing = (sideEventDialog.custom_questions || []).find((q) => {
                  if (!q.required) return false;
                  const v = seAnswers[q.id];
                  if (q.type === "checkbox") return !v;
                  return !v || (typeof v === "string" && !v.trim());
                });
                if (missing) {
                  toast({ title: "Please answer: " + missing.label, variant: "destructive" });
                  return;
                }
                // Build labelled answers for storage
                const answersForStorage = (sideEventDialog.custom_questions || []).map((q) => ({
                  id: q.id,
                  label: q.label,
                  type: q.type,
                  answer: seAnswers[q.id] ?? (q.type === "checkbox" ? false : ""),
                }));
                setSeSubmitting(true);
                try {
                  const { data, error } = await supabase.functions.invoke("create-side-event-checkout", {
                    body: {
                      side_event_id: sideEventDialog.id,
                      attendee_name: seForm.name.trim(),
                      attendee_email: seForm.email.trim(),
                      attendee_phone: seForm.phone.trim() || null,
                      quantity: parseInt(seForm.quantity || "1", 10) || 1,
                      custom_answers: answersForStorage,
                    },
                  });
                  if (error || !(data as any)?.checkout_url) throw new Error((data as any)?.error || error?.message || "Checkout failed");
                  window.location.href = (data as any).checkout_url;
                } catch (e: any) {
                  toast({ title: "Could not start checkout", description: e.message, variant: "destructive" });
                  setSeSubmitting(false);
                }
              }}
            >
              {seSubmitting ? "Loading…" : "Continue to Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Vendors / Booths section */}
      {(vendorTiers.length > 0 || paidVendors.length > 0) && (
        <section id="become-a-vendor" className="py-16" style={{ backgroundColor: "#ffffff" }}>
          <div className="max-w-6xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="text-center mb-10">
                <h2 className="text-3xl font-display font-bold" style={{ color: "#1a1a1a" }}>Vendors</h2>
                <p className="text-sm mt-2" style={{ color: "#666" }}>Reserve a booth at {tournament.title}.</p>
              </div>

              {vendorSuccess && (
                <div className="max-w-xl mx-auto mb-8 rounded-lg border p-4 text-sm" style={{ borderColor: "#10b98140", backgroundColor: "#10b98110", color: "#065f46" }}>
                  Thanks! Your booth registration is confirmed. Check your email for details.
                </div>
              )}
              {vendorVerifying && (
                <div className="flex items-center justify-center gap-2 mb-8">
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color: primary }} />
                  <p style={{ color: "#666" }}>Verifying your booth payment…</p>
                </div>
              )}

              {paidVendors.length > 0 && (
                <div className="mb-10">
                  <h3 className="text-center text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "#666" }}>Confirmed Vendors</h3>
                  <div className="flex flex-wrap justify-center gap-6 items-center">
                    {paidVendors.map((v) => {
                      const name = v.company_name || v.vendor_name;
                      const inner = v.logo_url
                        ? <img src={v.logo_url} alt={name} className="h-16 max-w-[140px] object-contain" />
                        : <span className="px-4 py-2 rounded border text-sm" style={{ borderColor: "#e5e5e5", color: "#333" }}>{name}</span>;
                      return v.website_url
                        ? <a key={v.id} href={v.website_url} target="_blank" rel="noreferrer" className="hover:opacity-80 transition-opacity">{inner}</a>
                        : <div key={v.id}>{inner}</div>;
                    })}
                  </div>
                </div>
              )}

              {vendorTiers.length > 0 && (
                <div className={`grid gap-6 ${vendorTiers.length === 1 ? "max-w-md mx-auto" : vendorTiers.length === 2 ? "sm:grid-cols-2 max-w-2xl mx-auto" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
                  {vendorTiers.map((tier, i) => {
                    const remaining = tier.total_spots != null ? Math.max(0, tier.total_spots - (tier.spots_used || 0)) : null;
                    const soldOut = remaining === 0;
                    return (
                      <motion.div
                        key={tier.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className={`bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-shadow flex flex-col ${soldOut ? "opacity-70" : ""}`}
                        style={{ borderColor: "#e5e5e5" }}
                      >
                        <div className="p-6 text-center" style={{ backgroundColor: primary + "08" }}>
                          <Store className="h-8 w-8 mx-auto mb-2" style={{ color: secondary }} />
                          <h3 className="text-xl font-display font-bold" style={{ color: "#1a1a1a" }}>{tier.name}</h3>
                          <p className="text-2xl font-bold mt-1" style={{ color: primary }}>
                            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(tier.price_cents / 100)}
                          </p>
                          {tier.description && <p className="text-sm mt-2" style={{ color: "#666" }}>{tier.description}</p>}
                          {remaining != null && (
                            <p className={`text-xs mt-2 font-semibold ${soldOut ? "text-red-600" : "text-emerald-700"}`}>
                              {soldOut ? "Sold Out" : `${remaining} of ${tier.total_spots} ${remaining === 1 ? "spot" : "spots"} left`}
                            </p>
                          )}
                        </div>
                        {tier.benefits && (
                          <div className="flex-1 px-6 py-4 border-t" style={{ borderColor: "#f0f0f0" }}>
                            <div className="text-sm whitespace-pre-line" style={{ color: "#555" }}>{tier.benefits}</div>
                          </div>
                        )}
                        <div className="p-6 pt-2">
                          {soldOut ? (
                            <button type="button" disabled className="block w-full py-3 rounded-lg text-center font-bold text-sm tracking-wider uppercase bg-gray-200 text-gray-500 cursor-not-allowed">
                              Sold Out
                            </button>
                          ) : (
                            <a
                              href={`/t/${slug}/vendors?tier=${tier.id}`}
                              className="block w-full py-3 rounded-lg text-center font-bold text-sm tracking-wider uppercase transition-opacity hover:opacity-90"
                              style={{ backgroundColor: secondary, color: primary }}
                            >
                              Reserve Booth
                            </a>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        </section>
      )}

      {isTabVisible("about_event") && (((tournament as any).description_html && (tournament as any).description_html.replace(/<[^>]*>/g, "").trim()) || tournament.description) && (
        <section id="about" className="py-16" style={{ backgroundColor: "#fafafa" }}>
          <div className="max-w-3xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              {tournament.site_logo_url && (
                renderLogo(tournament.site_logo_url, "", "h-16 w-16 mx-auto mb-6 object-contain")
              )}
              {(tournament as any).description_html && (tournament as any).description_html.replace(/<[^>]*>/g, "").trim() ? (
                <div
                  className="prose prose-sm sm:prose-base max-w-none leading-relaxed"
                  style={{ color: textColor, fontSize: `${bodySize}px` }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml((tournament as any).description_html) }}
                />
              ) : (
                <p className="leading-relaxed whitespace-pre-wrap" style={{ color: textColor, fontSize: `${bodySize}px` }}>
                  {tournament.description}
                </p>
              )}
            </motion.div>
          </div>
        </section>
      )}

      {galleryPosition === "after_sponsors" && galleryNode}
      {mediaPosition === "after_sponsors" && mediaNode}

      {/* ===== EVENT DAY CONTESTS ===== */}
      {isTabVisible("contests") && contests.length > 0 && (
      <section id="contests" className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-2" style={{ color: "#1a1a1a" }}>EVENT DAY CONTESTS</h2>
            <div className="w-16 h-0.5 mx-auto mb-4" style={{ backgroundColor: secondary }} />
            <p className="text-center text-sm mb-10" style={{ color: "#888" }}>Compete for prizes throughout the day</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {contests.map((contest) => (
                <div key={contest.id} className="bg-white rounded-xl border p-5 text-center space-y-2 hover:shadow-md transition-shadow" style={{ borderColor: "#e5e5e5" }}>
                  <span className="text-3xl">{contest.icon}</span>
                  <h3 className="font-display font-bold" style={{ color: "#1a1a1a" }}>{contest.name}</h3>
                  {contest.description && <p className="text-sm" style={{ color: "#666" }}>{contest.description}</p>}
                  {contest.fee_cents > 0 && (
                    <p className="text-xs font-semibold" style={{ color: secondary }}>{formatCents(contest.fee_cents)}</p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
      )}

      {/* ===== EVENT AGENDA ===== */}
      {isTabVisible("schedule") && (tournament.schedule_info || (tournament as any).schedule_info_html) && (
        <section id="schedule" className="py-16" style={{ backgroundColor: "#fafafa" }}>
          <div className="max-w-3xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-2xl font-display font-bold text-center mb-2" style={{ color: "#1a1a1a" }}>SCHEDULE</h2>
              <div className="w-16 h-0.5 mx-auto mb-8" style={{ backgroundColor: secondary }} />
              <div className="bg-white rounded-lg border p-6" style={{ borderColor: "#e5e5e5" }}>
                {(() => {
                  const rawHtml = (tournament as any).schedule_info_html as string | null | undefined;
                  const hasHtmlText = rawHtml && rawHtml.replace(/<[^>]*>/g, "").trim();
                  // If stored HTML still contains raw flyer separators/bullets,
                  // regenerate from the plain-text source so formatting matches
                  // the organizer editor.
                  const looksUnformatted = rawHtml && (/[━─]{3,}/.test(rawHtml) || /•/.test(rawHtml));
                  const html =
                    hasHtmlText && !looksUnformatted
                      ? rawHtml!
                      : autoFormatAgenda(tournament.schedule_info || "");
                  return (
                    <div
                      className="prose prose-sm max-w-none font-body text-sm leading-relaxed [&_p]:my-0 [&_p+p]:mt-5 [&_strong]:font-bold [&_strong]:text-foreground [&_h2]:font-bold [&_h2]:text-lg [&_h2]:mt-0 [&_h2]:mb-2 [&_h3]:font-bold [&_h3]:text-base [&_h3]:mt-0 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_section]:mb-6 [&_section]:pb-6 [&_section]:border-b [&_section]:border-border [&_section:last-child]:border-0 [&_section:last-child]:mb-0 [&_section:last-child]:pb-0"
                      style={{ color: "#444" }}
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
                    />
                  );
                })()}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {mediaPosition === "after_schedule" && mediaNode}


      {/* ===== LOCATION ===== */}
      {(isTabVisible("travel") || isTabVisible("course_details")) && (
      <section id="location" className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl font-display font-bold mb-2" style={{ color: "#1a1a1a" }}>LOCATION</h2>
            <div className="w-16 h-0.5 mx-auto mb-8" style={{ backgroundColor: secondary }} />
            <div className="flex flex-col items-center gap-2">
              <MapPin className="h-6 w-6" style={{ color: primary }} />
              {tournament.course_name && <p className="text-lg font-semibold" style={{ color: "#1a1a1a" }}>{tournament.course_name}</p>}
              <p style={{ color: "#666" }}>{tournament.location || "Location coming soon"}</p>
            </div>
          </motion.div>
        </div>
      </section>
      )}

      {/* ===== LIVE LEADERBOARD ===== */}
      {isTabVisible("leaderboard") && leaderboard.length > 0 && (() => {
        const fmt = getFormatById(tournament.scoring_format || "stroke_play");
        const isStableford = fmt?.scoring === "stableford";
        const isTeam = leaderboard[0]?.isTeam;
         return (
         <section id="leaderboard" className="py-16 bg-white">
           <div className="max-w-3xl mx-auto px-4">
             <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-2xl font-display font-bold text-center mb-2" style={{ color: "#1a1a1a" }}>
                LIVE LEADERBOARD
              </h2>
              <div className="w-16 h-0.5 mx-auto mb-2" style={{ backgroundColor: secondary }} />
              <p className="text-center text-sm mb-1" style={{ color: "#888" }}>
                Par {coursePar} • Updates in real-time
              </p>
              {fmt && fmt.id !== "stroke_play" && (
                <p className="text-center text-xs mb-4 font-semibold" style={{ color: secondary }}>
                  {fmt.name}
                </p>
              )}
              {(() => {
                if (tournament.leaderboard_sponsor_banner_enabled === false) return null;
                const baseLbSponsors = sponsors.filter(s => s.show_on_leaderboard);
                const uploadedLogos = (tournament.leaderboard_rotating_logos || []).map((l, idx) => ({
                  id: `uploaded-${idx}`,
                  name: l.name || "Sponsor",
                  logo_url: l.url,
                  website_url: l.website_url || null,
                  tier: "gold",
                  show_on_leaderboard: true,
                }));
                const lbSponsors = [...uploadedLogos, ...baseLbSponsors];
                const style = tournament.leaderboard_sponsor_style || 'banner';
                const interval = tournament.leaderboard_sponsor_interval_ms || 5000;
                const randomOrder = (tournament.leaderboard_sponsor_rotation_order || 'sequential') === 'random';
                if (lbSponsors.length === 0) return null;
                if (style === 'ticker') {
                  const ordered = randomOrder ? [...lbSponsors].sort(() => Math.random() - 0.5) : lbSponsors;
                  return (
                    <div className="mb-6 overflow-hidden rounded-lg border" style={{ borderColor: "#e5e5e5" }}>
                      <div className="flex animate-marquee items-center gap-8 py-2 px-4 bg-white">
                        {[...ordered, ...ordered].map((s, i) => (
                          <div key={i} className="flex items-center gap-2 shrink-0">
                            {s.logo_url ? (
                              <img src={s.logo_url} alt={s.name} className="h-6 max-w-[80px] object-contain" />
                            ) : (
                              <span className="text-xs font-semibold" style={{ color: primary }}>{s.name}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return <div className="mb-6"><SponsorBanner sponsors={lbSponsors as any} intervalMs={interval} preserveOrder randomOrder={randomOrder} /></div>;
              })()}

              {isStableford && (
                <div className="flex justify-center gap-3 mb-4 text-xs" style={{ color: "#888" }}>
                  <span>Eagle+ = 4pt</span>
                  <span>Birdie = 3pt</span>
                  <span className="font-semibold" style={{ color: "#333" }}>Par = 2pt</span>
                  <span>Bogey = 1pt</span>
                  <span>Double+ = 0pt</span>
                </div>
              )}

              <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e5e5" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: primary + "10", borderBottom: "1px solid #e5e5e5" }}>
                      <th className="text-left px-4 py-3 font-semibold">Pos</th>
                      <th className="text-left px-4 py-3 font-semibold">{isTeam ? "Team" : "Player"}</th>
                      <th className="text-center px-4 py-3 font-semibold">{isStableford ? "Points" : "Score"}</th>
                      {!isStableford && <th className="text-center px-4 py-3 font-semibold">To Par</th>}
                      <th className="text-center px-4 py-3 font-semibold">Thru</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, i) => {
                      const toPar = isStableford ? 0 : entry.total - Math.round((coursePar / 18) * entry.thru);
                      const toParStr = toPar === 0 ? "E" : toPar > 0 ? `+${toPar}` : `${toPar}`;
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                          <td className="px-4 py-3 font-bold" style={{ color: i < 3 ? secondary : "#333" }}>{i + 1}</td>
                          <td className="px-4 py-3" style={{ color: "#333" }}>
                            <span className="font-medium">{entry.name}</span>
                            {entry.isTeam && entry.players && (
                              <span className="block text-xs mt-0.5" style={{ color: "#999" }}>
                                {entry.players.join(", ")}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-bold" style={{ color: isStableford ? primary : "#333" }}>{entry.total}</td>
                          {!isStableford && (
                            <td className="px-4 py-3 text-center" style={{ color: toPar < 0 ? "#dc2626" : toPar > 0 ? "#059669" : "#666" }}>{toParStr}</td>
                          )}
                          <td className="px-4 py-3 text-center" style={{ color: "#888" }}>{entry.thru}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        </section>
        );
      })()}

      {galleryPosition === "after_leaderboard" && galleryNode}
      {mediaPosition === "after_leaderboard" && mediaNode}

      {showRegistrationSection && registrationSection}
      {!sponsorsBeforeRegistration && sponsorsBlock}


      {/* ===== AUCTION & RAFFLE ===== */}
      {isTabVisible("auction") && auctionItems.length > 0 && (
        <section id="auction" className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-2xl font-display font-bold text-center mb-2" style={{ color: "#1a1a1a" }}>AUCTION & RAFFLE</h2>
              <div className="w-16 h-0.5 mx-auto mb-4" style={{ backgroundColor: secondary }} />
              <p className="text-center text-sm mb-10" style={{ color: "#888" }}>Bid on items or enter the raffle</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {auctionItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl border p-5 space-y-3" style={{ borderColor: "#e5e5e5" }}>
                    {item.image_url && <img src={item.image_url} alt={item.title} className="w-full aspect-video object-cover rounded-lg" />}
                    <div className="flex items-center gap-2">
                      {item.type === "auction" ? <Gavel className="h-4 w-4" style={{ color: secondary }} /> : <Ticket className="h-4 w-4" style={{ color: secondary }} />}
                      <h3 className="font-display font-bold" style={{ color: "#1a1a1a" }}>{item.title}</h3>
                    </div>
                    {item.description && <p className="text-sm" style={{ color: "#666" }}>{item.description}</p>}
                    {item.type === "auction" && (
                      <div className="text-sm">
                        <span style={{ color: "#888" }}>Current bid: </span>
                        <span className="font-bold text-lg" style={{ color: primary }}>{formatMoney(Number(item.current_bid))}</span>
                      </div>
                    )}
                    {item.type === "raffle" && item.raffle_ticket_price && (
                      <p className="text-sm"><span style={{ color: "#888" }}>Ticket: </span><span className="font-bold">{formatMoney(Number(item.raffle_ticket_price))}</span></p>
                    )}
                    {item.type === "auction" && (
                      bidForm?.itemId === item.id ? (
                        <div className="space-y-2 pt-2 border-t" style={{ borderColor: "#e5e5e5" }}>
                          <Input placeholder="Your name" value={bidForm.name} onChange={(e) => setBidForm({ ...bidForm, name: e.target.value })} />
                          <Input placeholder="Your email" type="email" value={bidForm.email} onChange={(e) => setBidForm({ ...bidForm, email: e.target.value })} />
                          <Input placeholder="Bid amount" type="number" value={bidForm.amount} onChange={(e) => setBidForm({ ...bidForm, amount: e.target.value })} />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handlePlaceBid} style={{ backgroundColor: primary, color: "white" }}>Place Bid</Button>
                            <Button size="sm" variant="outline" onClick={() => setBidForm(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setBidForm({ itemId: item.id, name: "", email: "", amount: String(Number(item.current_bid) + 5) })}>
                            Place Bid
                          </Button>
                          {item.buy_now_price && Number(item.buy_now_price) > 0 && (
                            <Button
                              size="sm"
                              onClick={() => handleAuctionBuyNow(item.id)}
                              disabled={auctionBuyLoading === item.id}
                              style={{ backgroundColor: secondary, color: primary }}
                            >
                              {auctionBuyLoading === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                              Buy Now ${Number(item.buy_now_price).toFixed(0)}
                            </Button>
                          )}
                        </div>
                      )
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== NEW AUCTIONS & RAFFLES (separate tables, countdown, Stripe checkout) ===== */}
      {isTabVisible("auction") && tournament && (
        <PublicAuctionsRaffles
          tournamentId={tournament.id}
          tournamentSlug={tournament.slug || ""}
          primary={primary}
          secondary={secondary}
          auctionTitle={(tournament as any).auction_tab_title || "Auction"}
          raffleTitle={(tournament as any).raffle_tab_title || "Raffle"}
        />
      )}

      {/* ===== STORE ===== */}
      {products.length > 0 && (
        <section className="py-16" style={{ backgroundColor: "#fafafa" }}>
          <div className="max-w-5xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-2xl font-display font-bold text-center mb-2" style={{ color: "#1a1a1a" }}>{(((tournament as any).store_section_title || "Tournament Store").toString()).toUpperCase()}</h2>
              <div className="w-16 h-0.5 mx-auto mb-4" style={{ backgroundColor: secondary }} />
              <p className="text-center text-sm mb-10" style={{ color: "#888" }}>Support the tournament with merchandise and gear</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-shadow group" style={{ borderColor: "#e5e5e5" }}>
                    {p.image_url ? (
                      <div className="aspect-square bg-gray-50 overflow-hidden">
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    ) : (
                      <div className="aspect-square bg-gray-50 flex items-center justify-center"><Package className="h-12 w-12" style={{ color: "#ddd" }} /></div>
                    )}
                    <div className="p-4">
                      <h3 className="font-display font-bold" style={{ color: "#1a1a1a" }}>{p.name}</h3>
                      <p className="text-lg font-semibold mt-1" style={{ color: primary }}>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(p.price)}</p>
                      {p.description && <p className="text-sm mt-2 line-clamp-2" style={{ color: "#666" }}>{p.description}</p>}
                      {p.price > 0 ? (
                        <button
                          onClick={() => handleStoreBuy(p.id)}
                          disabled={storeBuyLoading === p.id}
                          className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-md text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{ backgroundColor: primary, color: "white" }}
                        >
                          {storeBuyLoading === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingBag className="h-3.5 w-3.5" />}
                          Buy Now
                        </button>
                      ) : p.purchase_url && /^https?:\/\//i.test(p.purchase_url) ? (
                        <a href={p.purchase_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-md text-sm font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: primary, color: "white" }}>
                          Learn More <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== PHOTO GALLERY ===== */}
      {(tournament.gallery_position || "default") === "default" && galleryNode}

      {/* ===== MEDIA CLIPS (default position) ===== */}
      {mediaPosition === "default" && mediaNode}


      {/* ===== VOLUNTEER SIGNUP ===== */}
      {isTabVisible("volunteers") && volunteerRoles.length > 0 && (
        <section id="volunteers" className="py-16" style={{ backgroundColor: "#fafafa" }}>
          <div className="max-w-4xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-2xl font-display font-bold text-center mb-2" style={{ color: "#1a1a1a" }}>VOLUNTEER</h2>
              <div className="w-16 h-0.5 mx-auto mb-4" style={{ backgroundColor: secondary }} />
              <p className="text-center text-sm mb-10" style={{ color: "#888" }}>Sign up to help make this event a success</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {volunteerRoles.map((role) => {
                  const spotsLeft = (role.max_volunteers || 1) - role.filled;
                  return (
                    <div key={role.id} className="bg-white rounded-xl border p-5 space-y-3" style={{ borderColor: "#e5e5e5" }}>
                      <h3 className="font-display font-bold" style={{ color: "#1a1a1a" }}>{role.title}</h3>
                      {role.description && <p className="text-sm" style={{ color: "#666" }}>{role.description}</p>}
                      <div className="flex items-center gap-3 text-sm">
                        {role.time_slot && <span style={{ color: "#888" }}>{role.time_slot}</span>}
                        <span style={{ color: spotsLeft > 0 ? primary : "#dc2626", fontWeight: 500 }}>
                          {spotsLeft > 0 ? `${spotsLeft} spots left` : "Full"}
                        </span>
                      </div>
                      {spotsLeft > 0 && (
                        volForm?.roleId === role.id ? (
                          <div className="space-y-2 pt-2 border-t" style={{ borderColor: "#e5e5e5" }}>
                            <Input placeholder="Your name" value={volForm.name} onChange={(e) => setVolForm({ ...volForm, name: e.target.value })} />
                            <Input placeholder="Email" type="email" value={volForm.email} onChange={(e) => setVolForm({ ...volForm, email: e.target.value })} />
                            <Input placeholder="Phone (optional)" value={volForm.phone} onChange={(e) => setVolForm({ ...volForm, phone: e.target.value })} />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleVolunteerSignup} style={{ backgroundColor: primary, color: "white" }}>Sign Up</Button>
                              <Button size="sm" variant="outline" onClick={() => setVolForm(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setVolForm({ roleId: role.id, name: "", email: "", phone: "" })}>Volunteer</Button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Post-event survey moved to email-only delivery after event ends */}

      {/* ===== EVENT DAY SALES ===== */}
      {eventDaySalesItems.length > 0 && (
        <section id="event-day-sales" className="py-16" style={{ backgroundColor: "#ffffff" }}>
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-display font-bold mb-2" style={{ color: "#1a1a1a" }}>EVENT DAY SALES</h2>
              <div className="w-16 h-0.5 mx-auto mb-3" style={{ backgroundColor: secondary }} />
              <p style={{ color: "#666" }}>Walk-up entries, mulligans, contests, and merchandise available the day of the event.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {eventDaySalesItems.map((i) => {
                const remaining = i.max_quantity != null ? Math.max(0, i.max_quantity - (i.sold_quantity || 0)) : null;
                const soldOut = remaining === 0;
                return (
                  <div key={i.id} className="rounded-xl border p-5 flex flex-col" style={{ borderColor: "#e5e5e5", backgroundColor: "#fafafa" }}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="font-display font-bold text-foreground">{i.item_name}</h3>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{i.category}</span>
                      </div>
                      <span className="text-lg font-bold" style={{ color: primary }}>
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(i.price_cents / 100)}
                      </span>
                    </div>
                    {i.description && <p className="text-sm text-muted-foreground mb-3 whitespace-pre-line">{i.description}</p>}
                    {remaining != null && (
                      <p className={`text-xs mb-2 ${soldOut ? "text-destructive" : "text-muted-foreground"}`}>
                        {soldOut ? "Sold Out" : `${remaining} remaining`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-6">
              See an event volunteer or scan an item QR code at the event to purchase.
            </p>
          </div>
        </section>
      )}

      {/* ===== DONATION ===== */}
      {isTabVisible("donations") && (
      <section id="donation" className="py-16" style={{ backgroundColor: primary }}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            {donated ? (
              <>
                <CheckCircle className="h-16 w-16 mx-auto mb-4 text-white" />
                <h2 className="text-2xl md:text-3xl font-display font-bold mb-2 text-white">THANK YOU!</h2>
                <div className="w-16 h-0.5 mx-auto mb-4" style={{ backgroundColor: secondary }} />
                <p className="text-white/70 max-w-xl mx-auto">
                  Your generous donation has been received. Thank you for supporting our cause!
                </p>
              </>
            ) : (
              <>
                <Heart className="h-10 w-10 mx-auto mb-3 text-white/80" />
                <h2 className="text-2xl md:text-3xl font-display font-bold mb-2 text-white">MAKE A DONATION</h2>
                <div className="w-16 h-0.5 mx-auto mb-4" style={{ backgroundColor: secondary }} />
                <p className="text-white/80 max-w-xl mx-auto mb-8 whitespace-pre-line">
                  {((tournament as any).donations_header_text as string | null)?.trim() ||
                    "Can't make it to the event? You can still support the cause with a charitable donation. Every contribution makes a difference."}
                </p>

                {/* Goal progress bar */}
                {(tournament as any).donation_goal_cents && (
                  <div className="max-w-md mx-auto mb-8">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-white font-bold text-lg">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(donationTotal / 100)}
                      </span>
                      <span className="text-white/60 text-sm">
                        of {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((tournament as any).donation_goal_cents / 100)} goal
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((donationTotal / (tournament as any).donation_goal_cents) * 100, 100)}%`,
                          backgroundColor: secondary,
                        }}
                      />
                    </div>
                    <p className="text-white/50 text-xs mt-2">
                      {donationTotal >= (tournament as any).donation_goal_cents
                        ? "🎉 Goal reached!"
                        : `${Math.round((donationTotal / (tournament as any).donation_goal_cents) * 100)}% of goal`}
                    </p>
                  </div>
                )}

                {/* Preset amounts */}
                <div className="flex flex-wrap justify-center gap-3 mb-6">
                  {[25, 50, 100, 250, 500].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => { setDonationAmount(amt); setCustomDonation(""); }}
                      className="px-6 py-3 rounded-lg text-lg font-bold transition-all"
                      style={{
                        backgroundColor: donationAmount === amt ? secondary : "rgba(255,255,255,0.15)",
                        color: donationAmount === amt ? primary : "#ffffff",
                        border: donationAmount === amt ? "none" : "1px solid rgba(255,255,255,0.3)",
                      }}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>

                {/* Custom amount */}
                <div className="max-w-xs mx-auto mb-6">
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Custom amount"
                      value={customDonation}
                      onChange={(e) => {
                        setCustomDonation(e.target.value);
                        setDonationAmount(null);
                      }}
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/15 border border-white/30 text-white placeholder:text-white/40 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-white/50"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="max-w-xs mx-auto mb-6">
                  <input
                    type="email"
                    placeholder="Your email (optional)"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/15 border border-white/30 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                </div>

                <button
                  disabled={donationLoading || (!donationAmount && !customDonation)}
                  onClick={async () => {
                    const cents = donationAmount
                      ? donationAmount * 100
                      : Math.round(parseFloat(customDonation) * 100);
                    if (!cents || cents < 100) {
                      toast({ title: "Minimum donation is $1.00", variant: "destructive" });
                      return;
                    }
                    setDonationLoading(true);
                    try {
                      const { data, error } = await supabase.functions.invoke("create-donation", {
                        body: {
                          amount_cents: cents,
                          tournament_title: tournament.title,
                          tournament_slug: slug,
                          tournament_id: tournament.id,
                          donor_email: donorEmail || undefined,
                        },
                      });
                      if (error || !data?.url) throw new Error(data?.error || "Failed to create checkout");
                      window.open(data.url, "_blank");
                    } catch (err: any) {
                      toast({ title: "Donation error", description: err.message, variant: "destructive" });
                    } finally {
                      setDonationLoading(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-10 py-3.5 rounded-lg text-lg font-bold transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: secondary, color: primary }}
                >
                  {donationLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Heart className="h-5 w-5" />
                  )}
                  {donationLoading ? "Processing..." : `Donate${donationAmount ? ` $${donationAmount}` : customDonation ? ` $${customDonation}` : ""}`}
                </button>
                {((tournament as any).donations_footer_text as string | null)?.trim() && (
                  <p className="text-white/70 text-sm mt-6 max-w-xl mx-auto whitespace-pre-line">
                    {(tournament as any).donations_footer_text}
                  </p>
                )}
              </>
            )}
          </motion.div>
        </div>
      </section>
      )}

      {galleryPosition === "after_donations" && galleryNode}
      {mediaPosition === "after_donations" && mediaNode}

      {/* ===== ABOUT THE ORGANIZER ===== */}
      {isTabVisible("about_organizer") && (
        <section id="about-organizer" className="py-16" style={{ backgroundColor: "#ffffff" }}>
          <div className="max-w-4xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-2" style={{ color: "#1a1a1a" }}>ABOUT THE ORGANIZER</h2>
              <div className="w-16 h-0.5 mx-auto mb-10" style={{ backgroundColor: secondary }} />

              <div className="space-y-6">
                {(tournament as any).about_us && (
                  <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e5e5" }}>
                    <h3 className="text-lg font-display font-bold mb-3" style={{ color: primary }}>About Us</h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "#333" }}>{(tournament as any).about_us}</p>
                  </div>
                )}
                {(tournament as any).mission_statement && (
                  <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e5e5" }}>
                    <h3 className="text-lg font-display font-bold mb-3" style={{ color: primary }}>Our Mission</h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "#333" }}>{(tournament as any).mission_statement}</p>
                  </div>
                )}
                {(tournament as any).vision_statement && (
                  <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e5e5" }}>
                    <h3 className="text-lg font-display font-bold mb-3" style={{ color: primary }}>Our Vision</h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "#333" }}>{(tournament as any).vision_statement}</p>
                  </div>
                )}
                {(tournament as any).history && (
                  <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e5e5" }}>
                    <h3 className="text-lg font-display font-bold mb-3" style={{ color: primary }}>Our History</h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "#333" }}>{(tournament as any).history}</p>
                  </div>
                )}
                {customOrgSections
                  .filter((s) => (s.title?.trim() || s.content?.trim()))
                  .map((s) => (
                    <div key={s.id} className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e5e5" }}>
                      {s.title?.trim() && (
                        <h3 className="text-lg font-display font-bold mb-3" style={{ color: primary }}>{s.title}</h3>
                      )}
                      {s.content?.trim() && (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "#333" }}>{s.content}</p>
                      )}
                    </div>
                  ))}
                {((tournament as any).contact_name || (tournament as any).org_contact_email || (tournament as any).org_contact_phone || (tournament as any).org_address) && (
                  <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e5e5" }}>
                    <h3 className="text-lg font-display font-bold mb-3" style={{ color: primary }}>Contact</h3>
                    <div className="space-y-2 text-sm" style={{ color: "#333" }}>
                      {(tournament as any).contact_name && (
                        <div className="font-semibold" style={{ color: "#1a1a1a" }}>{(tournament as any).contact_name}</div>
                      )}
                      {(tournament as any).org_contact_email && (
                        <div>Email: <a href={`mailto:${(tournament as any).org_contact_email}`} className="underline" style={{ color: primary }}>{(tournament as any).org_contact_email}</a></div>
                      )}
                      {(tournament as any).org_contact_phone && (
                        <div>Phone: <a href={`tel:${(tournament as any).org_contact_phone}`} className="underline" style={{ color: primary }}>{(tournament as any).org_contact_phone}</a></div>
                      )}
                      {(tournament as any).org_address && (
                        <div>Address: {(tournament as any).org_address}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== LODGING ===== */}
      {isTabVisible("lodging") && (
        <section id="lodging" className="py-16" style={{ backgroundColor: "#fafafa" }}>
          <div className="max-w-4xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-2" style={{ color: "#1a1a1a" }}>LODGING ACCOMMODATIONS</h2>
              <div className="w-16 h-0.5 mx-auto mb-10" style={{ backgroundColor: secondary }} />
              <div className="space-y-6">
                {accommodations.map((h) => {
                  const rooms = (h.accommodation_room_types || []).slice().sort((a, b) => a.display_order - b.display_order);
                  const fields = (h.accommodation_custom_fields || []).slice().sort((a, b) => a.display_order - b.display_order);
                  return (
                    <div key={h.id} className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e5e5" }}>
                      <h3 className="text-xl font-display font-bold mb-2" style={{ color: primary }}>{h.hotel_name}</h3>
                      {h.address && <div className="text-sm text-muted-foreground mb-1">{h.address}</div>}
                      <div className="text-sm mb-4 flex flex-wrap gap-x-4 gap-y-1" style={{ color: "#333" }}>
                        {h.phone && <span>📞 <a href={`tel:${h.phone}`} className="underline">{h.phone}</a></span>}
                        {h.website_url && <span>🌐 <a href={h.website_url} target="_blank" rel="noopener noreferrer" className="underline">Website</a></span>}
                      </div>
                      {rooms.length > 0 && (
                        <div className="mb-3">
                          <div className="text-sm font-semibold mb-1" style={{ color: "#1a1a1a" }}>Room Rates:</div>
                          <ul className="text-sm list-disc pl-5 space-y-0.5" style={{ color: "#333" }}>
                            {rooms.map((r) => (
                              <li key={r.id}>
                                {r.room_type}
                                {r.rate_cents != null && `: ${formatCents(r.rate_cents)}`}
                                {r.rate_note ? ` ${r.rate_note}` : (r.rate_cents != null ? " / night" : "")}
                                {r.max_occupancy ? ` (sleeps ${r.max_occupancy})` : ""}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {(h.group_code || h.booking_deadline) && (
                        <div className="text-sm mb-3 space-y-0.5" style={{ color: "#333" }}>
                          {h.group_code && <div><span className="font-semibold">Group Code:</span> {h.group_code}</div>}
                          {h.booking_deadline && <div><span className="font-semibold">Booking Deadline:</span> {new Date(h.booking_deadline).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</div>}
                        </div>
                      )}
                      {h.notes && (
                        <div className="text-sm mb-3 whitespace-pre-wrap" style={{ color: "#333" }}>{h.notes}</div>
                      )}
                      {fields.length > 0 && (
                        <div className="text-sm space-y-0.5 pt-3 border-t" style={{ color: "#333", borderColor: "#eee" }}>
                          {fields.map((f) => (
                            <div key={f.id}><span className="font-semibold">{f.field_name}:</span> {f.field_value}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {mediaPosition === "after_lodging" && mediaNode}

      {galleryPosition === "bottom" && galleryNode}
      {mediaPosition === "bottom" && mediaNode}

      {/* ===== CONTACT US ===== */}
      <section id="contact" className="py-16" style={{ backgroundColor: "#fafafa" }}>
        <div className="max-w-3xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-2" style={{ color: "#1a1a1a" }}>CONTACT US</h2>
            <div className="w-16 h-0.5 mx-auto mb-4" style={{ backgroundColor: secondary }} />
            <p className="text-center text-sm mb-10" style={{ color: "#888" }}>Have questions? We'd love to hear from you.</p>
            <div className="bg-white rounded-xl border p-8 space-y-6" style={{ borderColor: "#e5e5e5" }}>
              {(tournament as any).contact_name && (
                <p className="text-center text-base font-semibold" style={{ color: "#1a1a1a" }}>
                  {(tournament as any).contact_name}
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-8 mb-4">
                {tournament.contact_email && (
                  <a href={`mailto:${tournament.contact_email}`} className="inline-flex items-center gap-3 transition-colors hover:opacity-80" style={{ color: "#333" }}>
                    <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: primary }}>
                      <Mail className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-medium">{tournament.contact_email}</span>
                  </a>
                )}
                {tournament.contact_phone && (
                  <a href={`tel:${tournament.contact_phone}`} className="inline-flex items-center gap-3 transition-colors hover:opacity-80" style={{ color: "#333" }}>
                    <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: primary }}>
                      <Phone className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-medium">{tournament.contact_phone}</span>
                  </a>
                )}
              </div>
              {tournament.location && (
                <div className="flex items-center justify-center gap-3" style={{ color: "#555" }}>
                  <MapPin className="h-5 w-5" style={{ color: primary }} />
                  <span className="text-sm">{tournament.course_name ? `${tournament.course_name} — ` : ""}{tournament.location}</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <TeeventsFooter tournament={tournament as any} />
    </div>
  );
};

export default PublicTournament;
