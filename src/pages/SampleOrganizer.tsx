import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Monitor, Users, Trophy, CreditCard, BarChart3, ArrowRight } from "lucide-react";
import SEO from "@/components/SEO";
import logoBlack from "@/assets/logo-black.png";

const DEMO_EMAIL = "info@teevents.golf";
const DEMO_PASSWORD = "demo2026";

const features = [
  { icon: Monitor, label: "Tournament Website" },
  { icon: Users, label: "Player Management" },
  { icon: Trophy, label: "Live Scoring" },
  { icon: CreditCard, label: "Registration & Payments" },
  { icon: BarChart3, label: "Budget & Sponsors" },
];

const SampleOrganizer = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });

      if (error) {
        // If login fails, the demo might not be set up yet
        toast({
          title: "Demo Unavailable",
          description: "The demo environment is being prepared. Please try again in a moment.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      navigate("/dashboard");
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <SEO
        title="Sample Organizer Dashboard | TeeVents"
        description="Experience the TeeVents tournament management dashboard with a fully populated sample event. Explore every feature before you sign up."
        path="/sample-organizer"
      />

      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left - Info panel */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          <div>
            <img src={logoBlack} alt="TeeVents" className="h-16 w-16 mb-6 object-contain" />
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground leading-tight">
              Explore the Organizer Dashboard
            </h1>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              See exactly what tournament organizers see. This sample event is fully populated with players, sponsors, scores, and more.
            </p>
          </div>

          <div className="space-y-3">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <f.icon className="h-5 w-5 text-secondary" />
                </div>
                <span className="text-foreground font-medium">{f.label}</span>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">
            This is a read-only demo. Changes will not be saved.
          </p>
        </motion.div>

        {/* Right - Login card */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="bg-card border border-border rounded-2xl shadow-xl p-8 md:p-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-bold text-foreground">
                Sample Login
              </h2>
              <p className="text-muted-foreground mt-2">
                Click below to access the demo dashboard
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full px-4 py-3 rounded-lg border border-border bg-muted/50 text-foreground cursor-default"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  readOnly
                  className="w-full px-4 py-3 rounded-lg border border-border bg-muted/50 text-foreground cursor-default"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-secondary text-secondary-foreground py-3.5 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-secondary/90 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    View Demo Dashboard <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Ready to create your own tournament?
              </p>
              <a
                href="/get-started"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                Sign up free <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SampleOrganizer;
