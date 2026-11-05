import { useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import ContactCaptcha from "./ContactCaptcha";
import { submitFullServiceQuote } from "@/lib/fullServiceQuote.functions";
import { quoteAnswersSchema, eventTypes, eventFormats, progressOptions, serviceOptions, budgetOptions } from "@/lib/fullServiceQuote.schema";

const initialForm = { organization: "", contactName: "", email: "", phone: "", eventName: "", eventType: "", eventTypeOther: "", eventDate: "", dateTbd: false, location: "", course: "", courseTbd: false, players: "", eventFormat: "", eventFormatOther: "", progress: "", progressOther: "", services: [] as string[], servicesOther: "", fundraisingGoal: "", budget: "", help: "", contactMethod: "", bestTime: "", consent: false };
type Form = typeof initialForm;
export function FullServiceQuoteForm() {
  const submit = useServerFn(submitFullServiceQuote);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  const [done, setDone] = useState(false), [token, setToken] = useState(""), [resetKey, setResetKey] = useState(0);
  const [requestKey] = useState(() => crypto.randomUUID());
  const update = <K extends keyof Form>(key: K, value: Form[K]) => { setForm(f => ({ ...f, [key]: value })); setErrors(e => ({ ...e, [key]: "" })); };
  const error = (key: string) => errors[key] ? <p id={`quote-${key}-error`} role="alert" className="mt-1 text-sm text-destructive">{errors[key]}</p> : null;
  const text = (key: keyof Form, label: string, required = false, type = "text", disabled = false) => <div className="min-w-0"><Label htmlFor={`quote-${key}`}>{label}{required ? " *" : ""}</Label><Input id={`quote-${key}`} type={type} required={required && !disabled} disabled={disabled} value={String(form[key])} maxLength={key === "email" ? 254 : 300} min={type === "number" ? key === "players" ? 1 : 0 : undefined} step={type === "number" ? key === "players" ? 1 : "any" : undefined} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `quote-${key}-error` : undefined} onChange={e => update(key, e.target.value as Form[typeof key])} />{error(key)}</div>;
  const select = (key: keyof Form, label: string, options: readonly string[], required = false) => <div><Label htmlFor={`quote-${key}`}>{label}{required ? " *" : ""}</Label><Select value={String(form[key]) || undefined} onValueChange={v => update(key, v as Form[typeof key])}><SelectTrigger id={`quote-${key}`} aria-required={required} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `quote-${key}-error` : undefined} className="h-auto min-h-10 whitespace-normal text-left"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{options.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>{error(key)}</div>;
  const check = (key: "dateTbd" | "courseTbd" | "consent", label: string) => <div><label className="flex items-start gap-3 text-sm leading-relaxed" htmlFor={`quote-${key}`}><Checkbox id={`quote-${key}`} checked={form[key]} onCheckedChange={v => update(key, v === true)} aria-required={key === "consent"} aria-invalid={!!errors[key]} className="mt-1 shrink-0" /><span>{label}{key === "consent" ? " *" : ""}</span></label>{error(key)}</div>;
  if (done) return <p role="status" className="py-8 text-lg leading-relaxed text-primary">Thanks, we received your request. Rod will reach out to book a meeting.</p>;
  return <form noValidate className="space-y-5" onSubmit={async e => {
    e.preventDefault(); if (busy) return;
    const parsed = quoteAnswersSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) { const key = String(issue.path[0]); if (!next[key]) next[key] = issue.message; }
      setErrors(next); document.getElementById(`quote-${Object.keys(next)[0]}`)?.focus(); return;
    }
    if (!token) { setErrors({ captcha: "Please complete the CAPTCHA." }); return; }
    setBusy(true); setNotice(""); setErrors({});
    try { const result = await submit({ data: { answers: parsed.data, captchaToken: token, requestKey } }); if (result.ok) setDone(true); else setNotice(result.message); }
    catch { setNotice("Your request could not be confirmed. Please try again or email info@teevents.golf."); }
    finally { setBusy(false); setToken(""); setResetKey(v => v + 1); }
  }}>
    {text("organization", "Organization Name", true)}
    {text("contactName", "Contact Name", true)}
    {text("email", "Email", true, "email")}
    {text("phone", "Phone", false, "tel")}
    {text("eventName", "Event Name", true)}
    {select("eventType", "Event Type", eventTypes, true)}
    {form.eventType === "Other" && text("eventTypeOther", "Other Event Type", true)}
    {text("eventDate", "Event Date", true, "date", form.dateTbd)}
    {check("dateTbd", "Date TBD")}
    {text("location", "Location, City and State", true)}
    {text("course", "Course, if known", false, "text", form.courseTbd)}
    {check("courseTbd", "Course TBD")}
    {text("players", "Expected Number of Players", true, "number")}
    {select("eventFormat", "Event Format, if known", eventFormats)}
    {form.eventFormat === "Other" && text("eventFormatOther", "Other Event Format", true)}
    {select("progress", "How Far Along Are You", progressOptions, true)}
    {form.progress === "Other" && text("progressOther", "Other Progress", true)}
    <fieldset><legend className="mb-3 text-sm font-medium">Services Needed *</legend><div className="space-y-3">{serviceOptions.map((service, index) => <label key={service} className="flex items-start gap-3 text-sm leading-relaxed"><Checkbox id={index === 0 ? "quote-services" : undefined} checked={form.services.includes(service)} onCheckedChange={v => update("services", v === true ? [...form.services, service] : form.services.filter(s => s !== service))} className="mt-1 shrink-0" /><span>{service}</span></label>)}</div>{error("services")}</fieldset>
    {form.services.includes("Other") && text("servicesOther", "Other Services", true)}
    {(form.eventType === "Fundraising" || form.eventType === "Charity") && <div>{text("fundraisingGoal", "Fundraising Goal, if fundraising", false, "number")}<p className="mt-1 text-xs text-muted-foreground">Optional</p></div>}
    {select("budget", "Budget Range for Management", budgetOptions)}
    <div><Label htmlFor="quote-help">What Do You Need Help With Most</Label><Textarea id="quote-help" rows={3} maxLength={500} value={form.help} onChange={e => update("help", e.target.value)} /></div>
    {select("contactMethod", "Preferred Contact Method", ["Email", "Phone"], true)}
    {text("bestTime", "Best Time To Reach You")}
    {check("consent", "I agree TeeVents may contact me about this event")}
    <ContactCaptcha onToken={setToken} resetKey={resetKey} />{error("captcha")}
    {notice && <p role="alert" className="text-sm text-destructive">{notice}</p>}
    <Button type="submit" variant="secondary" size="lg" disabled={busy} className="w-full">{busy && <Loader2 className="animate-spin" />}Request My Quote</Button>
  </form>;
}
export default function FullServiceQuoteDialog({ children }: { children?: ReactNode }) {
  return <Dialog><DialogTrigger asChild>{children || <Button variant="secondary" size="lg">Request a Quote</Button>}</DialogTrigger><DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto p-5 sm:p-8"><DialogHeader className="pr-5"><DialogTitle className="font-display text-2xl leading-tight">Request a Full Service Management Quote</DialogTitle><DialogDescription className="mt-3 leading-relaxed">Tell us about your event, and Rod will reach out to book a meeting. No payment is taken on this form.</DialogDescription></DialogHeader><FullServiceQuoteForm /></DialogContent></Dialog>;
}