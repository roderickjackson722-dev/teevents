import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Calendar, MapPin, Trophy, Loader2, CheckCircle, XCircle, Users, FileText, School,
} from "lucide-react";
import SEO from "@/components/SEO";
import golfCourseHero from "@/assets/golf-course-hero.jpg";

interface RegistrationField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  editable: boolean;
  options?: string[];
}

interface Tournament {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  course_name: string | null;
  status: string;
  registration_open: boolean;
  contact_email: string | null;
  slug: string | null;
  registration_fields: RegistrationField[] | null;
}

interface TournamentTab {
  id: string;
  title: string;
  content_type: string;
  content: string | null;
  file_url: string | null;
  sort_order: number;
  is_visible: boolean;
}

interface Invitation {
  id: string;
  coach_name: string;
  coach_email: string;
  school_name: string;
  status: string;
  rsvp_response: string | null;
  token: string;
  tournament_id: string;
}

const CollegeTournament = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [tabs, setTabs] = useState<TournamentTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");

  // RSVP state
  const rsvpToken = searchParams.get("rsvp");
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);
  const [rsvpDone, setRsvpDone] = useState(false);

  // Registration form
  const [showRegForm, setShowRegForm] = useState(false);
  const [regForm, setRegForm] = useState<Record<string, string>>({
    school_name: "", coach_name: "", coach_email: "", notes: "",
  });
  const [players, setPlayers] = useState([
    { first_name: "", last_name: "", year: "", position: "" },
  ]);
  const [registering, setRegistering] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  useEffect(() => {
    const fetchTournament = async () => {
      const { data: t } = await supabase
        .from("college_tournaments")
        .select("*")
        .eq("slug", slug)
        .eq("status", "active")
        .single() as any;

      if (!t) { setLoading(false); return; }
      setTournament(t);

      const { data: tabData } = await supabase
        .from("college_tournament_tabs")
        .select("*")
        .eq("tournament_id", t.id)
        .eq("is_visible", true)
        .order("sort_order", { ascending: true }) as any;
      setTabs(tabData || []);

      // Check RSVP token
      if (rsvpToken) {
        const { data: inv } = await supabase
          .from("college_tournament_invitations")
          .select("*")
          .eq("token", rsvpToken)
          .eq("tournament_id", t.id)
          .single() as any;
        if (inv) {
          setInvitation(inv);
          if (inv.rsvp_response) setRsvpDone(true);
          // Pre-fill registration form
          setRegForm({
            school_name: inv.school_name,
            coach_name: inv.coach_name,
            coach_email: inv.coach_email,
            notes: "",
          });
        }
      }

      setLoading(false);
    };
    fetchTournament();
  }, [slug, rsvpToken]);

  const handleRsvp = async (response: "accepted" | "declined") => {
    if (!invitation) return;
    setRsvpSubmitting(true);
    const { error } = await supabase
      .from("college_tournament_invitations")
      .update({ rsvp_response: response, rsvp_date: new Date().toISOString() } as any)
      .eq("id", invitation.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setRsvpDone(true);
      setInvitation({ ...invitation, rsvp_response: response });
      toast({ title: response === "accepted" ? "RSVP Accepted!" : "RSVP Declined" });
      if (response === "accepted") setShowRegForm(true);
    }
    setRsvpSubmitting(false);
  };

  const addPlayer = () => {
    setPlayers([...players, { first_name: "", last_name: "", year: "", position: "" }]);
  };

  const removePlayer = (idx: number) => {
    if (players.length <= 1) return;
    setPlayers(players.filter((_, i) => i !== idx));
  };

  const updatePlayer = (idx: number, field: string, value: string) => {
    setPlayers(players.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournament) return;
    setRegistering(true);

    // Collect custom field answers into notes
    const customFields = (tournament.registration_fields || []).filter(f => f.editable && f.id !== "notes");
    const customAnswers = customFields
      .filter(f => regForm[f.id])
      .map(f => `${f.label}: ${regForm[f.id]}`)
      .join("\n");
    const combinedNotes = [regForm.notes, customAnswers].filter(Boolean).join("\n---\n");

    // Create registration
    const { data: reg, error: regErr } = await supabase
      .from("college_tournament_registrations")
      .insert({
        tournament_id: tournament.id,
        invitation_id: invitation?.id || null,
        coach_name: regForm.coach_name,
        coach_email: regForm.coach_email,
        school_name: regForm.school_name,
        notes: combinedNotes || null,
        payment_status: "registered",
      } as any)
      .select()
      .single() as any;

    if (regErr) {
      toast({ title: "Registration failed", description: regErr.message, variant: "destructive" });
      setRegistering(false);
      return;
    }

    // Add players
    const validPlayers = players.filter(p => p.first_name && p.last_name);
    if (validPlayers.length > 0) {
      await supabase.from("college_tournament_players").insert(
        validPlayers.map(p => ({
          registration_id: reg.id,
          first_name: p.first_name,
          last_name: p.last_name,
          year: p.year || null,
          position: p.position || null,
        })) as any
      );
    }

    // Send notification to admin
    try {
      await supabase.functions.invoke("send-college-registration-email", {
        body: {
          tournament_id: tournament.id,
          tournament_title: tournament.title,
          school_name: regForm.school_name,
          coach_name: regForm.coach_name,
          coach_email: regForm.coach_email,
          player_count: validPlayers.length,
          contact_email: tournament.contact_email || "info@teevents.golf",
        },
      });
    } catch (err) {
      console.error("Notification email failed:", err);
    }

    setRegSuccess(true);
    setRegistering(false);
    toast({ title: "Registration submitted!", description: "Your team has been registered." });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!tournament) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <School className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <h1 className="text-2xl font-display font-bold mb-2">Tournament Not Found</h1>
        <p className="text-muted-foreground">This tournament may not be published yet.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${tournament.title} | TeeVents College Golf`} description={tournament.description || `${tournament.title} college golf tournament`} />

      {/* Hero */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <School className="h-6 w-6" />
            <span className="text-sm font-medium opacity-80 uppercase tracking-wider">College Golf Tournament</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">{tournament.title}</h1>
          {tournament.description && <p className="text-lg opacity-90 max-w-2xl mx-auto">{tournament.description}</p>}
          <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
            {tournament.course_name && (
              <span className="flex items-center gap-2 text-sm"><Trophy className="h-4 w-4" />{tournament.course_name}</span>
            )}
            {tournament.location && (
              <span className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4" />{tournament.location}</span>
            )}
            {tournament.start_date && (
              <span className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                {new Date(tournament.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                {tournament.end_date && tournament.end_date !== tournament.start_date && (
                  <> – {new Date(tournament.end_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl py-8">
        {/* RSVP Banner */}
        {invitation && !rsvpDone && (
          <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-6 mb-8 text-center">
            <h2 className="text-xl font-display font-bold mb-2">You're Invited!</h2>
            <p className="text-muted-foreground mb-4">
              Hello <strong>{invitation.coach_name}</strong> from <strong>{invitation.school_name}</strong>, you've been invited to participate.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => handleRsvp("accepted")} disabled={rsvpSubmitting} className="bg-primary">
                <CheckCircle className="h-4 w-4 mr-2" /> Accept Invitation
              </Button>
              <Button onClick={() => handleRsvp("declined")} disabled={rsvpSubmitting} variant="outline">
                <XCircle className="h-4 w-4 mr-2" /> Decline
              </Button>
            </div>
          </div>
        )}

        {invitation && rsvpDone && invitation.rsvp_response === "accepted" && !regSuccess && !showRegForm && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-6 mb-8 text-center">
            <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2" />
            <h2 className="text-xl font-display font-bold mb-2">Invitation Accepted!</h2>
            <p className="text-muted-foreground mb-4">Please register your team below.</p>
            <Button onClick={() => setShowRegForm(true)}><Users className="h-4 w-4 mr-2" /> Register Team</Button>
          </div>
        )}

        {invitation && rsvpDone && invitation.rsvp_response === "declined" && (
          <div className="bg-muted border border-border rounded-lg p-6 mb-8 text-center">
            <XCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <h2 className="text-xl font-display font-bold mb-2">Invitation Declined</h2>
            <p className="text-muted-foreground">Thank you for letting us know. We hope to see you at a future event.</p>
          </div>
        )}

        {/* Registration Success */}
        {regSuccess && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-6 mb-8 text-center">
            <CheckCircle className="h-10 w-10 text-primary mx-auto mb-3" />
            <h2 className="text-2xl font-display font-bold mb-2">Registration Complete!</h2>
            <p className="text-muted-foreground">Your team has been registered. A confirmation has been sent to {regForm.coach_email}.</p>
          </div>
        )}

        {/* Registration Form */}
        {showRegForm && !regSuccess && (
          <div className="bg-card rounded-lg border border-border p-6 mb-8">
            <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Team Registration
            </h2>
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                {(tournament.registration_fields || [
                  { id: "school_name", label: "School Name", type: "text", required: true, editable: false },
                  { id: "coach_name", label: "Head Coach Name", type: "text", required: true, editable: false },
                  { id: "coach_email", label: "Coach Email", type: "email", required: true, editable: false },
                  { id: "notes", label: "Notes", type: "text", required: false, editable: true },
                ]).map((field) => (
                  <div key={field.id} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                    <label className="text-sm font-medium mb-1 block">
                      {field.label} {field.required && "*"}
                    </label>
                    {field.type === "textarea" ? (
                      <Textarea
                        value={regForm[field.id] || ""}
                        onChange={e => setRegForm({ ...regForm, [field.id]: e.target.value })}
                        placeholder={field.label}
                        required={field.required}
                      />
                    ) : field.type === "select" && field.options ? (
                      <select
                        value={regForm[field.id] || ""}
                        onChange={e => setRegForm({ ...regForm, [field.id]: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required={field.required}
                      >
                        <option value="">Select...</option>
                        {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <Input
                        type={field.type === "number" ? "number" : field.type === "email" ? "email" : "text"}
                        value={regForm[field.id] || ""}
                        onChange={e => setRegForm({ ...regForm, [field.id]: e.target.value })}
                        placeholder={field.label}
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Player Roster */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Player Roster</h3>
                  <Button type="button" size="sm" variant="outline" onClick={addPlayer}>+ Add Player</Button>
                </div>
                <div className="space-y-3">
                  {players.map((p, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_120px_120px_auto] gap-2 items-end">
                      <div>
                        {i === 0 && <label className="text-xs text-muted-foreground mb-1 block">First Name *</label>}
                        <Input placeholder="First" value={p.first_name} onChange={e => updatePlayer(i, "first_name", e.target.value)} required />
                      </div>
                      <div>
                        {i === 0 && <label className="text-xs text-muted-foreground mb-1 block">Last Name *</label>}
                        <Input placeholder="Last" value={p.last_name} onChange={e => updatePlayer(i, "last_name", e.target.value)} required />
                      </div>
                      <div>
                        {i === 0 && <label className="text-xs text-muted-foreground mb-1 block">Year</label>}
                        <select
                          value={p.year}
                          onChange={e => updatePlayer(i, "year", e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Year</option>
                          <option value="freshman">FR</option>
                          <option value="sophomore">SO</option>
                          <option value="junior">JR</option>
                          <option value="senior">SR</option>
                          <option value="graduate">GR</option>
                        </select>
                      </div>
                      <div>
                        {i === 0 && <label className="text-xs text-muted-foreground mb-1 block">Position</label>}
                        <select
                          value={p.position}
                          onChange={e => updatePlayer(i, "position", e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Position</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5</option>
                          <option value="alternate">Alt</option>
                        </select>
                      </div>
                      <div>
                        {i === 0 && <label className="text-xs text-muted-foreground mb-1 block">&nbsp;</label>}
                        <Button type="button" variant="ghost" size="sm" onClick={() => removePlayer(i)} disabled={players.length <= 1} className="text-muted-foreground hover:text-destructive h-10 px-2">
                          ✕
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={registering}>
                {registering && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Submit Team Registration
              </Button>
            </form>
          </div>
        )}

        {/* Open Registration (no invitation) */}
        {!invitation && tournament.registration_open && !showRegForm && !regSuccess && (
          <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-6 mb-8 text-center">
            <h2 className="text-xl font-display font-bold mb-2">Registration Open</h2>
            <p className="text-muted-foreground mb-4">Register your team for this tournament.</p>
            <Button onClick={() => setShowRegForm(true)}><Users className="h-4 w-4 mr-2" /> Register Team</Button>
          </div>
        )}

        {/* Event Tabs */}
        {tabs.length > 0 && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="info">Overview</TabsTrigger>
              {tabs.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id}>{tab.title}</TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="info" className="mt-6">
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-display font-bold text-lg mb-4">Tournament Information</h3>
                {tournament.description && <p className="text-muted-foreground mb-4">{tournament.description}</p>}
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  {tournament.course_name && (
                    <div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /><span><strong>Course:</strong> {tournament.course_name}</span></div>
                  )}
                  {tournament.location && (
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /><span><strong>Location:</strong> {tournament.location}</span></div>
                  )}
                  {tournament.start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>
                        <strong>Dates:</strong>{" "}
                        {new Date(tournament.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        {tournament.end_date && tournament.end_date !== tournament.start_date && (
                          <> – {new Date(tournament.end_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</>
                        )}
                      </span>
                    </div>
                  )}
                  {tournament.contact_email && (
                    <div className="flex items-center gap-2">
                      <span><strong>Contact:</strong> <a href={`mailto:${tournament.contact_email}`} className="text-primary hover:underline">{tournament.contact_email}</a></span>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {tabs.map(tab => (
              <TabsContent key={tab.id} value={tab.id} className="mt-6">
                <div className="bg-card rounded-lg border border-border p-6">
                  <h3 className="font-display font-bold text-lg mb-4">{tab.title}</h3>
                  {tab.content_type === "file" && tab.file_url ? (
                    <div>
                      {tab.file_url.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? (
                        <img src={tab.file_url} alt={tab.title} className="max-w-full rounded-lg" />
                      ) : tab.file_url.match(/\.pdf$/i) ? (
                        <iframe src={tab.file_url} className="w-full h-[600px] rounded-lg border border-border" title={tab.title} />
                      ) : (
                        <a href={tab.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                          <FileText className="h-4 w-4" /> Download {tab.title}
                        </a>
                      )}
                    </div>
                  ) : tab.content ? (
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap">{tab.content}</div>
                  ) : (
                    <p className="text-muted-foreground italic">Content coming soon.</p>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Footer */}
        <div className="text-center py-8 mt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Powered by <a href="/" className="text-primary hover:underline font-semibold">TeeVents</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CollegeTournament;
