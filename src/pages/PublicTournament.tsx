import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Calendar, Clock, Mail, Phone, ExternalLink, Loader2, UserPlus, Award, ShoppingBag, Package, Trophy, Gavel, Ticket, ImageIcon, Users, ClipboardList, Star, Send, Menu, X, Facebook, Instagram, ChevronLeft, ChevronRight, Heart, DollarSign, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import RegistrationForm from "@/components/RegistrationForm";
import RefundRequestForm from "@/components/RefundRequestForm";
import { toast } from "@/hooks/use-toast";
import { SponsorBanner } from "@/components/SponsorBanner";
import { getFormatById, stablefordPoints } from "@/lib/scoringFormats";

interface PublicSponsor {
  id: string; name: string; tier: string; logo_url: string | null; website_url: string | null; show_on_leaderboard: boolean;
}
interface PublicProduct {
  id: string; name: string; description: string | null; price: number; image_url: string | null; category: string; purchase_url: string | null;
}
interface TournamentSite {
  id: string; title: string; slug: string | null; description: string | null; date: string | null;
  location: string | null; course_name: string | null; site_logo_url: string | null;
  site_hero_title: string | null; site_hero_subtitle: string | null; site_primary_color: string | null;
  site_secondary_color: string | null; site_hero_image_url: string | null; contact_email: string | null;
  contact_phone: string | null; schedule_info: string | null; registration_url: string | null;
  registration_open: boolean | null; course_par: number | null; template: string | null;
  donation_goal_cents: number | null; registration_fee_cents: number | null;
  leaderboard_sponsor_interval_ms: number; leaderboard_sponsor_style: string;
  scoring_format: string; countdown_style: string | null;
  foursome_registration: boolean;
  pass_fees_to_registrants?: boolean;
  refund_policy_text?: string | null;
}

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
  const donated = searchParams.get("donated") === "true";
  const registered = searchParams.get("registered") === "true";
  const sessionId = searchParams.get("session_id");
  const [tournament, setTournament] = useState<TournamentSite | null>(null);
  const [sponsors, setSponsors] = useState<PublicSponsor[]>([]);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [auctionItems, setAuctionItems] = useState<AuctionItem[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [volunteerRoles, setVolunteerRoles] = useState<VolunteerRole[]>([]);
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [nonprofitInfo, setNonprofitInfo] = useState<{ isNonprofit: boolean; nonprofitName?: string; ein?: string; platformFeeRate?: number }>({ isNonprofit: false });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sponsorIndex, setSponsorIndex] = useState(0);

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

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("tournaments")
      .select("*")
      .eq("slug", slug)
      .eq("site_published", true)
      .single()
      .then(async ({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return; }
        const t = data as unknown as TournamentSite;
        setTournament(t);

        // Fetch nonprofit status for the org
        supabase.functions.invoke("get-nonprofit-status", { body: { tournament_id: t.id } })
          .then(({ data: npData }) => {
            if (npData?.is_nonprofit) {
              setNonprofitInfo({
                isNonprofit: true,
                nonprofitName: npData.nonprofit_name || undefined,
                ein: npData.ein || undefined,
                platformFeeRate: npData.platform_fee_rate ?? 0.05,
              });
            }
          })
          .catch(() => {});

        const [sponsorRes, productRes, scoresRes, auctionRes, photoRes, roleRes, surveyRes] = await Promise.all([
          supabase.from("tournament_sponsors").select("id, name, tier, logo_url, website_url, show_on_leaderboard").eq("tournament_id", t.id).order("sort_order"),
          supabase.from("tournament_store_products").select("id, name, description, price, image_url, category, purchase_url").eq("tournament_id", t.id).eq("is_active", true).order("sort_order"),
          supabase.from("tournament_scores").select("registration_id, hole_number, strokes, tournament_registrations(first_name, last_name, group_number)").eq("tournament_id", t.id),
          supabase.from("tournament_auction_items").select("*").eq("tournament_id", t.id).eq("is_active", true).order("sort_order"),
          supabase.from("tournament_photos").select("id, image_url, caption").eq("tournament_id", t.id).order("sort_order"),
          supabase.from("tournament_volunteer_roles").select("*, tournament_volunteers(id)").eq("tournament_id", t.id).order("sort_order"),
          supabase.from("tournament_surveys").select("id, tournament_survey_questions(id, question, type, sort_order)").eq("tournament_id", t.id).eq("is_active", true).limit(1).single(),
        ]);

        setSponsors((sponsorRes.data as PublicSponsor[]) || []);
        setProducts((productRes.data as PublicProduct[]) || []);
        setAuctionItems((auctionRes.data as AuctionItem[]) || []);
        setPhotos((photoRes.data as Photo[]) || []);

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

  // Fetch donation totals for goal progress
  useEffect(() => {
    if (!tournament) return;
    supabase
      .from("tournament_donations")
      .select("amount_cents")
      .eq("tournament_id", tournament.id)
      .eq("status", "completed")
      .then(({ data }) => {
        const total = (data || []).reduce((sum: number, d: any) => sum + d.amount_cents, 0);
        setDonationTotal(total);
      });
  }, [tournament, donated]);

  // Verify donation on return from Stripe
  useEffect(() => {
    if (donated && sessionId) {
      supabase.functions.invoke("verify-donation", {
        body: { session_id: sessionId },
      });
    }
  }, [donated, sessionId]);

  // Verify registration payment on return from Stripe
  useEffect(() => {
    if (registered && sessionId) {
      supabase.functions.invoke("verify-registration", {
        body: { session_id: sessionId },
      });
    }
  }, [registered, sessionId]);

  // Event countdown timer
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
    const { data } = await supabase.from("tournament_auction_items").select("*").eq("tournament_id", tournament!.id).eq("is_active", true).order("sort_order");
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
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold text-foreground mb-4">Tournament Not Found</h1>
          <p className="text-muted-foreground">This tournament page doesn't exist or hasn't been published yet.</p>
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

  // Fixed nav tabs
  const navLinks: { label: string; href: string }[] = [
    { label: "Home", href: "#top" },
    { label: "Event Day Contests", href: "#contests" },
    { label: "Registration", href: "#register" },
    { label: "Photos", href: "#photos" },
    { label: "Location", href: "#location" },
    { label: "Event Agenda", href: "#schedule" },
    { label: "Donation", href: "#donation" },
    { label: "Contact Us", href: "#contact" },
  ];

  const scrollTo = (href: string) => {
    setMobileNavOpen(false);
    if (href === "#top") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // Sponsor carousel
  const sponsorsPerPage = 3;
  const sponsorPages = Math.ceil(sponsors.length / sponsorsPerPage);
  const visibleSponsors = sponsors.slice(sponsorIndex * sponsorsPerPage, (sponsorIndex + 1) * sponsorsPerPage);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#ffffff" }} id="top">
      {/* ===== REGISTRATION CONFIRMATION BANNER (top of page) ===== */}
      {registered && (
        <div className="fixed top-14 left-0 right-0 z-40">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl mx-auto m-4"
          >
            <div className="bg-white rounded-xl border-2 p-8 shadow-2xl text-center" style={{ borderColor: `${secondary}40` }}>
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
          {/* Logo in nav for modern template */}
          {tpl === "modern" && tournament.site_logo_url && (
            <img src={tournament.site_logo_url} alt="" className="h-10 w-auto object-contain mr-6" />
          )}

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
        className="relative min-h-screen flex flex-col items-center justify-center pt-14"
        style={{
          backgroundImage: tournament.site_hero_image_url
            ? `url(${tournament.site_hero_image_url})`
            : undefined,
          backgroundColor: primary,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
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
          {tournament.site_logo_url && tpl !== "modern" && (
            <img
              src={tournament.site_logo_url}
              alt={heroTitle}
              className={`object-contain mb-6 ${tpl === "charity" ? "h-20 w-20" : "h-28 w-auto max-w-xs"}`}
            />
          )}

          {/* Title */}
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight"
            style={{ color: "#ffffff", textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}
          >
            {heroTitle}
          </h1>

          {/* Subtitle */}
          {tournament.site_hero_subtitle && (
            <p className="mt-4 text-lg md:text-xl max-w-2xl" style={{ color: "rgba(255,255,255,0.8)" }}>
              {tournament.site_hero_subtitle}
            </p>
          )}

          {/* Event meta badges */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {tournament.date && (
              <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
                <Calendar className="h-4 w-4" />
                {new Date(tournament.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
            )}
            {tournament.course_name && (
              <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
                ⛳ {tournament.course_name}
              </span>
            )}
            {tournament.location && (
              <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
                <MapPin className="h-4 w-4" />{tournament.location}
              </span>
            )}
          </div>

          {/* Countdown Timer */}
          {countdown && !countdown.passed && (() => {
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
          <div className={`flex ${style.ctaLayout === "two" ? "justify-center gap-0" : "justify-center gap-0"}`}>
            {/* Registration button */}
            {(tournament.registration_open || tournament.registration_url) && (
              <a
                href={tournament.registration_url || "#register"}
                onClick={(e) => {
                  if (!tournament.registration_url) { e.preventDefault(); scrollTo("#register"); }
                }}
                target={tournament.registration_url ? "_blank" : undefined}
                rel={tournament.registration_url ? "noopener noreferrer" : undefined}
                className="flex-1 max-w-[260px] py-4 text-center font-bold text-sm tracking-wider uppercase transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: tpl === "modern" ? "#1565c0" : secondary,
                  color: tpl === "modern" ? "#ffffff" : primary,
                }}
              >
                {tpl === "charity" ? "Golf & Sponsor Registration" : "Registration"}
              </a>
            )}

            {/* Sponsors button */}
            {sponsors.length > 0 && style.ctaLayout === "three" && (
              <button
                onClick={() => scrollTo("#sponsors")}
                className="flex-1 max-w-[260px] py-4 text-center font-bold text-sm tracking-wider uppercase transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: tpl === "modern" ? "#b71c1c" : primary,
                  color: "#ffffff",
                }}
              >
                Sponsorship Opportunities
              </button>
            )}

            {/* Auction button */}
            {auctionItems.length > 0 && (
              <button
                onClick={() => scrollTo("#auction")}
                className="flex-1 max-w-[260px] py-4 text-center font-bold text-sm tracking-wider uppercase transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: tpl === "modern" ? "#424242" : tpl === "charity" ? "#1a1a1a" : "#333333",
                  color: "#ffffff",
                }}
              >
                View Auction Items
              </button>
            )}
          </div>
        </motion.div>
      </section>

      {/* ===== SPONSORS CAROUSEL ===== */}
      {sponsors.length > 0 && (
        <section id="sponsors" className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-2" style={{ color: "#1a1a1a" }}>
              SPONSORS
            </h2>
            <div className="w-16 h-0.5 mx-auto mb-10" style={{ backgroundColor: secondary }} />

            <div className="relative flex items-center justify-center gap-8">
              {sponsorPages > 1 && (
                <button
                  onClick={() => setSponsorIndex((prev) => (prev - 1 + sponsorPages) % sponsorPages)}
                  className="absolute left-0 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6 text-gray-400" />
                </button>
              )}

              <div className="flex items-center justify-center gap-12 min-h-[100px]">
                {visibleSponsors.map((s) => (
                  <div key={s.id} className="flex flex-col items-center">
                    {s.website_url ? (
                      <a href={s.website_url} target="_blank" rel="noopener noreferrer" className="group">
                        {s.logo_url ? (
                          <img src={s.logo_url} alt={s.name} className="h-20 w-auto max-w-[180px] object-contain group-hover:scale-105 transition-transform" />
                        ) : (
                          <span className="text-lg font-bold text-gray-700 group-hover:text-gray-900 transition-colors">{s.name}</span>
                        )}
                      </a>
                    ) : s.logo_url ? (
                      <img src={s.logo_url} alt={s.name} className="h-20 w-auto max-w-[180px] object-contain" />
                    ) : (
                      <span className="text-lg font-bold text-gray-700">{s.name}</span>
                    )}
                    {s.tier === "presenting" && (
                      <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-2">
                        Thanks to Our Presenting Sponsor
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {sponsorPages > 1 && (
                <button
                  onClick={() => setSponsorIndex((prev) => (prev + 1) % sponsorPages)}
                  className="absolute right-0 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="h-6 w-6 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===== ABOUT ===== */}
      {tournament.description && (
        <section id="about" className="py-16" style={{ backgroundColor: "#fafafa" }}>
          <div className="max-w-3xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              {tournament.site_logo_url && (
                <img src={tournament.site_logo_url} alt="" className="h-16 w-16 mx-auto mb-6 object-contain" />
              )}
              <p className="text-base md:text-lg leading-relaxed whitespace-pre-wrap" style={{ color: "#333" }}>
                {tournament.description}
              </p>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== EVENT DAY CONTESTS ===== */}
      <section id="contests" className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-2" style={{ color: "#1a1a1a" }}>EVENT DAY CONTESTS</h2>
            <div className="w-16 h-0.5 mx-auto mb-4" style={{ backgroundColor: secondary }} />
            <p className="text-center text-sm mb-10" style={{ color: "#888" }}>Compete for prizes throughout the day</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: "🏌️", title: "Longest Drive", desc: "Hit it the farthest on the designated hole to win a prize." },
                { icon: "🎯", title: "Closest to the Pin", desc: "Land your tee shot closest to the pin on the par 3." },
                { icon: "🕳️", title: "Hole-in-One", desc: "Make a hole-in-one on a designated hole for a major prize." },
                { icon: "🏆", title: "Putting Contest", desc: "Test your putting skills on the practice green before tee-off." },
                { icon: "💰", title: "Mulligan Package", desc: "Purchase mulligans to improve your score during the round." },
                { icon: "🎲", title: "50/50 Raffle", desc: "Buy tickets for a chance to win half the pot." },
              ].map((contest, i) => (
                <div key={i} className="bg-white rounded-xl border p-5 text-center space-y-2 hover:shadow-md transition-shadow" style={{ borderColor: "#e5e5e5" }}>
                  <span className="text-3xl">{contest.icon}</span>
                  <h3 className="font-display font-bold" style={{ color: "#1a1a1a" }}>{contest.title}</h3>
                  <p className="text-sm" style={{ color: "#666" }}>{contest.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== EVENT AGENDA ===== */}
      {tournament.schedule_info && (
        <section id="schedule" className="py-16" style={{ backgroundColor: "#fafafa" }}>
          <div className="max-w-3xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-2xl font-display font-bold text-center mb-2" style={{ color: "#1a1a1a" }}>EVENT AGENDA</h2>
              <div className="w-16 h-0.5 mx-auto mb-8" style={{ backgroundColor: secondary }} />
              <div className="bg-white rounded-lg border p-6" style={{ borderColor: "#e5e5e5" }}>
                <pre className="whitespace-pre-wrap font-body text-base leading-relaxed" style={{ color: "#444" }}>
                  {tournament.schedule_info}
                </pre>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== LOCATION ===== */}
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

      {/* ===== LIVE LEADERBOARD ===== */}
      {leaderboard.length > 0 && (() => {
        const fmt = getFormatById(tournament.scoring_format || "stroke_play");
        const isStableford = fmt?.scoring === "stableford";
        const isTeam = leaderboard[0]?.isTeam;
        return (
        <section className="py-16 bg-white">
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
                const lbSponsors = sponsors.filter(s => s.show_on_leaderboard);
                const style = tournament.leaderboard_sponsor_style || 'banner';
                const interval = tournament.leaderboard_sponsor_interval_ms || 5000;
                if (lbSponsors.length === 0) return null;
                if (style === 'ticker') {
                  return (
                    <div className="mb-6 overflow-hidden rounded-lg border" style={{ borderColor: "#e5e5e5" }}>
                      <div className="flex animate-marquee items-center gap-8 py-2 px-4 bg-white">
                        {[...lbSponsors, ...lbSponsors].map((s, i) => (
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
                return <div className="mb-6"><SponsorBanner sponsors={lbSponsors} intervalMs={interval} /></div>;
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

      {/* ===== REGISTRATION ===== */}
      {tournament.registration_open && !tournament.registration_url && (
        <section id="register" className="py-16" style={{ backgroundColor: "#fafafa" }}>
          <div className="max-w-xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-display font-bold mb-2" style={{ color: "#1a1a1a" }}>REGISTRATION</h2>
                <div className="w-16 h-0.5 mx-auto mb-4" style={{ backgroundColor: secondary }} />
                <p style={{ color: "#666" }}>
                  {tournament.foursome_registration
                    ? "Register your foursome below to secure your spots."
                    : "Fill out the form below to secure your spot."}
                </p>
              </div>
              {registered ? (
                <div className="bg-white rounded-xl border p-8 shadow-sm text-center" style={{ borderColor: "#e5e5e5" }}>
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
                    registrationFeeCents={tournament.registration_fee_cents || 0}
                    foursomeMode={tournament.foursome_registration}
                    isNonprofit={nonprofitInfo.isNonprofit}
                    nonprofitName={nonprofitInfo.nonprofitName}
                    ein={nonprofitInfo.ein}
                    platformFeeRate={nonprofitInfo.platformFeeRate}
                    passFeesToRegistrants={tournament.pass_fees_to_registrants || false}
                  />
                </div>
              )}
            </motion.div>
          </div>
        </section>
      )}

      {/* External Registration CTA */}
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

      {/* ===== AUCTION & RAFFLE ===== */}
      {auctionItems.length > 0 && (
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
                        <span className="font-bold text-lg" style={{ color: primary }}>${Number(item.current_bid).toFixed(2)}</span>
                      </div>
                    )}
                    {item.type === "raffle" && item.raffle_ticket_price && (
                      <p className="text-sm"><span style={{ color: "#888" }}>Ticket: </span><span className="font-bold">${Number(item.raffle_ticket_price).toFixed(2)}</span></p>
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

      {/* ===== STORE ===== */}
      {products.length > 0 && (
        <section className="py-16" style={{ backgroundColor: "#fafafa" }}>
          <div className="max-w-5xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-2xl font-display font-bold text-center mb-2" style={{ color: "#1a1a1a" }}>TOURNAMENT STORE</h2>
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
                      {p.purchase_url ? (
                        <a href={p.purchase_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-md text-sm font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: primary, color: "white" }}>
                          Buy Now <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : p.price > 0 && (
                        <button
                          onClick={() => handleStoreBuy(p.id)}
                          disabled={storeBuyLoading === p.id}
                          className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-md text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{ backgroundColor: primary, color: "white" }}
                        >
                          {storeBuyLoading === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingBag className="h-3.5 w-3.5" />}
                          Buy Now
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== PHOTO GALLERY ===== */}
      {photos.length > 0 && (
        <section id="photos" className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-2xl font-display font-bold text-center mb-2" style={{ color: "#1a1a1a" }}>PHOTOS</h2>
              <div className="w-16 h-0.5 mx-auto mb-10" style={{ backgroundColor: secondary }} />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {photos.map((photo) => (
                  <div key={photo.id} className="rounded-lg overflow-hidden border" style={{ borderColor: "#e5e5e5" }}>
                    <img src={photo.image_url} alt={photo.caption || ""} className="w-full aspect-square object-cover hover:scale-105 transition-transform duration-300" />
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== VOLUNTEER SIGNUP ===== */}
      {volunteerRoles.length > 0 && (
        <section className="py-16" style={{ backgroundColor: "#fafafa" }}>
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

      {/* ===== POST-EVENT SURVEY ===== */}
      {surveyQuestions.length > 0 && !surveySubmitted && (
        <section className="py-16 bg-white">
          <div className="max-w-xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-2xl font-display font-bold text-center mb-2" style={{ color: "#1a1a1a" }}>POST-EVENT SURVEY</h2>
              <div className="w-16 h-0.5 mx-auto mb-4" style={{ backgroundColor: secondary }} />
              <p className="text-center text-sm mb-8" style={{ color: "#888" }}>We'd love your feedback</p>
              <div className="bg-white rounded-xl border p-6 space-y-5" style={{ borderColor: "#e5e5e5" }}>
                <div>
                  <Label>Your Email</Label>
                  <Input type="email" value={surveyEmail} onChange={(e) => setSurveyEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                {surveyQuestions.map((q) => (
                  <div key={q.id} className="space-y-2">
                    <Label>{q.question}</Label>
                    {q.type === "rating" ? (
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            onClick={() => setSurveyAnswers({ ...surveyAnswers, [q.id]: String(n) })}
                            className="p-2 rounded-md border transition-colors"
                            style={{
                              backgroundColor: surveyAnswers[q.id] === String(n) ? secondary : undefined,
                              color: surveyAnswers[q.id] === String(n) ? primary : undefined,
                              borderColor: surveyAnswers[q.id] === String(n) ? secondary : "#e5e5e5",
                            }}
                          >
                            <Star className={`h-5 w-5 ${surveyAnswers[q.id] && parseInt(surveyAnswers[q.id]) >= n ? "fill-current" : ""}`} />
                          </button>
                        ))}
                      </div>
                    ) : q.type === "yes_no" ? (
                      <div className="flex gap-3">
                        {["Yes", "No"].map((opt) => (
                          <Button key={opt} size="sm" variant={surveyAnswers[q.id] === opt ? "default" : "outline"} onClick={() => setSurveyAnswers({ ...surveyAnswers, [q.id]: opt })}>{opt}</Button>
                        ))}
                      </div>
                    ) : (
                      <Textarea value={surveyAnswers[q.id] || ""} onChange={(e) => setSurveyAnswers({ ...surveyAnswers, [q.id]: e.target.value })} rows={2} placeholder="Your answer..." />
                    )}
                  </div>
                ))}
                <Button onClick={handleSurveySubmit} disabled={!surveyEmail} className="w-full" style={{ backgroundColor: primary, color: "white" }}>
                  <Send className="mr-2 h-4 w-4" /> Submit Feedback
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== DONATION ===== */}
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
                <p className="text-white/70 max-w-xl mx-auto mb-8">
                  Can't make it to the event? You can still support the cause with a charitable donation. Every contribution makes a difference.
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
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* ===== CONTACT US ===== */}
      <section id="contact" className="py-16" style={{ backgroundColor: "#fafafa" }}>
        <div className="max-w-3xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-2" style={{ color: "#1a1a1a" }}>CONTACT US</h2>
            <div className="w-16 h-0.5 mx-auto mb-4" style={{ backgroundColor: secondary }} />
            <p className="text-center text-sm mb-10" style={{ color: "#888" }}>Have questions? We'd love to hear from you.</p>
            <div className="bg-white rounded-xl border p-8 space-y-6" style={{ borderColor: "#e5e5e5" }}>
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

      <footer className="py-4 text-center" style={{ borderTop: "1px solid #e5e5e5" }}>
        <p className="text-xs" style={{ color: "#aaa" }}>
          Powered by <span className="font-semibold" style={{ color: primary }}>TeeVents</span>
        </p>
      </footer>
    </div>
  );
};

export default PublicTournament;
