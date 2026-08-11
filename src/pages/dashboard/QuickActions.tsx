import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Zap } from "lucide-react";
import { toast } from "sonner";
import { useAdminLink } from "@/hooks/useAdminLink";
import { useOrgContext } from "@/hooks/useOrgContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Eye, Users, ClipboardList, BarChart3, Share2, Wallet, CreditCard, Printer,
} from "lucide-react";

export interface QuickActionDef {
  id: string;
  label: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const QUICK_ACTION_OPTIONS: QuickActionDef[] = [
  { id: "view-tournament", label: "View Tournament Page", url: "", icon: Eye },
  { id: "registration", label: "Registration Management", url: "/dashboard/registration", icon: ClipboardList },
  { id: "players", label: "Players & Pairings", url: "/dashboard/players", icon: Users },
  { id: "leaderboard", label: "Live Leaderboard", url: "/dashboard/leaderboard", icon: BarChart3 },
  { id: "share-promote", label: "Share & Promote", url: "/dashboard/share-promote", icon: Share2 },
  { id: "finances", label: "Finances", url: "/dashboard/finances", icon: Wallet },
  { id: "payout-settings", label: "Payout Settings", url: "/dashboard/payout-settings", icon: CreditCard },
  { id: "printables", label: "Printables", url: "/dashboard/printables", icon: Printer },
];

export const DEFAULT_QUICK_ACTIONS = ["view-tournament", "registration", "players", "leaderboard"];

export const quickActionsStorageKey = (orgId?: string) =>
  `teevents:quick-actions:${orgId || "default"}`;

export function loadQuickActions(orgId?: string): string[] {
  if (typeof window === "undefined") return DEFAULT_QUICK_ACTIONS;
  try {
    const raw = window.localStorage.getItem(quickActionsStorageKey(orgId));
    if (!raw) return DEFAULT_QUICK_ACTIONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_QUICK_ACTIONS;
  } catch {
    return DEFAULT_QUICK_ACTIONS;
  }
}

export default function QuickActionsPage() {
  const { org } = useOrgContext();
  const { buildLink } = useAdminLink();
  const [selected, setSelected] = useState<string[]>(DEFAULT_QUICK_ACTIONS);
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!org) return;
    setSelected(loadQuickActions(org.orgId));
    supabase
      .from("tournaments")
      .select("slug")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => setSlug(data?.[0]?.slug ?? null));
  }, [org]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = () => {
    try {
      window.localStorage.setItem(quickActionsStorageKey(org?.orgId), JSON.stringify(selected));
      window.dispatchEvent(new Event("teevents:quick-actions-changed"));
      toast.success("Quick Actions saved");
    } catch {
      toast.error("Could not save Quick Actions");
    }
  };

  const visible = QUICK_ACTION_OPTIONS.filter((a) => selected.includes(a.id));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Quick Actions</h1>
        <p className="text-muted-foreground mt-1">
          Choose the shortcuts you want in this section.
        </p>
      </div>

      <div className="bg-card rounded-lg border border-border p-6 mb-6">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
            <span className="text-sm font-semibold text-foreground">
              Select actions to appear in the Quick Actions section
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="rounded-lg border border-border divide-y divide-border">
              {QUICK_ACTION_OPTIONS.map((a) => (
                <label key={a.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer">
                  <Checkbox checked={selected.includes(a.id)} onCheckedChange={() => toggle(a.id)} />
                  <a.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{a.label}</span>
                </label>
              ))}
            </div>
            <Button className="mt-4" onClick={save}>Save Quick Actions</Button>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-secondary" />
          <h2 className="text-lg font-display font-bold text-foreground">Your Quick Actions</h2>
        </div>
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No actions selected yet.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {visible.map((a, i) => {
              const to = a.id === "view-tournament" ? (slug ? `/t/${slug}` : null) : buildLink(a.url);
              if (!to) return null;
              return (
                <Button key={a.id} asChild variant={i === 0 ? "default" : "outline"}>
                  <Link to={to}>
                    <a.icon className="h-4 w-4 mr-2" />
                    {a.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
