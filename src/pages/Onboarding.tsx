import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check } from "lucide-react";
import logoBlack from "@/assets/logo-black.png";

const templates = [
  {
    id: "classic",
    name: "Classic Green",
    description: "Timeless golf aesthetic with deep greens and gold accents.",
    colors: { primary: "#1a5c38", secondary: "#c8a84e" },
  },
  {
    id: "modern",
    name: "Modern Navy",
    description: "Clean and contemporary with navy blue and white.",
    colors: { primary: "#1e3a5f", secondary: "#e8b931" },
  },
  {
    id: "charity",
    name: "Charity Warmth",
    description: "Warm tones perfect for fundraising and nonprofit events.",
    colors: { primary: "#8b2500", secondary: "#d4a017" },
  },
];

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) navigate("/get-started");
      else setUserId(session.user.id);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/get-started");
      else setUserId(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleCreateOrg = async () => {
    if (!orgName.trim() || !userId) return;
    setLoading(true);

    const subdomain = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const template = templates.find((t) => t.id === selectedTemplate)!;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: orgName,
        subdomain,
        primary_color: template.colors.primary,
        secondary_color: template.colors.secondary,
      })
      .select()
      .single();

    if (orgError) {
      toast({ title: "Error", description: orgError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const { error: memberError } = await supabase
      .from("org_members")
      .insert({ user_id: userId, organization_id: org.id, role: "owner" });

    if (memberError) {
      toast({ title: "Error", description: memberError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({ title: "Organization created!", description: "Let's set up your first tournament." });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-golf-cream flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl"
      >
        <div className="bg-card rounded-xl border border-border p-8 shadow-lg">
          <div className="text-center mb-8">
            <img src={logoBlack} alt="TeeVents" className="h-14 w-14 mx-auto mb-4 object-contain" />
            <h1 className="text-2xl font-display font-bold text-foreground">
              {step === 1 ? "Name Your Organization" : "Choose a Template"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Step {step} of 2
            </p>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Hope Foundation Golf"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This will appear on your tournament website.
                </p>
              </div>
              <Button
                onClick={() => setStep(2)}
                className="w-full"
                disabled={!orgName.trim()}
              >
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="grid gap-4">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`relative text-left p-4 rounded-lg border-2 transition-all ${
                      selectedTemplate === template.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    {selectedTemplate === template.id && (
                      <div className="absolute top-3 right-3 bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <div className="flex gap-1.5">
                        <div
                          className="w-8 h-8 rounded-full border border-border"
                          style={{ backgroundColor: template.colors.primary }}
                        />
                        <div
                          className="w-8 h-8 rounded-full border border-border"
                          style={{ backgroundColor: template.colors.secondary }}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{template.name}</h3>
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleCreateOrg} className="flex-1" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Organization
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;
