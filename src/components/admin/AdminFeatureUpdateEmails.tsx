import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Plus, Trash2, Save, Mail, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
}

const STORAGE_KEY = "admin.featureUpdateEmailTemplates.v1";

const DEFAULT_BODY = `Hi [Organizer Name],

Great news — the feature/update you requested for [Tournament Name] has been completed and is now live!

What was updated:
[Feature Description]

How to access/use it:
Step 1: Log into your TeeVents dashboard at [Dashboard Link]
Step 2: Navigate to [Section Name] → [Subsection]
Step 3: [Instructions]

Need help?
If you have any questions or need assistance, just reply to this email. I'm happy to walk you through it.

Best,
Rod Jackson
TeeVents Golf`;

const DEFAULTS: Template[] = [
  {
    id: "default-feature-update",
    name: "Default Feature Update",
    subject: "✅ Your TeeVents feature update is ready – [Organizer Name]",
    body: DEFAULT_BODY,
  },
  {
    id: "custom-design-update",
    name: "Custom Design Update",
    subject: "✅ Your tournament website updates are live!",
    body: `Hi [Organizer Name],

Your custom website updates for [Tournament Name] are now live!

What we changed:
[Feature Description]

Take a look:
[Dashboard Link]

If you'd like additional tweaks, just reply to this email.

Best,
Rod Jackson
TeeVents Golf`,
  },
];

const PLACEHOLDERS = [
  "[Organizer Name]",
  "[Tournament Name]",
  "[Feature Description]",
  "[Dashboard Link]",
  "[Section Name]",
  "[Subsection]",
  "[Instructions]",
];

function loadTemplates(): Template[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULTS;
}

