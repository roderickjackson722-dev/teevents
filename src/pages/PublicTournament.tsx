import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Calendar, Clock, Mail, Phone, ExternalLink, Loader2, UserPlus, Award, ShoppingBag, Package, Trophy, Gavel, Ticket, ImageIcon, Users, ClipboardList, Star, Send, Menu, X, Facebook, Instagram, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import RegistrationForm from "@/components/RegistrationForm";
import { toast } from "@/hooks/use-toast";

interface PublicSponsor {
  id: string; name: string; tier: string; logo_url: string | null; website_url: string | null;
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
}

interface LeaderboardEntry { name: string; total: number; thru: number; }
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

const PublicTournament = () => {
  const { slug } = useParams<{ slug: string }>();
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sponsorIndex, setSponsorIndex] = useState(0);

  // Forms
  const [bidForm, setBidForm] = useState<{ itemId: string; name: string; email: string; amount: string } | null>(null);
  const [volForm, setVolForm] = useState<{ roleId: string; name: string; email: string; phone: string } | null>(null);
  const [surveyEmail, setSurveyEmail] = useState("");
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string>>({});
  const [surveySubmitted, setSurveySubmitted] = useState(false);

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

        const [sponsorRes, productRes, scoresRes, auctionRes, photoRes, roleRes, surveyRes] = await Promise.all([
          supabase.from("tournament_sponsors").select("id, name, tier, logo_url, website_url").eq("tournament_id", t.id).order("sort_order"),
          supabase.from("tournament_store_products").select("id, name, description, price, image_url, category, purchase_url").eq("tournament_id", t.id).eq("is_active", true).order("sort_order"),
          supabase.from("tournament_scores").select("registration_id, hole_number, strokes, tournament_registrations(first_name, last_name)").eq("tournament_id", t.id),
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
          const playerScores: Record<string, { name: string; total: number; holes: number }> = {};
          (scoresRes.data as any[]).forEach((s) => {
            const key = s.registration_id;
            if (!playerScores[key]) {
              const reg = s.tournament_registrations;
              playerScores[key] = { name: reg ? `${reg.first_name} ${reg.last_name}` : "Unknown", total: 0, holes: 0 };
            }
            playerScores[key].total += s.strokes;
            playerScores[key].holes += 1;
          });
          const lb = Object.values(playerScores).sort((a, b) => a.total - b.total);
          setLeaderboard(lb.map((p) => ({ name: p.name, total: p.total, thru: p.holes })));
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
        supabase.from("tournament_scores").select("registration_id, hole_number, strokes, tournament_registrations(first_name, last_name)").eq("tournament_id", tournament.id).then(({ data }) => {
          if (!data) return;
          const playerScores: Record<string, { name: string; total: number; holes: number }> = {};
          (data as any[]).forEach((s) => {
            const key = s.registration_id;
            if (!playerScores[key]) {
              const reg = s.tournament_registrations;
              playerScores[key] = { name: reg ? `${reg.first_name} ${reg.last_name}` : "Unknown", total: 0, holes: 0 };
            }
            playerScores[key].total += s.strokes;
            playerScores[key].holes += 1;
          });
          const lb = Object.values(playerScores).sort((a, b) => a.total - b.total);
          setLeaderboard(lb.map((p) => ({ name: p.name, total: p.total, thru: p.holes })));
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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

  // Build nav links dynamically based on available content
  const navLinks: { label: string; href: string }[] = [
    { label: "Home", href: "#top" },
  ];
  if (tournament.description) navLinks.push({ label: "About", href: "#about" });
  if (tournament.schedule_info) navLinks.push({ label: "Event Agenda", href: "#schedule" });
  if (tournament.registration_open || tournament.registration_url) navLinks.push({ label: "Registration", href: "#register" });
  if (photos.length > 0) navLinks.push({ label: "Photos", href: "#photos" });
  if (tournament.location) navLinks.push({ label: "Location", href: "#location" });
  if (auctionItems.length > 0) navLinks.push({ label: "Auction", href: "#auction" });

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

      {/* ===== SCHEDULE ===== */}
      {tournament.schedule_info && (
        <section id="schedule" className="py-16 bg-white">
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
      {tournament.location && (
        <section id="location" className="py-16" style={{ backgroundColor: "#fafafa" }}>
          <div className="max-w-3xl mx-auto px-4 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-2xl font-display font-bold mb-2" style={{ color: "#1a1a1a" }}>LOCATION</h2>
              <div className="w-16 h-0.5 mx-auto mb-8" style={{ backgroundColor: secondary }} />
              <div className="flex flex-col items-center gap-2">
                <MapPin className="h-6 w-6" style={{ color: primary }} />
                {tournament.course_name && <p className="text-lg font-semibold" style={{ color: "#1a1a1a" }}>{tournament.course_name}</p>}
                <p style={{ color: "#666" }}>{tournament.location}</p>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== LIVE LEADERBOARD ===== */}
      {leaderboard.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-3xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-2xl font-display font-bold text-center mb-2" style={{ color: "#1a1a1a" }}>
                LIVE LEADERBOARD
              </h2>
              <div className="w-16 h-0.5 mx-auto mb-2" style={{ backgroundColor: secondary }} />
              <p className="text-center text-sm mb-8" style={{ color: "#888" }}>Par {coursePar} • Updates in real-time</p>
              <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e5e5" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: primary + "10", borderBottom: "1px solid #e5e5e5" }}>
                      <th className="text-left px-4 py-3 font-semibold">Pos</th>
                      <th className="text-left px-4 py-3 font-semibold">Player</th>
                      <th className="text-center px-4 py-3 font-semibold">Score</th>
                      <th className="text-center px-4 py-3 font-semibold">To Par</th>
                      <th className="text-center px-4 py-3 font-semibold">Thru</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, i) => {
                      const toPar = entry.total - Math.round((coursePar / 18) * entry.thru);
                      const toParStr = toPar === 0 ? "E" : toPar > 0 ? `+${toPar}` : `${toPar}`;
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                          <td className="px-4 py-3 font-bold" style={{ color: i < 3 ? secondary : "#333" }}>{i + 1}</td>
                          <td className="px-4 py-3 font-medium" style={{ color: "#333" }}>{entry.name}</td>
                          <td className="px-4 py-3 text-center font-bold" style={{ color: "#333" }}>{entry.total}</td>
                          <td className="px-4 py-3 text-center" style={{ color: toPar < 0 ? "#dc2626" : toPar > 0 ? "#059669" : "#666" }}>{toParStr}</td>
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
      )}

      {/* ===== REGISTRATION ===== */}
      {tournament.registration_open && !tournament.registration_url && (
        <section id="register" className="py-16" style={{ backgroundColor: "#fafafa" }}>
          <div className="max-w-xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-display font-bold mb-2" style={{ color: "#1a1a1a" }}>REGISTRATION</h2>
                <div className="w-16 h-0.5 mx-auto mb-4" style={{ backgroundColor: secondary }} />
                <p style={{ color: "#666" }}>Fill out the form below to secure your spot.</p>
              </div>
              <div className="bg-white rounded-xl border p-6 shadow-sm" style={{ borderColor: "#e5e5e5" }}>
                <RegistrationForm tournamentId={tournament.id} primaryColor={primary} secondaryColor={secondary} />
              </div>
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
                        <Button size="sm" variant="outline" onClick={() => setBidForm({ itemId: item.id, name: "", email: "", amount: String(Number(item.current_bid) + 5) })}>
                          Place Bid
                        </Button>
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
                      {p.purchase_url && (
                        <a href={p.purchase_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-md text-sm font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: primary, color: "white" }}>
                          Buy Now <ExternalLink className="h-3.5 w-3.5" />
                        </a>
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

      {/* ===== CONTACT FOOTER ===== */}
      {(tournament.contact_email || tournament.contact_phone) && (
        <section className="py-12" style={{ backgroundColor: "#f5f5f5", borderTop: "1px solid #e5e5e5" }}>
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h3 className="text-sm font-bold tracking-[0.3em] uppercase mb-4" style={{ color: secondary }}>Questions?</h3>
            <div className="flex flex-wrap justify-center gap-6">
              {tournament.contact_email && (
                <a href={`mailto:${tournament.contact_email}`} className="inline-flex items-center gap-2 transition-colors hover:opacity-80" style={{ color: "#555" }}>
                  <Mail className="h-4 w-4" />{tournament.contact_email}
                </a>
              )}
              {tournament.contact_phone && (
                <a href={`tel:${tournament.contact_phone}`} className="inline-flex items-center gap-2 transition-colors hover:opacity-80" style={{ color: "#555" }}>
                  <Phone className="h-4 w-4" />{tournament.contact_phone}
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      <footer className="py-4 text-center" style={{ borderTop: "1px solid #e5e5e5" }}>
        <p className="text-xs" style={{ color: "#aaa" }}>
          Powered by <span className="font-semibold" style={{ color: primary }}>TeeVents</span>
        </p>
      </footer>
    </div>
  );
};

export default PublicTournament;
