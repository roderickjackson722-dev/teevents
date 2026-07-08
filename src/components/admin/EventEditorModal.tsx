import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor, sanitizeHtml } from "@/components/ui/rich-text-editor";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type Tier = {
  id?: string;
  tier_name: string;
  description: string;
  price_cents: number;
  max_quantity: number | null;
  display_order: number;
  sold_quantity?: number;
};

type Question = {
  label: string;
  type: "text" | "email" | "phone" | "select";
  required: boolean;
  options?: string;
};

type EventInput = {
  id?: string;
  event_title: string;
  event_slug: string;
  event_date: string;
  event_time: string;
  location: string;
  address: string;
  hero_image_url: string;
  description_html: string;
  status: string;
  featured: boolean;
  confirmation_email_subject: string;
  confirmation_email_body: string;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const DEFAULT_EMAIL_BODY = `Hi {{buyer_name}},

Thanks for your purchase! Your registration for {{event_title}} is confirmed.

Tickets: {{quantity}} × {{tier_name}}
Total: {{total}}
When: {{event_date}}{{event_time_line}}
Where: {{event_location}}

We look forward to seeing you there.

— The TeeVents Team`;

const empty: EventInput = {
  event_title: "",
  event_slug: "",
  event_date: "",
  event_time: "",
  location: "",
  address: "",
  hero_image_url: "",
  description_html: "",
  status: "draft",
  featured: false,
  confirmation_email_subject: "Your ticket for {{event_title}}",
  confirmation_email_body: DEFAULT_EMAIL_BODY,
};

interface Props {
  event: any | null;
  onClose: () => void;
  onSaved: () => void;
}

const EventEditorModal = ({ event, onClose, onSaved }: Props) => {
  const [data, setData] = useState<EventInput>(empty);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      if (event?.id) {
        const { data: full } = await (supabase as any)
          .from("public_events")
          .select("*, event_ticket_tiers(id, tier_name, description, price_cents, max_quantity, sold_quantity, display_order)")
          .eq("id", event.id)
          .maybeSingle();
        if (full) {
          setData({
            id: full.id,
            event_title: full.event_title,
            event_slug: full.event_slug,
            event_date: full.event_date,
            event_time: full.event_time || "",
            location: full.location || "",
            address: full.address || "",
            hero_image_url: full.hero_image_url || "",
            description_html: full.description_html || "",
            status: full.status,
            featured: full.featured,
            confirmation_email_subject: full.confirmation_email_subject || empty.confirmation_email_subject,
            confirmation_email_body: full.confirmation_email_body || empty.confirmation_email_body,
          });
          const sorted = ((full as any).event_ticket_tiers || []).sort((a: any, b: any) => a.display_order - b.display_order);
          setTiers(sorted);
          setQuestions(Array.isArray(full.purchase_questions) ? full.purchase_questions : []);
        }
      } else {
        setData(empty);
        setTiers([{ tier_name: "General", description: "", price_cents: 0, max_quantity: null, display_order: 0 }]);
        setQuestions([]);
      }
    })();
  }, [event]);


  const updateField = <K extends keyof EventInput>(k: K, v: EventInput[K]) => {
    setData((p) => ({ ...p, [k]: v }));
    if (k === "event_title" && !data.id && !data.event_slug) {
      setData((p) => ({ ...p, event_slug: slugify(String(v)) }));
    }
  };

  const uploadImageToStorage = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `public-events/${crypto.randomUUID()}.${ext}`;
    const { error, data: up } = await supabase.storage.from("event-images").upload(path, file, { upsert: false });
    if (error) {
      const { error: err2, data: up2 } = await supabase.storage.from("tournament-images").upload(path, file, { upsert: false });
      if (err2) throw err2;
      return supabase.storage.from("tournament-images").getPublicUrl(up2.path).data.publicUrl;
    }
    return supabase.storage.from("event-images").getPublicUrl(up.path).data.publicUrl;
  };

  const handleImage = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadImageToStorage(file);
      updateField("hero_image_url", url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const addTier = () => setTiers((p) => [...p, { tier_name: "", description: "", price_cents: 0, max_quantity: null, display_order: p.length }]);
  const removeTier = (idx: number) => setTiers((p) => p.filter((_, i) => i !== idx));
  const updateTier = (idx: number, patch: Partial<Tier>) => setTiers((p) => p.map((t, i) => i === idx ? { ...t, ...patch } : t));

  const addQuestion = () => setQuestions((p) => [...p, { label: "", type: "text", required: false }]);
  const removeQuestion = (idx: number) => setQuestions((p) => p.filter((_, i) => i !== idx));
  const updateQuestion = (idx: number, patch: Partial<Question>) => setQuestions((p) => p.map((q, i) => i === idx ? { ...q, ...patch } : q));

  const handleSave = async () => {
    if (!data.event_title || !data.event_date || !data.event_slug) {
      toast.error("Title, date and slug are required");
      return;
    }
    setSaving(true);
    try {
      const cleanedQuestions = questions
        .filter((q) => q.label.trim())
        .map((q) => ({ label: q.label.trim(), type: q.type, required: !!q.required, options: q.type === "select" ? (q.options || "") : undefined }));

      const payload: any = {
        event_title: data.event_title,
        event_slug: slugify(data.event_slug),
        event_date: data.event_date,
        event_time: data.event_time || null,
        location: data.location || null,
        address: data.address || null,
        hero_image_url: data.hero_image_url || null,
        description_html: data.description_html || null,
        status: data.status,
        featured: data.featured,
        purchase_questions: cleanedQuestions,
        confirmation_email_subject: data.confirmation_email_subject || null,
        confirmation_email_body: data.confirmation_email_body || null,
      };

      let eventId = data.id;
      if (eventId) {
        const { error } = await (supabase as any).from("public_events").update(payload).eq("id", eventId);
        if (error) throw error;
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: inserted, error } = await (supabase as any)
          .from("public_events")
          .insert({ ...payload, created_by: session?.user.id })
          .select("id")
          .single();
        if (error) throw error;
        eventId = inserted.id;
      }


      // Sync tiers
      const { data: existingTiers } = await supabase
        .from("event_ticket_tiers")
        .select("id")
        .eq("event_id", eventId!);
      const existingIds = new Set((existingTiers || []).map((t) => t.id));
      const keptIds = new Set(tiers.filter((t) => t.id).map((t) => t.id!));
      const toDelete = Array.from(existingIds).filter((id) => !keptIds.has(id));
      if (toDelete.length) {
        await supabase.from("event_ticket_tiers").delete().in("id", toDelete);
      }

      for (let i = 0; i < tiers.length; i++) {
        const t = tiers[i];
        const row = {
          event_id: eventId!,
          tier_name: t.tier_name || `Tier ${i + 1}`,
          description: t.description || null,
          price_cents: Math.max(0, Math.round(t.price_cents)),
          max_quantity: t.max_quantity ?? null,
          display_order: i,
        };
        if (t.id) {
          await supabase.from("event_ticket_tiers").update(row).eq("id", t.id);
        } else {
          await supabase.from("event_ticket_tiers").insert(row);
        }
      }

      toast.success("Event saved");
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data.id ? "Edit Event" : "Add Event"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Event Title *</Label>
            <Input value={data.event_title} onChange={(e) => updateField("event_title", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Slug (URL) *</Label>
              <Input value={data.event_slug} onChange={(e) => updateField("event_slug", e.target.value)} placeholder="spring-charity-classic" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={data.status} onValueChange={(v) => updateField("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="sold_out">Sold Out</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date *</Label>
              <Input type="date" value={data.event_date} onChange={(e) => updateField("event_date", e.target.value)} />
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={data.event_time} onChange={(e) => updateField("event_time", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Location (short)</Label>
            <Input value={data.location} onChange={(e) => updateField("location", e.target.value)} placeholder="Pebble Beach, CA" />
          </div>
          <div>
            <Label>Full Address</Label>
            <Input value={data.address} onChange={(e) => updateField("address", e.target.value)} placeholder="1700 17-Mile Dr, Pebble Beach, CA 93953" />
          </div>

          <div>
            <Label>Event Photo</Label>
            <p className="text-xs text-muted-foreground mb-2">
              The full image is displayed on the event page (not cropped). For best results, use a landscape photo up to ~1600px wide.
            </p>
            <div className="flex items-start gap-3">
              <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])} disabled={uploading} />
              {data.hero_image_url && (
                <img src={data.hero_image_url} alt="preview" className="max-h-40 max-w-[240px] object-contain rounded border border-border bg-muted" />
              )}
            </div>
            <Input className="mt-2" value={data.hero_image_url} onChange={(e) => updateField("hero_image_url", e.target.value)} placeholder="Or paste image URL" />
          </div>

          <div>
            <Label>About This Event</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Full formatting: headings, bold/italic/underline, fonts &amp; sizes, colors, highlights, lists, alignment, links, and inline images.
            </p>
            <RichTextEditor
              value={data.description_html}
              onChange={(html) => updateField("description_html", sanitizeHtml(html))}
              onImageUpload={uploadImageToStorage}
              placeholder="Write about your event..."
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={data.featured} onCheckedChange={(v) => updateField("featured", v)} />
            <Label>Featured</Label>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-2">
              <Label>Ticket Tiers</Label>
              <Button size="sm" variant="outline" onClick={addTier}><Plus className="h-3 w-3 mr-1" /> Add Tier</Button>
            </div>
            <div className="space-y-2">
              {tiers.map((t, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start bg-muted/40 p-2 rounded">
                  <Input className="col-span-3" placeholder="Tier name" value={t.tier_name} onChange={(e) => updateTier(i, { tier_name: e.target.value })} />
                  <Input className="col-span-4" placeholder="Description" value={t.description} onChange={(e) => updateTier(i, { description: e.target.value })} />
                  <Input className="col-span-2" type="number" min={0} step="0.01" placeholder="Price" value={t.price_cents / 100} onChange={(e) => updateTier(i, { price_cents: Math.round(Number(e.target.value) * 100) })} />
                  <Input className="col-span-2" type="number" min={0} placeholder="Max" value={t.max_quantity ?? ""} onChange={(e) => updateTier(i, { max_quantity: e.target.value === "" ? null : Number(e.target.value) })} />
                  <Button className="col-span-1" size="icon" variant="ghost" onClick={() => removeTier(i)}><Trash2 className="h-4 w-4" /></Button>
                  {t.sold_quantity !== undefined && t.sold_quantity > 0 && (
                    <div className="col-span-12 text-xs text-muted-foreground pl-1">{t.sold_quantity} sold</div>
                  )}
                </div>
              ))}
              {tiers.length === 0 && <p className="text-sm text-muted-foreground">No ticket tiers yet.</p>}
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-2">
              <Label>Purchase Questions</Label>
              <Button size="sm" variant="outline" onClick={addQuestion}><Plus className="h-3 w-3 mr-1" /> Add Question</Button>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Extra questions asked at checkout (e.g. shirt size, dietary preferences). Answers are saved with the purchase.</p>
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start bg-muted/40 p-2 rounded">
                  <Input className="col-span-5" placeholder="Question" value={q.label} onChange={(e) => updateQuestion(i, { label: e.target.value })} />
                  <Select value={q.type} onValueChange={(v) => updateQuestion(i, { type: v as Question["type"] })}>
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="select">Dropdown</SelectItem>
                    </SelectContent>
                  </Select>
                  <label className="col-span-3 flex items-center gap-2 text-sm">
                    <Switch checked={q.required} onCheckedChange={(v) => updateQuestion(i, { required: v })} />
                    Required
                  </label>
                  <Button className="col-span-1" size="icon" variant="ghost" onClick={() => removeQuestion(i)}><Trash2 className="h-4 w-4" /></Button>
                  {q.type === "select" && (
                    <Input className="col-span-12" placeholder="Options (comma separated, e.g. Small, Medium, Large)" value={q.options || ""} onChange={(e) => updateQuestion(i, { options: e.target.value })} />
                  )}
                </div>
              ))}
              {questions.length === 0 && <p className="text-sm text-muted-foreground">No custom questions.</p>}
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <Label>Confirmation Email</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Sent to the buyer after successful checkout. Placeholders:
              <code className="mx-1 px-1 bg-muted rounded">{"{{buyer_name}}"}</code>
              <code className="mx-1 px-1 bg-muted rounded">{"{{event_title}}"}</code>
              <code className="mx-1 px-1 bg-muted rounded">{"{{event_date}}"}</code>
              <code className="mx-1 px-1 bg-muted rounded">{"{{event_location}}"}</code>
              <code className="mx-1 px-1 bg-muted rounded">{"{{quantity}}"}</code>
              <code className="mx-1 px-1 bg-muted rounded">{"{{tier_name}}"}</code>
              <code className="mx-1 px-1 bg-muted rounded">{"{{total}}"}</code>
            </p>
            <Input
              className="mb-2"
              placeholder="Subject line"
              value={data.confirmation_email_subject}
              onChange={(e) => updateField("confirmation_email_subject", e.target.value)}
            />
            <textarea
              className="w-full min-h-[220px] rounded-md border border-border bg-background p-3 text-sm font-mono"
              value={data.confirmation_email_body}
              onChange={(e) => updateField("confirmation_email_body", e.target.value)}
              placeholder="Email body..."
            />
          </div>
        </div>


        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Event"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventEditorModal;