function saveTemplates(t: Template[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

export default function AdminFeatureUpdateEmails() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [screenshots, setScreenshots] = useState<{ url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = loadTemplates();
    setTemplates(t);
    if (t[0]) setSelectedId(t[0].id);
  }, []);

  const selected = templates.find((t) => t.id === selectedId);

  const updateTemplate = (patch: Partial<Template>) => {
    setTemplates((prev) => {
      const next = prev.map((t) => (t.id === selectedId ? { ...t, ...patch } : t));
      saveTemplates(next);
      return next;
    });
  };

  const addTemplate = () => {
    const id = `tmpl-${Date.now()}`;
    const t: Template = { id, name: "New Template", subject: "", body: DEFAULT_BODY };
    const next = [...templates, t];
    setTemplates(next);
    saveTemplates(next);
    setSelectedId(id);
  };

  const deleteTemplate = () => {
    if (!selected) return;
    if (!confirm(`Delete template "${selected.name}"?`)) return;
    const next = templates.filter((t) => t.id !== selectedId);
    setTemplates(next);
    saveTemplates(next);
    setSelectedId(next[0]?.id || "");
  };

  const applyPlaceholders = (text: string) =>
    PLACEHOLDERS.reduce((acc, p) => {
      const key = p.replace(/[[\]]/g, "");
      const v = values[key];
      return v ? acc.split(p).join(v) : acc;
    }, text);

  const screenshotBlock = screenshots.length
    ? `\n\nScreenshot${screenshots.length > 1 ? "s" : ""}:\n${screenshots.map((s) => s.url).join("\n")}`
    : "";

  const renderedSubject = selected ? applyPlaceholders(selected.subject) : "";
  const renderedBody = selected ? applyPlaceholders(selected.body) + screenshotBlock : "";

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error("Copy failed");
    }
  };

  const copyAll = () => copy(`Subject: ${renderedSubject}\n\n${renderedBody}`, "Email");

  const openMail = () => {
    const to = values["Recipient Email"] || "";
    // Some clients truncate very long mailto bodies — keep the body but warn.
    const MAX = 1800;
    let body = renderedBody;
    if (body.length > MAX) {
      body = body.slice(0, MAX) + "\n\n[Body truncated — full version copied to clipboard]";
      navigator.clipboard.writeText(renderedBody).catch(() => {});
      toast.message("Body was long — full version copied to clipboard");
    }
    const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(renderedSubject)}&body=${encodeURIComponent(body)}`;
    // Use a real anchor click so the browser hands the URL to the OS mail handler
    const a = document.createElement("a");
    a.href = href;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const insertPlaceholder = (p: string) => {
    if (!selected) return;
    updateTemplate({ body: selected.body + (selected.body.endsWith("\n") ? "" : " ") + p });
  };

  const handleUploadScreenshot = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `feature-update-emails/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("tournament-assets").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("tournament-assets").getPublicUrl(path);
      setScreenshots((prev) => [...prev, { url: data.publicUrl, name: file.name }]);
      toast.success("Screenshot uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold flex items-center gap-2">
          <Mail className="h-6 w-6" /> Feature Update Email Templates
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Notify organizers when their requested features or updates are complete. Edit templates, fill in placeholders, and copy to your email client.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Template list + editor */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Templates</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={addTemplate}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
              <Button size="sm" variant="outline" onClick={deleteTemplate} disabled={!selected || templates.length <= 1}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue placeholder="Choose a template" /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selected && (
              <>
                <div>
                  <Label>Template Name</Label>
                  <Input value={selected.name} onChange={(e) => updateTemplate({ name: e.target.value })} />
                </div>
                <div>
                  <Label>Subject</Label>
                  <Input value={selected.subject} onChange={(e) => updateTemplate({ subject: e.target.value })} />
                </div>
                <div>
                  <Label>Body</Label>
                  <Textarea
                    value={selected.body}
                    onChange={(e) => updateTemplate({ body: e.target.value })}
                    className="min-h-[320px] font-mono text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Insert placeholder</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {PLACEHOLDERS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => insertPlaceholder(p)}
                        className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/70 border border-border"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                  <Save className="h-3 w-3" /> Changes saved automatically
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right: Fill placeholders + preview + copy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personalize & Send</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Recipient Email (optional, for "Send Email" button)</Label>
              <Input
                value={values["Recipient Email"] || ""}
                onChange={(e) => setValues({ ...values, "Recipient Email": e.target.value })}
                placeholder="organizer@example.com"
              />
            </div>
            {PLACEHOLDERS.map((p) => {
              const key = p.replace(/[[\]]/g, "");
              const isLong = key === "Feature Description" || key === "Instructions";
              return (
                <div key={p}>
                  <Label>{key}</Label>
                  {isLong ? (
                    <Textarea
                      value={values[key] || ""}
                      onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                      className="min-h-[80px]"
                    />
                  ) : (
                    <Input
                      value={values[key] || ""}
                      onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                    />
                  )}
                </div>
              );
            })}

            <div className="pt-3 border-t border-border space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Screenshots (optional)
              </Label>
              <p className="text-xs text-muted-foreground">
                Upload screenshots showing the update. Public image links are appended to the email body so the organizer can view them.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadScreenshot(f);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-1" />}
                {uploading ? "Uploading..." : "Add Screenshot"}
              </Button>
              {screenshots.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                  {screenshots.map((s, i) => (
                    <div key={s.url} className="relative group border border-border rounded overflow-hidden">
                      <img src={s.url} alt={s.name} className="w-full h-24 object-cover" />
                      <button
                        type="button"
                        onClick={() => setScreenshots((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 bg-background/90 border border-border rounded p-0.5"
                        aria-label="Remove screenshot"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(s.url); toast.success("URL copied"); }}
                        className="absolute bottom-1 right-1 bg-background/90 border border-border rounded px-1.5 py-0.5 text-[10px]"
                      >
                        Copy URL
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>



            <div className="pt-3 border-t border-border space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Preview</Label>
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm space-y-2">
                <div><span className="font-semibold">Subject:</span> {renderedSubject}</div>
                <pre className="whitespace-pre-wrap font-sans text-sm">{renderedBody}</pre>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={copyAll} variant="default">
                  <Copy className="h-4 w-4 mr-1" /> Copy to Clipboard
                </Button>
                <Button onClick={() => copy(renderedSubject, "Subject")} variant="outline" size="sm">
                  Copy Subject
                </Button>
                <Button onClick={() => copy(renderedBody, "Body")} variant="outline" size="sm">
                  Copy Body
                </Button>
                <Button onClick={openMail} variant="outline">
                  <Mail className="h-4 w-4 mr-1" /> Open in Email Client
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
