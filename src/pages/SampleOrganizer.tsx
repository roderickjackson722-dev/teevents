import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Monitor, Users, Trophy, CreditCard, BarChart3, ArrowRight,
  CalendarRange, Layers, UserPlus, Info
} from "lucide-react";
import SEO from "@/components/SEO";
import logoBlack from "@/assets/logo-black.png";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const DEMO_EMAIL = "demo@teevents.com";
const DEMO_PASSWORD = "demo2026";

const features = [
  { icon: Monitor, label: "Tournament Website Builder" },
  { icon: CalendarRange, label: "Multi-Day Event Scheduling" },
  { icon: Layers, label: "Registration Tiers (Pro, Amateur, VIP)" },
  { icon: UserPlus, label: "Flexible Group Sizes (1–6 Players)" },
  { icon: Trophy, label: "Live Scoring & Leaderboard" },
  { icon: CreditCard, label: "Online Registration & Payments" },
  { icon: BarChart3, label: "Budget, Sponsors & More" },
];

const sampleTiers = [
  {
    name: "Professional",
    price: "$250",
    description: "For PGA professionals and touring pros",
    eligibility: "Must hold a valid PGA Tour card or equivalent professional certification. Proof of status may be required at check-in.",
    color: "bg-primary/10 border-primary/30",
  },
  {
    name: "Amateur",
    price: "$150",
    description: "Open to all amateur golfers with an established handicap",
    eligibility: "Must have a USGA handicap index of 36.0 or lower. Handicap verification will be conducted prior to the event.",
    color: "bg-secondary/10 border-secondary/30",
  },
  {
    name: "Celebrity / VIP",
    price: "$500",
    description: "Special tier for celebrity guests and VIP invitees",
    eligibility: "By invitation only. Contact the tournament director for eligibility and availability.",
    color: "bg-accent/10 border-accent/30",
  },
];

const SampleOrganizer = () => {
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<typeof sampleTiers[0] | null>(null);
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

      <div className="w-full max-w-6xl space-y-8">
        {/* Login card - FIRST */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-lg mx-auto"
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

          </div>
        </motion.div>
      </div>

      {/* Eligibility Popup Dialog */}
      <Dialog open={!!selectedTier} onOpenChange={() => setSelectedTier(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-secondary" />
              {selectedTier?.name} — Eligibility
            </DialogTitle>
            <DialogDescription>
              {selectedTier?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <h4 className="text-sm font-semibold text-foreground mb-2">Requirements</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {selectedTier?.eligibility}
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Registration Fee</span>
              <span className="text-lg font-bold text-foreground">{selectedTier?.price}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTier(null)}>
              Close
            </Button>
            <Button variant="secondary" onClick={() => setSelectedTier(null)}>
              Confirm & Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SampleOrganizer;
