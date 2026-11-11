import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Code2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const PUBLIC_ORIGIN = "https://www.teevents.golf";

/** Builds the iframe that shows an event's public registration page on another site. */
export function buildEmbedCode(url: string, title: string) {
  const safeTitle = title.replace(/"/g, "&quot;");
  return `<iframe src="${url}" title="${safeTitle} registration" style="width:100%;min-height:1600px;border:0;" loading="lazy" allow="payment"></iframe>`;
}

export function EmbedSettings({ orgId }: { orgId: string }) {
  const [events, setEvents] = useState<{ id: string; title: string; slug: string | null; custom_slug: string | null }[]>([]);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    supabase
      .from("tournaments")
      .select("id, title, slug, custom_slug")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const rows = (data as any[]) || [];
        setEvents(rows);
        if (rows[0]) setSelected(rows[0].id);
      });
  }, [orgId]);

  const event = events.find((e) => e.id === selected);
  const url = useMemo(() => {
    if (!event) return "";
    const slug = event.custom_slug || event.slug || event.id;
    return `${PUBLIC_ORIGIN}/t/${slug}#register`;
  }, [event]);
  const code = event ? buildEmbedCode(url, event.title) : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Embed code copied");
    } catch {
      toast.error("Couldn't copy. Select the code and copy it manually.");
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Code2 className="h-6 w-6 text-primary" />
        <h2 className="text-lg font-display font-bold text-foreground">Embed</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Put your TeeVents registration page on your own website. Your visitors register without leaving your site, and everything still runs through TeeVents, so registration, payments, pairings, and live scoring stay in one place.
      </p>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Create an event first to get its embed code.</p>
      ) : (
        <>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Event</label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="w-full sm:max-w-md"><SelectValue placeholder="Pick an event" /></SelectTrigger>
              <SelectContent>
                {events.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <pre className="whitespace-pre-wrap break-all rounded-md border border-border bg-muted/50 p-3 text-xs font-mono text-foreground">{code}</pre>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={copy} style={{ backgroundColor: "#F5A623", color: "#1a5c38" }}>
                <Copy className="h-4 w-4 mr-1.5" /> Copy Embed Code
              </Button>
              <Button asChild variant="ghost">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1.5" /> View Registration Page
                </a>
              </Button>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-semibold text-foreground">How to add it to your website</p>
            <ul className="space-y-1.5 text-muted-foreground list-disc pl-5">
              <li><b className="text-foreground">WordPress:</b> add a Custom HTML block, paste the code, then publish or update the page.</li>
              <li><b className="text-foreground">Wix:</b> add an Embed a Site element, paste the code, then publish the site.</li>
              <li><b className="text-foreground">Squarespace:</b> add an Embed block, paste the code, then save.</li>
              <li><b className="text-foreground">Any other website:</b> paste the code into an HTML or embed block on the page.</li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">
            Your website keeps its own look and branding around the page. TeeVents still handles registration and payments, and the money goes straight to your Stripe account. The tournament stays managed in TeeVents.
          </p>
        </>
      )}
    </div>
  );
}
