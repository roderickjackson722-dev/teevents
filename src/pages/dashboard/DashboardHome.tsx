import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useAdminLink } from "@/hooks/useAdminLink";
import { useSetupChecklist } from "@/hooks/useSetupChecklist";
import { ArrowRight, CheckCircle2, Clock, Package, Pin, PinOff, Rocket, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import UpgradeToProBanner from "@/components/UpgradeToProBanner";
import ToolboxDashboardWidgets from "@/components/toolbox/ToolboxDashboardWidgets";
import OrganizerNotes from "@/pages/dashboard/OrganizerNotes";
import { QUICK_ACTION_OPTIONS, quickActionsStorageKey } from "@/pages/dashboard/QuickActions";
import { itemCount, loadToolbox } from "@/lib/organizerToolbox";
import { sortTournamentsForPicker } from "@/lib/tournamentOrder";
import { toast } from "sonner";

interface Tournament {
  id: string;
  slug: string | null;
  title: string;
  date: string | null;
  is_pro?: boolean;
}

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const diff = new Date(dateStr + "T08:00:00").getTime() - Date.now();
  return diff <= 0 ? 0 : Math.ceil(diff / 86400000);
}

/** Smart defaults: early in setup, surface setup shortcuts; later, event-day tools. */
function smartDefaults(percent: number): string[] {
  if (percent < 50) return ["registration", "view-tournament", "share-promote", "payout-settings"];
  return ["players", "leaderboard", "printables", "finances"];
}

