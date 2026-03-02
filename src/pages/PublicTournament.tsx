import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Calendar, Clock, Mail, Phone, ExternalLink, Loader2, UserPlus, Award, ShoppingBag, Package, Trophy, Gavel, Ticket, ImageIcon, Users, ClipboardList, Star, Send } from "lucide-react";
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
  registration_open: boolean | null; course_par: number | null;
}

interface LeaderboardEntry {
  name: string; total: number; thru: number;
}

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

  // Bid form
  const [bidForm, setBidForm] = useState<{ itemId: string; name: string; email: string; amount: string } | null>(null);
  // Volunteer form
  const [volForm, setVolForm] = useState<{ roleId: string; name: string; email: string; phone: string } | null>(null);
  // Survey form
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

        // Build leaderboard
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

        // Volunteer roles with fill count
        if (roleRes.data) {
          setVolunteerRoles((roleRes.data as any[]).map((r) => ({
            ...r, filled: r.tournament_volunteers?.length || 0,
          })));
        }

        // Survey questions
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
        // Refetch scores
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
    // Update current bid
    await supabase.from("tournament_auction_items").update({ current_bid: amount }).eq("id", bidForm.itemId);
    toast({ title: "Bid placed!" });
    setBidForm(null);
    // Refresh
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

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section
        className="relative min-h-[60vh] flex items-center justify-center"
        style={{ backgroundColor: primary, backgroundImage: tournament.site_hero_image_url ? `url(${tournament.site_hero_image_url})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        {tournament.site_hero_image_url && <div className="absolute inset-0 bg-black/55" />}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative z-10 text-center px-4 max-w-3xl mx-auto">
          {tournament.site_logo_url && <img src={tournament.site_logo_url} alt={heroTitle} className="h-24 w-24 mx-auto mb-6 object-contain" />}
          <h1 className="text-4xl md:text-6xl font-display font-bold text-white leading-tight" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}>{heroTitle}</h1>
          {tournament.site_hero_subtitle && <p className="mt-4 text-lg md:text-xl text-white/80 max-w-2xl mx-auto">{tournament.site_hero_subtitle}</p>}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {tournament.date && (
              <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
                <Calendar className="h-4 w-4" />
                {new Date(tournament.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
            )}
            {tournament.course_name && <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">⛳ {tournament.course_name}</span>}
            {tournament.location && (
              <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
                <MapPin className="h-4 w-4" />{tournament.location}
              </span>
            )}
          </div>
          {tournament.registration_url ? (
            <a href={tournament.registration_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-8 px-8 py-3 rounded-md text-lg font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: secondary, color: primary }}>
              Register Now <ExternalLink className="h-4 w-4" />
            </a>
          ) : tournament.registration_open ? (
            <a href="#register" className="inline-flex items-center gap-2 mt-8 px-8 py-3 rounded-md text-lg font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: secondary, color: primary }}>
              Register Now <UserPlus className="h-4 w-4" />
            </a>
          ) : null}
        </motion.div>
      </section>

      {/* About */}
      {tournament.description && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-sm font-bold tracking-[0.3em] uppercase mb-4" style={{ color: secondary }}>About the Tournament</h2>
              <p className="text-lg text-foreground/80 leading-relaxed whitespace-pre-wrap">{tournament.description}</p>
            </motion.div>
          </div>
        </section>
      )}

      {/* Schedule */}
      {tournament.schedule_info && (
        <section className="py-16" style={{ backgroundColor: primary + "0a" }}>
          <div className="container mx-auto px-4 max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-sm font-bold tracking-[0.3em] uppercase mb-6" style={{ color: secondary }}>
                <Clock className="h-4 w-4 inline mr-2" />Event Schedule
              </h2>
              <div className="bg-card rounded-lg border border-border p-6">
                <pre className="text-foreground/80 whitespace-pre-wrap font-body text-base leading-relaxed">{tournament.schedule_info}</pre>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Live Leaderboard */}
      {leaderboard.length > 0 && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-sm font-bold tracking-[0.3em] uppercase mb-2 text-center" style={{ color: secondary }}>
                <Trophy className="h-4 w-4 inline mr-2" />Live Leaderboard
              </h2>
              <p className="text-center text-muted-foreground mb-8 text-sm">Par {coursePar} • Updates in real-time</p>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
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
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 font-bold" style={{ color: i < 3 ? secondary : undefined }}>{i + 1}</td>
                          <td className="px-4 py-3 font-medium">{entry.name}</td>
                          <td className="px-4 py-3 text-center font-bold">{entry.total}</td>
                          <td className="px-4 py-3 text-center" style={{ color: toPar < 0 ? "#dc2626" : toPar > 0 ? "#059669" : undefined }}>{toParStr}</td>
                          <td className="px-4 py-3 text-center text-muted-foreground">{entry.thru}</td>
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

      {/* Registration */}
      {tournament.registration_open && !tournament.registration_url && (
        <section id="register" className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="text-center mb-8">
                <UserPlus className="h-8 w-8 mx-auto mb-3" style={{ color: secondary }} />
                <h2 className="text-3xl font-display font-bold text-foreground mb-2">Register to Play</h2>
                <p className="text-muted-foreground">Fill out the form below to secure your spot.</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <RegistrationForm tournamentId={tournament.id} primaryColor={primary} secondaryColor={secondary} />
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* External Registration CTA */}
      {tournament.registration_url && (
        <section className="py-16" style={{ backgroundColor: primary }}>
          <div className="container mx-auto px-4 text-center">
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

      {/* Auction & Raffle */}
      {auctionItems.length > 0 && (
        <section className="py-16" style={{ backgroundColor: primary + "0a" }}>
          <div className="container mx-auto px-4 max-w-5xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-sm font-bold tracking-[0.3em] uppercase mb-2 text-center" style={{ color: secondary }}>
                <Gavel className="h-4 w-4 inline mr-2" />Auction & Raffle
              </h2>
              <p className="text-center text-muted-foreground mb-10 text-sm">Bid on items or enter the raffle</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {auctionItems.map((item) => (
                  <div key={item.id} className="bg-card rounded-xl border border-border p-5 space-y-3">
                    {item.image_url && <img src={item.image_url} alt={item.title} className="w-full aspect-video object-cover rounded-lg" />}
                    <div className="flex items-center gap-2">
                      {item.type === "auction" ? <Gavel className="h-4 w-4" style={{ color: secondary }} /> : <Ticket className="h-4 w-4" style={{ color: secondary }} />}
                      <h3 className="font-display font-bold">{item.title}</h3>
                    </div>
                    {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                    {item.type === "auction" && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Current bid: </span>
                        <span className="font-bold text-lg" style={{ color: primary }}>${Number(item.current_bid).toFixed(2)}</span>
                      </div>
                    )}
                    {item.type === "raffle" && item.raffle_ticket_price && (
                      <p className="text-sm"><span className="text-muted-foreground">Ticket: </span><span className="font-bold">${Number(item.raffle_ticket_price).toFixed(2)}</span></p>
                    )}
                    {item.type === "auction" && (
                      bidForm?.itemId === item.id ? (
                        <div className="space-y-2 pt-2 border-t border-border">
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

      {/* Store */}
      {products.length > 0 && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-5xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-sm font-bold tracking-[0.3em] uppercase mb-2 text-center" style={{ color: secondary }}>
                <ShoppingBag className="h-4 w-4 inline mr-2" />Tournament Store
              </h2>
              <p className="text-center text-muted-foreground mb-10 text-sm">Support the tournament with merchandise and gear</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow group">
                    {p.image_url ? (
                      <div className="aspect-square bg-muted overflow-hidden">
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    ) : (
                      <div className="aspect-square bg-muted flex items-center justify-center"><Package className="h-12 w-12 text-muted-foreground/20" /></div>
                    )}
                    <div className="p-4">
                      <h3 className="font-display font-bold text-foreground">{p.name}</h3>
                      <p className="text-lg font-semibold mt-1" style={{ color: primary }}>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(p.price)}</p>
                      {p.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{p.description}</p>}
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

      {/* Photo Gallery */}
      {photos.length > 0 && (
        <section className="py-16" style={{ backgroundColor: primary + "0a" }}>
          <div className="container mx-auto px-4 max-w-5xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-sm font-bold tracking-[0.3em] uppercase mb-2 text-center" style={{ color: secondary }}>
                <ImageIcon className="h-4 w-4 inline mr-2" />Photo Gallery
              </h2>
              <p className="text-center text-muted-foreground mb-10 text-sm">Moments from the tournament</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {photos.map((photo) => (
                  <div key={photo.id} className="rounded-lg overflow-hidden border border-border">
                    <img src={photo.image_url} alt={photo.caption || ""} className="w-full aspect-square object-cover hover:scale-105 transition-transform duration-300" />
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Volunteer Signup */}
      {volunteerRoles.length > 0 && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-sm font-bold tracking-[0.3em] uppercase mb-2 text-center" style={{ color: secondary }}>
                <Users className="h-4 w-4 inline mr-2" />Volunteer
              </h2>
              <p className="text-center text-muted-foreground mb-10 text-sm">Sign up to help make this event a success</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {volunteerRoles.map((role) => {
                  const spotsLeft = (role.max_volunteers || 1) - role.filled;
                  return (
                    <div key={role.id} className="bg-card rounded-xl border border-border p-5 space-y-3">
                      <h3 className="font-display font-bold">{role.title}</h3>
                      {role.description && <p className="text-sm text-muted-foreground">{role.description}</p>}
                      <div className="flex items-center gap-3 text-sm">
                        {role.time_slot && <span className="text-muted-foreground">{role.time_slot}</span>}
                        <span className={spotsLeft > 0 ? "text-primary font-medium" : "text-destructive"}>{spotsLeft > 0 ? `${spotsLeft} spots left` : "Full"}</span>
                      </div>
                      {spotsLeft > 0 && (
                        volForm?.roleId === role.id ? (
                          <div className="space-y-2 pt-2 border-t border-border">
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

      {/* Sponsors */}
      {sponsors.length > 0 && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-sm font-bold tracking-[0.3em] uppercase mb-2 text-center" style={{ color: secondary }}>
                <Award className="h-4 w-4 inline mr-2" />Our Sponsors
              </h2>
              <p className="text-center text-muted-foreground mb-10 text-sm">Thank you to our generous sponsors</p>
              <div className="flex flex-wrap justify-center items-center gap-8">
                {sponsors.map((s) => (
                  <motion.div key={s.id} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="flex flex-col items-center">
                    {s.website_url ? (
                      <a href={s.website_url} target="_blank" rel="noopener noreferrer" className="group">
                        {s.logo_url ? <img src={s.logo_url} alt={s.name} className="h-16 w-auto max-w-[140px] object-contain grayscale group-hover:grayscale-0 transition-all" /> : <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{s.name}</span>}
                      </a>
                    ) : s.logo_url ? <img src={s.logo_url} alt={s.name} className="h-16 w-auto max-w-[140px] object-contain" /> : <span className="text-sm font-semibold text-foreground">{s.name}</span>}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Post-Event Survey */}
      {surveyQuestions.length > 0 && !surveySubmitted && (
        <section className="py-16" style={{ backgroundColor: primary + "0a" }}>
          <div className="container mx-auto px-4 max-w-xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-sm font-bold tracking-[0.3em] uppercase mb-2 text-center" style={{ color: secondary }}>
                <ClipboardList className="h-4 w-4 inline mr-2" />Post-Event Survey
              </h2>
              <p className="text-center text-muted-foreground mb-8 text-sm">We'd love your feedback</p>
              <div className="bg-card rounded-xl border border-border p-6 space-y-5">
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
                              borderColor: surveyAnswers[q.id] === String(n) ? secondary : undefined,
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

      {/* Contact Footer */}
      {(tournament.contact_email || tournament.contact_phone) && (
        <section className="py-12 bg-card border-t border-border">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h3 className="text-sm font-bold tracking-[0.3em] uppercase mb-4" style={{ color: secondary }}>Questions?</h3>
            <div className="flex flex-wrap justify-center gap-6">
              {tournament.contact_email && (
                <a href={`mailto:${tournament.contact_email}`} className="inline-flex items-center gap-2 text-foreground/70 hover:text-foreground transition-colors">
                  <Mail className="h-4 w-4" />{tournament.contact_email}
                </a>
              )}
              {tournament.contact_phone && (
                <a href={`tel:${tournament.contact_phone}`} className="inline-flex items-center gap-2 text-foreground/70 hover:text-foreground transition-colors">
                  <Phone className="h-4 w-4" />{tournament.contact_phone}
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      <footer className="py-4 text-center border-t border-border">
        <p className="text-xs text-muted-foreground">
          Powered by <span className="font-semibold" style={{ color: primary }}>TeeVents</span>
        </p>
      </footer>
    </div>
  );
};

export default PublicTournament;
