import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Mail, Phone, MessageCircle, Clock, CalendarCheck, Headphones, Flag, Users, Building2, Handshake, Search, DollarSign, Newspaper, CheckCircle2, Loader2, Send } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SectionHead, FinalCta, h2 } from "@/components/marketing/PageBits";
import ContactCaptcha from "@/components/marketing/ContactCaptcha";
import { contactSchema, contactTopics, contactSources } from "@/lib/contact.schema";
import { sendContactMessage } from "@/lib/contact.functions";
import servicesBg from "@/assets/golf-services-bg.jpg";

const initial = { name: "", email: "", phone: "", organization: "", topic: "", message: "", source: "", captchaToken: "" };
type Field = keyof typeof initial;
const selectClass = "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const quickLinks = [
  { title: "Start a Tournament", to: "/get-started", icon: Flag },
  { title: "See Pricing", to: "/pricing", icon: DollarSign },
  { title: "Find an Event", to: "/find-your-event", icon: Search },
  { title: "For Organizers", to: "/for-organizers", icon: Building2 },
  { title: "For Golfers", to: "/for-golfers", icon: Users },
  { title: "Consulting Services", to: "/services", icon: Handshake },
];

export default function Contact() {
  const reducedMotion = useReducedMotion();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const update = (field: Field, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
  };
  const validateField = (field: Field) => {
    const result = contactSchema.safeParse(form);
    const issue = result.success ? undefined : result.error.issues.find(item => item.path[0] === field);
    setErrors(current => ({ ...current, [field]: issue?.message }));
  };
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitError("");
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as Field;
        if (!next[field]) next[field] = issue.message;
      }
      setErrors(next);
      const first = result.error.issues[0]?.path[0];
      if (typeof first === "string") document.getElementById(`contact-${first}`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const response = await sendContactMessage({ data: result.data });
      if (!response.ok) { setSubmitError(response.message); setResetKey(value => value + 1); return; }
      setSuccess(true);
      setForm(initial);
    } catch {
      setSubmitError("We could not send your message. Please try again or email info@teevents.golf.");
      setResetKey(value => value + 1);
    } finally { setSubmitting(false); }
  };
  const error = (field: Field) => errors[field] ? <p id={`contact-${field}-error`} className="mt-1 text-sm text-destructive" role="alert">{errors[field]}</p> : null;
  const fieldProps = (field: Field) => ({ id: `contact-${field}`, name: field, "aria-invalid": Boolean(errors[field]), "aria-describedby": errors[field] ? `contact-${field}-error` : undefined, onBlur: () => validateField(field) });

  return (
    <Layout>
      <SEO title="Contact TeeVents | Let's Talk About Your Event" description="Talk to a real TeeVents rep about tournaments, leagues, pricing, partnerships, or event support. New inquiries receive a reply within one business day." path="/contact" />
      <div className="rep-service">
        <section className="relative isolate overflow-hidden bg-primary py-20 text-center text-primary-foreground md:py-24" aria-labelledby="contact-title">
          <img src={servicesBg} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
          <div className="homepage-hero-overlay absolute inset-0 -z-10" />
          <div className="container mx-auto max-w-4xl px-4">
            <p className="text-sm font-semibold tracking-widest text-secondary">CONTACT US</p>
            <h1 id="contact-title" className="mt-4 font-display text-4xl font-bold leading-tight md:text-6xl">Let's Talk About Your Event</h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-foreground/90">Whether you are running your first tournament or your fiftieth, we are here to help. Reach out and a real person will get back to you within one business day.</p>
            <p className="mt-6 font-semibold text-secondary">Free for organizers. A dedicated rep on every event.</p>
          </div>
        </section>

        <div className="bg-background py-16 md:py-20">
          <div className="container mx-auto grid max-w-6xl gap-12 px-4 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
            <section aria-labelledby="message-title" className="min-w-0">
              <h2 id="message-title" className={h2}>Send Us a Message</h2>
              <p className="mb-8 mt-3 text-muted-foreground">Fill out the form and we will get back to you within one business day.</p>
              {success ? (
                <motion.div initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} role="status" className="border-l-4 border-secondary bg-muted p-6">
                  <CheckCircle2 className="mb-4 h-10 w-10 text-primary" aria-hidden="true" />
                  <h3 className="font-display text-2xl font-bold text-primary">Thank you.</h3>
                  <p className="mt-3 text-foreground">Your message has been received. A TeeVents rep will reply within one business day.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div><Label htmlFor="contact-name">Full Name <span aria-hidden="true">*</span></Label><Input {...fieldProps("name")} value={form.name} onChange={event => update("name", event.target.value)} required maxLength={100} autoComplete="name" className="mt-2 h-11" />{error("name")}</div>
                    <div><Label htmlFor="contact-email">Email Address <span aria-hidden="true">*</span></Label><Input {...fieldProps("email")} type="email" value={form.email} onChange={event => update("email", event.target.value)} required maxLength={255} autoComplete="email" className="mt-2 h-11" />{error("email")}</div>
                    <div><Label htmlFor="contact-phone">Phone Number <span aria-hidden="true">*</span></Label><Input {...fieldProps("phone")} type="tel" value={form.phone} onChange={event => update("phone", event.target.value)} required maxLength={30} autoComplete="tel" className="mt-2 h-11" />{error("phone")}</div>
                    <div><Label htmlFor="contact-organization">Organization Name <span className="font-normal text-muted-foreground">(optional)</span></Label><Input {...fieldProps("organization")} value={form.organization} onChange={event => update("organization", event.target.value)} maxLength={150} autoComplete="organization" className="mt-2 h-11" />{error("organization")}</div>
                  </div>
                  <div><Label htmlFor="contact-topic">How can we help? <span aria-hidden="true">*</span></Label><select {...fieldProps("topic")} required value={form.topic} onChange={event => update("topic", event.target.value)} className={`${selectClass} mt-2`}><option value="">Choose an option</option>{contactTopics.map(topic => <option key={topic}>{topic}</option>)}</select>{error("topic")}</div>
                  <div><Label htmlFor="contact-message">Message <span aria-hidden="true">*</span></Label><Textarea {...fieldProps("message")} value={form.message} onChange={event => update("message", event.target.value)} required maxLength={5000} rows={6} className="mt-2 resize-y" />{error("message")}</div>
                  <div><Label htmlFor="contact-source">How did you hear about us? <span className="font-normal text-muted-foreground">(optional)</span></Label><select {...fieldProps("source")} value={form.source} onChange={event => update("source", event.target.value)} className={`${selectClass} mt-2`}><option value="">Choose an option</option>{contactSources.map(source => <option key={source}>{source}</option>)}</select>{error("source")}</div>
                  <div id="contact-captchaToken" tabIndex={-1} aria-label="CAPTCHA" aria-describedby={errors.captchaToken ? "contact-captchaToken-error" : undefined}><ContactCaptcha onToken={token => update("captchaToken", token)} resetKey={resetKey} />{error("captchaToken")}</div>
                  {submitError && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{submitError}</p>}
                  <Button type="submit" variant="secondary" size="lg" disabled={submitting} className="w-full font-bold">{submitting ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Send className="h-4 w-4" />}{submitting ? "SENDING..." : "SEND MESSAGE"}</Button>
                </form>
              )}
            </section>
            <section aria-labelledby="other-contact-title" className="min-w-0">
              <h2 id="other-contact-title" className={h2}>Other Ways to Reach Us</h2>
              <div className="mt-8 space-y-5">
                <article className="rounded-lg border border-border bg-card p-6"><Mail className="mb-4 h-6 w-6 text-primary" aria-hidden="true" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Email</p><h3 className="mt-2 text-xl font-semibold text-primary">General Inquiries</h3><p className="mt-3 font-semibold">info@teevents.golf</p><p className="mt-2 text-muted-foreground">Best for general questions, pricing, and partnership inquiries.</p><Button asChild variant="link" className="mt-3 h-auto p-0"><a href="mailto:info@teevents.golf">Send us an email<ArrowRight className="h-4 w-4" /></a></Button></article>
                <article className="rounded-lg border border-border bg-card p-6"><Phone className="mb-4 h-6 w-6 text-primary" aria-hidden="true" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Phone</p><h3 className="mt-2 text-xl font-semibold text-primary">Speak With Someone</h3><p className="mt-3 font-semibold">(602) 413-1338</p><p className="mt-2 text-muted-foreground">Available Monday through Friday, 9:00 a.m. to 6:00 p.m. Eastern Time.</p><Button asChild variant="link" className="mt-3 h-auto p-0"><a href="tel:+16024131338">Call us<ArrowRight className="h-4 w-4" /></a></Button></article>
                <article className="rounded-lg border border-border bg-card p-6"><MessageCircle className="mb-4 h-6 w-6 text-primary" aria-hidden="true" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Event Support</p><h3 className="mt-2 text-xl font-semibold text-primary">Active Event Support</h3><p className="mt-3 text-muted-foreground">If you are running an event on TeeVents and need urgent help on event day, use the in-platform support messaging. Your dedicated rep monitors it in real time.</p></article>
              </div>
            </section>
          </div>
        </div>

        <section className="bg-muted/40 py-16 md:py-20">
          <div className="container mx-auto max-w-6xl px-4">
            <SectionHead title="What to Expect After You Contact Us" subtitle="We take response times seriously. Here is our commitment." />
            <div className="grid gap-5 md:grid-cols-3">{[{ icon: CalendarCheck, title: "New Inquiries", text: "Responded to within 1 business day" }, { icon: Clock, title: "Active Customers", text: "Responded to within 4 business hours" }, { icon: Headphones, title: "Event Day Support", text: "Monitored in real time during your event" }].map(({ icon: Icon, title, text }) => <article key={title} className="rounded-lg border border-border bg-card p-6"><Icon className="mb-4 h-6 w-6 text-primary" /><h3 className="text-xl font-semibold text-primary">{title}</h3><p className="mt-3 text-muted-foreground">{text}</p></article>)}</div>
            <p className="mx-auto mt-10 max-w-3xl border-l-4 border-secondary bg-primary p-6 text-center text-lg text-primary-foreground">Every event on TeeVents includes a dedicated rep who knows your event and is available before, during, and after the tournament.</p>
          </div>
        </section>

        <section className="bg-background py-16 md:py-20"><div className="container mx-auto max-w-6xl px-4"><SectionHead title="Looking for Something Specific?" subtitle="Jump straight to the page you need." /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{quickLinks.map(({ title, to, icon: Icon }) => <Button asChild key={title} variant="outline" className="h-auto min-h-20 justify-start gap-4 whitespace-normal p-5 text-left"><Link to={to}><Icon className="h-6 w-6 shrink-0 text-primary" /><span className="flex-1 font-semibold">{title}</span><ArrowRight className="h-4 w-4 shrink-0" /></Link></Button>)}</div></div></section>

        <section className="bg-muted/40 py-16 md:py-20"><div className="container mx-auto max-w-6xl px-4"><SectionHead title="Who We Help" subtitle="If you are involved in golf, we have something for you." /><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{[{ icon: Flag, title: "Tournament Organizers", text: "Nonprofits, corporations, schools, churches, clubs, and community groups" }, { icon: Users, title: "Golfers", text: "Players who want to find, register, and score in tournaments" }, { icon: Building2, title: "Golf Courses and Clubs", text: "Facilities looking for a platform to run their events and leagues" }, { icon: Handshake, title: "Partners and Sponsors", text: "Brands and organizations interested in partnering with TeeVents events" }].map(({ icon: Icon, title, text }) => <article key={title} className="rounded-lg border border-border bg-card p-6"><Icon className="mb-4 h-6 w-6 text-primary" /><h3 className="text-xl font-semibold text-primary">{title}</h3><p className="mt-3 text-muted-foreground">{text}</p></article>)}</div></div></section>

        <section className="bg-background py-16 md:py-20"><div className="container mx-auto max-w-3xl px-4 text-center"><Newspaper className="mx-auto mb-5 h-8 w-8 text-primary" /><SectionHead title="Press and Media Inquiries" subtitle="For interviews, press kits, and media requests." /><p className="text-lg text-muted-foreground">If you are a journalist, podcaster, or content creator and would like to feature TeeVents, please email us at info@teevents.golf. We will respond within 2 business days.</p><Button asChild variant="link" className="mt-5"><a href="mailto:info@teevents.golf">info@teevents.golf<Mail className="h-4 w-4" /></a></Button></div></section>

        <section className="bg-muted/40 py-16 md:py-20"><div className="container mx-auto max-w-3xl px-4 text-center"><Handshake className="mx-auto mb-5 h-8 w-8 text-primary" /><SectionHead title="Partnership Inquiries" subtitle="Interested in partnering with TeeVents?" /><p className="text-lg text-muted-foreground">We partner with golf courses, brands, sponsors, and technology providers. If you would like to explore a partnership, email us at info@teevents.golf and tell us a bit about your organization.</p><Button asChild variant="link" className="mt-5"><a href="mailto:info@teevents.golf">info@teevents.golf<Mail className="h-4 w-4" /></a></Button></div></section>

        <FinalCta title="Ready to Get Started Instead?" subtitle="Skip the message and start building your event right now. Free for organizers." />
      </div>
    </Layout>
  );
}