function readPinned(orgId?: string): string[] | null {
  try {
    const raw = localStorage.getItem(quickActionsStorageKey(orgId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

const DashboardHome = () => {
  const { org } = useOrgContext();
  const { buildLink } = useAdminLink();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [current, setCurrent] = useState<Tournament | null>(null);
  const [toolboxCount, setToolboxCount] = useState<number | null>(null);
  const [pinned, setPinned] = useState<string[] | null>(null);
  const [editingPins, setEditingPins] = useState(false);

  // Verify Pro upgrade after Stripe redirect
  useEffect(() => {
    const sessionId = searchParams.get("upgrade_session_id");
    if (!sessionId) return;
    (async () => {
      const { data, error } = await supabase.functions.invoke("verify-pro-upgrade", {
        body: { session_id: sessionId },
      });
      if (!error && data?.verified) {
        toast.success("🎉 Pro features unlocked for this tournament!");
      } else if (error) {
        toast.error("Could not verify Pro upgrade. Please contact support.");
      }
      const next = new URLSearchParams(searchParams);
      next.delete("upgrade_session_id");
      next.delete("tournament_id");
      setSearchParams(next, { replace: true });
    })();
  }, [searchParams, setSearchParams]);

  const explicitTournamentId = searchParams.get("tournament_id");

  useEffect(() => {
    if (!org) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, slug, title, date, is_pro")
        .eq("organization_id", org.orgId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const list = (data || []) as Tournament[];
      setTournaments(list);
      // Same rule as before: explicit ?tournament_id= first, else the newest event.
      setCurrent(list.find((t) => t.id === explicitTournamentId) || list[0] || null);
    })();
    loadToolbox(org.orgId).then((t) => { if (!cancelled) setToolboxCount(itemCount(t ?? null)); });
    setPinned(readPinned(org.orgId));
    return () => { cancelled = true; };
  }, [org, explicitTournamentId]);

  const { items, percent, completed, total, recompute, loading } = useSetupChecklist(current?.id);
  useEffect(() => {
    if (current?.id) recompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const nextItem = useMemo(() => items.find((i) => i.status !== "completed") || null, [items]);
  const nextLink = nextItem?.link && current ? nextItem.link.replace(/\{tid\}/g, current.id) : "/dashboard/setup-checklist";
  const days = daysUntil(current?.date ?? null);

  const activeIds = pinned ?? smartDefaults(percent);
  const togglePin = (id: string) => {
    const base = pinned ?? smartDefaults(percent);
    const next = base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
    setPinned(next);
    try {
      localStorage.setItem(quickActionsStorageKey(org?.orgId), JSON.stringify(next));
      window.dispatchEvent(new Event("teevents:quick-actions-changed"));
    } catch { /* ignore */ }
  };

  const selectTournament = (id: string) => {
    try { localStorage.setItem("selectedTournamentId", id); } catch { /* ignore */ }
    const next = new URLSearchParams(searchParams);
    next.set("tournament_id", id);
    setSearchParams(next, { replace: true });
  };

  const sortedTournaments = useMemo(
    () => sortTournamentsForPicker(tournaments as any) as unknown as Tournament[],
    [tournaments],
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {org && <ToolboxDashboardWidgets orgId={org.orgId} hasTournament={tournaments.length > 0} redirectOnly />}

      {/* 1 + 2: Next Step card with one overall progress bar */}
      <section className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-lg sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-secondary">Next Step</p>
        {!current ? (
          <>
            <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Create your first tournament</h1>
            <Button asChild variant="secondary" size="lg" className="mt-5 font-semibold">
              <Link to={buildLink("/dashboard/tournaments")}>Continue <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </>
        ) : (
          <>
            <h1 className="mt-2 font-display text-2xl font-bold leading-snug sm:text-3xl">
              {loading
                ? "Loading your setup…"
                : nextItem
                  ? <>You're {percent}% done. Next: {nextItem.task_name}</>
                  : <>You're 100% done. Every setup task is complete.</>}
            </h1>
            {nextItem?.description && (
              <p className="mt-2 text-sm text-primary-foreground/80 sm:text-base">{nextItem.description}</p>
            )}
            <div className="mt-5 flex items-center gap-3">
              <Progress value={percent} className="h-2.5 flex-1 bg-primary-foreground/20" aria-label="Event setup progress" />
              <span className="shrink-0 text-sm font-semibold">{completed} of {total}</span>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button asChild variant="secondary" size="lg" className="w-full font-semibold sm:w-auto">
                <Link to={nextItem ? nextLink : buildLink("/dashboard/setup-checklist")}>
                  Continue <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-primary-foreground/80">
                <Link to={buildLink("/dashboard/setup-checklist")} className="inline-flex items-center gap-1 hover:text-primary-foreground hover:underline">
                  <CheckCircle2 className="h-4 w-4" /> Full checklist
                </Link>
                <Link to={buildLink("/dashboard/getting-started")} className="inline-flex items-center gap-1 hover:text-primary-foreground hover:underline">
                  <Rocket className="h-4 w-4" /> Getting Started
                </Link>
                <Link to={buildLink("/dashboard/toolbox")} className="inline-flex items-center gap-1 hover:text-primary-foreground hover:underline">
                  <Package className="h-4 w-4" /> Toolbox{toolboxCount !== null ? `: ${toolboxCount} uploaded` : ""}
                </Link>
                {days !== null && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-4 w-4" /> {days === 0 ? "Event day" : `${days} days to go`}
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      {/* 3: Quick Actions with inline pin/unpin */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex min-w-0 items-center gap-2 font-display text-lg font-bold">
            <Zap className="h-5 w-5 shrink-0 text-secondary" /> Quick Actions
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setEditingPins((v) => !v)}>
            {editingPins ? "Done" : "Edit pins"}
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(editingPins ? QUICK_ACTION_OPTIONS : QUICK_ACTION_OPTIONS.filter((a) => activeIds.includes(a.id))).map((a) => {
            const isPinned = activeIds.includes(a.id);
            const to = a.id === "view-tournament" ? (current?.slug ? `/t/${current.slug}` : null) : buildLink(a.url);
            if (editingPins) {
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => togglePin(a.id)}
                  aria-pressed={isPinned}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors ${isPinned ? "border-secondary bg-secondary/10" : "border-border hover:bg-muted/50"}`}
                >
                  <a.icon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">{a.label}</span>
                  {isPinned ? <Pin className="h-4 w-4 shrink-0 text-secondary" /> : <PinOff className="h-4 w-4 shrink-0 text-muted-foreground" />}
                </button>
              );
            }
            if (!to) return null;
            return (
              <Link
                key={a.id}
                to={to}
                className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium transition-colors hover:border-secondary hover:bg-muted/40"
              >
                <a.icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">{a.label}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
        {!pinned && !editingPins && (
          <p className="mt-3 text-xs text-muted-foreground">Suggested for where you are in setup. Use Edit pins to choose your own.</p>
        )}
      </section>

      {/* 4: Notes & Reminders */}
      <section className="rounded-xl border border-border bg-card p-5">
        <OrganizerNotes embedded forcedTournamentId={current?.id} />
      </section>

      {/* Tournaments list: picking one sets the current event for every screen */}
      {sortedTournaments.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
            <Trophy className="h-5 w-5 shrink-0 text-primary" /> Your Tournaments
          </h2>
          <ul className="divide-y divide-border">
            {sortedTournaments.map((t) => {
              const isCurrent = t.id === current?.id;
              return (
                <li key={t.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-foreground">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.date ? new Date(t.date + "T00:00:00").toLocaleDateString() : "No date set"}
                    </p>
                  </div>
                  {isCurrent ? (
                    <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-secondary">Current</span>
                  ) : (
                    <Button variant="ghost" size="sm" className="shrink-0 self-start sm:self-auto" onClick={() => selectTournament(t.id)}>
                      Open
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          <Link to={buildLink("/dashboard/tournaments")} className="mt-2 inline-block text-sm text-primary hover:underline">
            Manage tournaments
          </Link>
        </section>
      )}

      {current && !current.is_pro && (
        <UpgradeToProBanner tournamentId={current.id} tournamentTitle={current.title} />
      )}
    </div>
  );
};

export default DashboardHome;
