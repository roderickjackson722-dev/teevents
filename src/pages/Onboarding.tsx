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
import { SITE_TEMPLATES } from "@/lib/siteTemplates";

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

    const template = SITE_TEMPLATES.find((t) => t.id === selectedTemplate)!;
    const orgId = crypto.randomUUID();

    const { error: orgError } = await supabase
      .from("organizations")
      .insert({
        id: orgId,
        name: orgName,
        subdomain,
        plan: "base",
        primary_color: template.colors.primary,
        secondary_color: template.colors.secondary,
      });

    if (orgError) {
      toast({ title: "Error", description: orgError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const { error: memberError } = await supabase
      .from("org_members")
      .insert({ user_id: userId, organization_id: orgId, role: "owner" });

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
                    className={`relative text-left rounded-lg border-2 overflow-hidden transition-all ${
                      selectedTemplate === template.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    {selectedTemplate === template.id && (
                      <div className="absolute top-3 right-3 z-10 bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-3 w-3" />
                      </div>
                    )}

                    {/* Mini site preview */}
                    <div className="relative h-28 w-full" style={{ backgroundColor: template.colors.primary }}>
                      {/* Mini nav bar */}
                      <div className="absolute top-0 left-0 right-0 h-5 flex items-center px-3 gap-2" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                        {template.preview.navStyle === "left-logo" && (
                          <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: "rgba(255,255,255,0.6)" }} />
                        )}
                        <div className="flex gap-1.5 mx-auto">
                          {["", "", "", ""].map((_, i) => (
                            <div key={i} className="w-6 h-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.4)" }} />
                          ))}
                        </div>
                      </div>

                      {/* Hero content */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pt-5" style={{ textAlign: template.preview.heroAlign as any }}>
                        <div className="w-8 h-8 rounded-full border-2 mb-1" style={{ borderColor: template.colors.secondary, backgroundColor: "rgba(255,255,255,0.15)" }} />
                        <div className="w-24 h-2 rounded-full mb-1" style={{ backgroundColor: "rgba(255,255,255,0.8)" }} />
                        <div className="w-16 h-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.4)" }} />
                      </div>

                      {/* CTA buttons at bottom */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-0">
                        {Array.from({ length: template.preview.ctaCount }).map((_, i) => (
                          <div
                            key={i}
                            className="w-16 h-4"
                            style={{
                              backgroundColor: i === 0 ? template.colors.secondary : i === 1 ? template.colors.primary : "#333",
                              opacity: i === 0 ? 1 : 0.9,
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Template info */}
                    <div className="p-3 flex items-center gap-3">
                      <div className="flex gap-1.5 shrink-0">
                        <div className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: template.colors.primary }} />
                        <div className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: template.colors.secondary }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-foreground">{template.name}</h3>
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
