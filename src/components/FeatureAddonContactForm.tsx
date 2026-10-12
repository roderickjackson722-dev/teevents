import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { startFeatureAddonRequest } from "@/lib/featureAddonRequests.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function FeatureAddonContactForm({ addonKey, amount, divisions }: { addonKey: string; amount: number; divisions: number }) {
  const start = useServerFn(startFeatureAddonRequest);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ eventName: "", contactName: "", contactEmail: "", contactPhone: "", contactNotes: "", discountCode: "" });
  return <form className="space-y-4" onSubmit={async e => {
    e.preventDefault(); setBusy(true);
    try { const result = await start({ data: { ...form, addonKey, divisions } }); window.location.href = result.url; }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not start checkout"); setBusy(false); }
  }}>
    <div><Label htmlFor="feature-event">Event name</Label><Input id="feature-event" required minLength={2} maxLength={200} value={form.eventName} onChange={e => setForm({ ...form, eventName: e.target.value })} /></div>
    <div><Label htmlFor="feature-name">Event contact name</Label><Input id="feature-name" required minLength={2} maxLength={120} autoComplete="name" value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} /></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div><Label htmlFor="feature-email">Event contact email</Label><Input id="feature-email" required type="email" maxLength={254} autoComplete="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} /></div>
      <div><Label htmlFor="feature-phone">Event contact phone</Label><Input id="feature-phone" required type="tel" minLength={7} maxLength={40} autoComplete="tel" value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} /></div>
    </div>
    <div><Label htmlFor="feature-notes">Event link or additional contact details (optional)</Label><Textarea id="feature-notes" maxLength={1000} value={form.contactNotes} onChange={e => setForm({ ...form, contactNotes: e.target.value })} /></div>
    <div><Label htmlFor="feature-discount">Discount code (optional)</Label><Input id="feature-discount" maxLength={50} value={form.discountCode} onChange={e => setForm({ ...form, discountCode: e.target.value })} /></div>
    <Button type="submit" variant="secondary" size="lg" className="w-full" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <CreditCard />}Pay ${(amount / 100).toFixed(0)} with Stripe</Button>
  </form>;
}