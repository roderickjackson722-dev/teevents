import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Loader2, Building2, Shield } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const enterpriseFeatures = [
  "Everything in Pro — every feature unlocked",
  "Unlimited tournaments — no per-event fee",
  "White-label option (remove TeeVents branding from public pages)",
  "Dedicated account manager — single point of contact",
  "Custom integrations — API access, webhooks, CRM sync",
  "SLA guarantee — 99.9% uptime, 1-hour priority response",
  "Volume pricing — discounted rate for high-volume operators",
  "Onboarding & migration support for your team",
];

const EnterprisePricing = () => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    organization: "",
    phone: "",
    tournamentsPerYear: "",
    notes: "",
  });

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.organization) {
      toast.error("Please fill in name, email and organization.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-enterprise-inquiry", {
        body: form,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("Thanks! We'll be in touch within one business day.");
    } catch (err: any) {
      toast.error(err.message || "Could not send your inquiry. Please email info@teevents.golf");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <SEO
        title="Enterprise Pricing | TeeVents — White-Label & Volume Plans"
        description="Custom TeeVents pricing for organizations running 5+ tournaments per year. White-label, dedicated account manager, custom integrations, and SLA guarantees."
        path="/enterprise-pricing"
      />

      {/* Hero */}
      <section className="bg-primary pt-24 pb-14">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-secondary/20 text-secondary px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-4">
              <Building2 className="h-3.5 w-3.5" /> Enterprise
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-primary-foreground mb-4">
              Built for organizations that run a calendar of events.
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/70 leading-relaxed">
              5+ tournaments a year? White-label needs? Custom integrations? Let's talk.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Body */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid lg:grid-cols-2 gap-10">
            {/* Features */}
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-6">
                What's included
              </h2>
              <ul className="space-y-4">
                {enterpriseFeatures.map((feat) => (
                  <li key={feat} className="flex items-start gap-3">
                    <Check className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                    <span className="text-foreground/80">{feat}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 rounded-xl border border-border bg-card p-6">
                <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> Same trusted payment infrastructure
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Enterprise plans use the same PCI Level 1 Stripe Connect setup as Base and Pro. The 5% platform fee is the standard rate; volume discounts are available based on annual transaction volume.
                </p>
              </div>
            </div>

            {/* Lead Form */}
            <div className="rounded-xl border border-border bg-card p-6 md:p-8">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-secondary/20 text-secondary mb-4">
                    <Check className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-2">
                    Thanks — we'll be in touch.
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    A member of our team will reach out within one business day. For anything urgent, email{" "}
                    <a className="text-primary underline" href="mailto:info@teevents.golf">info@teevents.golf</a>.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h2 className="text-xl font-display font-bold text-foreground mb-2">
                    Talk to sales
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tell us about your events and we'll send a tailored quote.
                  </p>

                  <div>
                    <Label htmlFor="name">Your name *</Label>
                    <Input id="name" value={form.name} onChange={update("name")} required />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={form.email} onChange={update("email")} required />
                  </div>
                  <div>
                    <Label htmlFor="organization">Organization *</Label>
                    <Input id="organization" value={form.organization} onChange={update("organization")} required />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" type="tel" value={form.phone} onChange={update("phone")} />
                  </div>
                  <div>
                    <Label htmlFor="tournamentsPerYear">Tournaments per year</Label>
                    <Input
                      id="tournamentsPerYear"
                      placeholder="e.g. 6–10"
                      value={form.tournamentsPerYear}
                      onChange={update("tournamentsPerYear")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Anything else we should know?</Label>
                    <Textarea
                      id="notes"
                      rows={4}
                      value={form.notes}
                      onChange={update("notes")}
                      placeholder="White-label needs, integrations, timeline…"
                    />
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full" size="lg">
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</>
                    ) : (
                      <>Send Inquiry <ArrowRight className="h-4 w-4 ml-2" /></>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Or email us directly at{" "}
                    <a href="mailto:info@teevents.golf" className="text-primary underline">info@teevents.golf</a>.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default EnterprisePricing;
