import { useEffect, useState } from "react";
import {
  LayoutDashboard, Trophy, ClipboardCheck, Users,
  DollarSign, Wallet, Award, ShoppingBag, Settings, LogOut, ShoppingCart,
  BarChart3, ScanLine, Gavel, ImageIcon, UserCheck, ClipboardList, Heart,
  CreditCard, Share2, FileEdit, Printer, PenLine, Mail, HelpCircle,
  MapPin, Sliders, Search as SearchIcon, FileText, Megaphone,
  Building2, Store, Target, BedDouble, Ticket, Eye, Activity, ContactRound, LayoutTemplate, Receipt, Gauge,
  Clock, ChevronDown,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoWhite from "@/assets/logo-white.png";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { useOrgContext } from "@/hooks/useOrgContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";


const FEATURE_PERMISSION_MAP: Record<string, string> = {
  registration: "manage_registration",
  players: "manage_players",
  "check-in": "manage_check_in",
  leaderboard: "manage_leaderboard",
  "email-messaging": "manage_messages",
  budget: "manage_budget",
  sponsors: "manage_sponsors",
  store: "manage_store",
  auction: "manage_auction",
  gallery: "manage_gallery",
  volunteers: "manage_volunteers",
  surveys: "manage_surveys",
  donations: "manage_donations",
};

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  feature: string | null;
  description?: string;
}

interface SidebarCategory {
  label: string;
  color: string;
  items: NavItem[];
}

// Simplified, phase-based navigation. Consolidated categories (2026 reorg).
// NOTE: no routes were removed — consolidated pages are still reachable by URL
// and from within the pages they now live under.
const categories: SidebarCategory[] = [
  {
    label: "Event",
    color: "border-l-secondary bg-secondary/5",
    items: [
      { title: "Overview", url: "/dashboard", icon: LayoutDashboard, feature: null, description: "Dashboard home: planning guide, setup checklist, and event snapshot" },
      { title: "Event Details", url: "/dashboard/tournaments", icon: Trophy, feature: null, description: "Event info, organization details, and lodging" },
      { title: "Schedule (Tee Sheet)", url: "/dashboard/players?tab=pairings", icon: Clock, feature: "players", description: "Tee sheet: groups, tee times, and starting holes" },
      { title: "Course Setup", url: "/dashboard/course-details", icon: MapPin, feature: null, description: "Par, slope, rating, hole data" },
      { title: "Notes & Reminders", url: "/dashboard/notes", icon: FileText, feature: null, description: "Personal to-do list, reminders, and notes for this tournament" },
    ],

  },
  {
    label: "Players & Pairings",
    color: "border-l-blue-400 bg-blue-400/5",
    items: [
      { title: "Roster", url: "/dashboard/players", icon: Users, feature: "players", description: "View, edit, and import players" },
      { title: "Pairings", url: "/dashboard/players?tab=pairings", icon: Users, feature: "players", description: "Groups, tee times, and starting holes" },
      { title: "Registration Management", url: "/dashboard/registration", icon: FileEdit, feature: "registration", description: "Custom fields, captain label, required toggles, fee model" },
      { title: "Check-In", url: "/dashboard/check-in", icon: ScanLine, feature: "check-in", description: "QR code scanning, manual check‑in" },
      { title: "Waitlist", url: "/dashboard/waitlist", icon: ClipboardList, feature: null, description: "Manage queue, offer spots" },
      { title: "Missing Age Records", url: "/dashboard/missing-ages", icon: Mail, feature: null, description: "Find registrations without an age and request it by email" },
    ],
  },
  {
    label: "Scoring & Leaderboard",
    color: "border-l-orange-400 bg-orange-400/5",
    items: [
      { title: "Live Leaderboard", url: "/dashboard/leaderboard", icon: BarChart3, feature: "leaderboard", description: "Design, share, and manage the live leaderboard" },
      { title: "Score Entry", url: "/dashboard/scoring", icon: PenLine, feature: "leaderboard", description: "Enter scores for groups" },
      { title: "Scoring Settings", url: "/dashboard/scoring-payouts", icon: Sliders, feature: null, description: "Scoring format, handicap allowances, skins, flights, and payouts" },
      { title: "Printables", url: "/dashboard/printables", icon: Printer, feature: null, description: "Scorecards, cart signs, name badges" },
      
      { title: "Event Day Sales", url: "/dashboard/event-day-sales", icon: ShoppingCart, feature: null, description: "Walk‑up registrations, mulligans, contests, custom items with QR codes" },
      { title: "Stress Test", url: "/dashboard/stress-test", icon: Gauge, feature: null, description: "Simulate 70 players to test check-in, scoring, and leaderboard load" },
    ],
  },
  {
    label: "Sponsors & Fundraising",
    color: "border-l-purple-400 bg-purple-400/5",
    items: [
      { title: "Sponsors", url: "/dashboard/sponsors", icon: Award, feature: null, description: "Sponsor levels, prices, benefits, logos, and vendors" },
      { title: "Vendors", url: "/dashboard/vendors", icon: Store, feature: null, description: "Vendor booths: packages, registrations, documents, and hole locations" },
      { title: "Donations", url: "/dashboard/donations", icon: Heart, feature: "donations", description: "Track fundraising, tax receipts" },
      { title: "Auctions", url: "/dashboard/auctions", icon: Gavel, feature: "auction", description: "Silent auction items, bidding, winners" },
      { title: "Raffles", url: "/dashboard/raffles", icon: Ticket, feature: "auction", description: "50/50, prize raffles, auto‑draw" },
      { title: "Add On Store", url: "/dashboard/store", icon: ShoppingBag, feature: "store", description: "Merchandise, mulligans, side events, extras" },
    ],
  },
  {
    label: "Marketing",
    color: "border-l-green-400 bg-green-400/5",
    items: [
      { title: "Share & Promote", url: "/dashboard/share-promote", icon: Share2, feature: null, description: "QR codes, short URLs, social templates" },
      { title: "Flyer Studio", url: "/dashboard/flyer-studio", icon: Megaphone, feature: "flyer-studio", description: "Canva‑integrated flyers" },
      { title: "Email Templates", url: "/dashboard/email-templates", icon: Mail, feature: null, description: "Customize confirmation and reminder emails and send them" },
      { title: "Email Send Log", url: "/dashboard/email-log", icon: Mail, feature: null, description: "See every email sent, delivery results, and resend failures" },
      { title: "Public Search", url: "/dashboard/public-search", icon: SearchIcon, feature: null, description: "Opt in/out of teevents.golf search" },
    ],
  },
  {
    label: "Finances",
    color: "border-l-yellow-400 bg-yellow-400/5",
    items: [
      { title: "Transactions", url: "/dashboard/finances", icon: Wallet, feature: null, description: "Transaction history, revenue, expenses" },
      { title: "Transaction Details", url: "/dashboard/transactions", icon: Receipt, feature: null, description: "Full transaction list with all submission answers + CSV export" },
      { title: "Payouts", url: "/dashboard/payout-settings", icon: CreditCard, feature: null, description: "Stripe Connect, PayPal, check" },
      { title: "Budget", url: "/dashboard/budget", icon: DollarSign, feature: "budget", description: "Planned vs. actual expenses" },
      { title: "Director Shop", url: "/dashboard/director-shop", icon: ShoppingCart, feature: null, description: "Consulting, signage, insurance" },
    ],
  },
  {
    label: "Team & Volunteers",
    color: "border-l-sky-400 bg-sky-400/5",
    items: [
      { title: "Team Members", url: "/dashboard/team", icon: Building2, feature: null, description: "Add staff, assign roles, track referral performance" },
      { title: "Volunteers", url: "/dashboard/volunteers", icon: UserCheck, feature: "volunteers", description: "Shift scheduling, QR check‑in" },
      { title: "Team HQ", url: "/dashboard/team-hq", icon: Users, feature: null, description: "Control the mobile team homepage players open on event day" },
      { title: "CRM", url: "/dashboard/crm", icon: ContactRound, feature: null, description: "Prospects, communications, tasks, audit log" },
    ],
  },
  {
    label: "Content & Media",
    color: "border-l-emerald-400 bg-emerald-400/5",
    items: [
      // "View Live Tournament Page" injected dynamically when a tournament slug exists
      { title: "Public Page Editor", url: "/dashboard/public-page-editor", icon: Trophy, feature: null, description: "Edit your public tournament page: branding, content, contact, domain" },
      { title: "Webpage Layout", url: "/dashboard/webpage-layout", icon: LayoutTemplate, feature: null, description: "Reorder and show/hide sections and top-nav tabs on your public page" },
      { title: "Photo Gallery", url: "/dashboard/gallery", icon: ImageIcon, feature: "gallery", description: "Upload, organize, share event photos" },
      { title: "Media Clips", url: "/dashboard/media", icon: ImageIcon, feature: null, description: "Video highlights, sponsor interviews" },
    ],
  },
  {
    label: "Post-Event",
    color: "border-l-pink-400 bg-pink-400/5",
    items: [
      { title: "Surveys & Feedback", url: "/dashboard/surveys", icon: ClipboardList, feature: "surveys", description: "Post‑event player surveys and email templates" },
    ],
  },
];


const leagueCategories: SidebarCategory[] = [
  {
    label: "League Management",
    color: "border-l-emerald-400 bg-emerald-400/5",
    items: [
      { title: "All Leagues", url: "/dashboard/leagues", icon: Trophy, feature: null, description: "View and manage all your leagues" },
    ],
  },
  {
    label: "Finance",
    color: "border-l-yellow-400 bg-yellow-400/5",
    items: [
      { title: "Payout Settings", url: "/dashboard/payout-settings", icon: CreditCard, feature: null, description: "Connect Stripe to collect league fees (5% platform fee)" },
    ],
  },
];

const settingsItems: NavItem[] = [
  { title: "General Settings", url: "/dashboard/settings", icon: Settings, feature: null, description: "Branding, custom domain, public page tabs" },
];

export function DashboardSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const location = useLocation();
  const isLeagueWorkspace = location.pathname.startsWith("/dashboard/leagues");
  const activeCategories = isLeagueWorkspace ? leagueCategories : categories;
  const { hasFeature, requiredPlan } = usePlanFeatures();
  const { org } = useOrgContext();
  const [searchParams] = useSearchParams();
  const [tournamentSlug, setTournamentSlug] = useState<string | null>(null);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});


  // Context params that identify WHICH event/org the dashboard is showing.
  // Every sidebar link must carry them, otherwise navigating a tab falls back
  // to the org's most recent tournament (wrong event on sample/demo links).
  const selectedTournamentId = searchParams.get("tournament_id");
  const contextQuery = (() => {
    const keep = new URLSearchParams();
    for (const key of ["admin_org", "sample_org", "sample", "tournament_id"]) {
      const v = searchParams.get(key);
      if (v) keep.set(key, v);
    }
    return keep.toString();
  })();
  const withContext = (url: string) => {
    if (!contextQuery || !url.startsWith("/dashboard")) return url;
    return `${url}${url.includes("?") ? "&" : "?"}${contextQuery}`;
  };

  useEffect(() => {
    if (!org) { setTournamentSlug(null); return; }
    // When a specific tournament is selected, its slug drives the public page
    // link — never the org's latest tournament.
    if (selectedTournamentId) {
      supabase
        .from("tournaments")
        .select("slug")
        .eq("id", selectedTournamentId)
        .maybeSingle()
        .then(({ data }) => setTournamentSlug((data as any)?.slug ?? null));
      return;
    }
    supabase
      .from("tournaments")
      .select("slug")
      .eq("organization_id", org.orgId)
      .not("slug", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setTournamentSlug((data as any)?.slug ?? null));
  }, [org, selectedTournamentId]);

  const isOwner = !org || org.role === "owner";
  const permissions = org?.permissions || [];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isVisible = (item: NavItem) => {
    if (isOwner) return true;
    const permKey = item.feature ? FEATURE_PERMISSION_MAP[item.feature] : null;
    if (!permKey) return true;
    return permissions.includes(permKey);
  };

  // ---- Active-state detection -------------------------------------------
  // A link is active when its pathname matches AND (if the link carries a
  // ?tab= value) the current tab matches. Overview only matches exactly.
  const currentTab = searchParams.get("tab");
  const isItemActive = (url: string) => {
    if (!url.startsWith("/dashboard")) return false;
    const [path, query] = url.split("?");
    const linkTab = query ? new URLSearchParams(query).get("tab") : null;
    const pathMatches =
      path === "/dashboard"
        ? location.pathname === "/dashboard"
        : location.pathname === path || location.pathname.startsWith(`${path}/`);
    if (!pathMatches) return false;
    if (linkTab) return currentTab === linkTab;
    // A tab-less link stays active only when no sibling tab link owns the tab
    return !currentTab || !items_withTab(path).includes(currentTab);
  };
  // Tabs that other sidebar links claim for this same path
  const items_withTab = (path: string) =>
    activeCategories
      .flatMap((c) => c.items)
      .map((i) => i.url.split("?"))
      .filter(([p, q]) => p === path && q)
      .map(([, q]) => new URLSearchParams(q).get("tab") as string);

  // Keep the category holding the current page expanded so the selected item
  // is always reachable, even after the organizer collapsed other groups.
  useEffect(() => {
    const activeCat = activeCategories.find((c) => c.items.some((i) => isItemActive(i.url)));
    if (activeCat) {
      setOpenCategories((prev) =>
        prev[activeCat.label] === false ? { ...prev, [activeCat.label]: true } : prev,
      );
    }
  }, [location.pathname, currentTab, isLeagueWorkspace]);



  const renderItem = (item: NavItem) => {
    const locked = item.feature && !hasFeature(item.feature);
    const tier = item.feature ? requiredPlan(item.feature) : "";
    const tierLabel = tier === "starter" ? "Starter" : tier === "premium" ? "Premium" : "";
    const active = isItemActive(item.url);

    const linkContent = (
      <NavLink
        to={withContext(item.url)}
        end={item.url === "/dashboard"}
        onClick={() => { if (isMobile) setOpenMobile(false); }}
        aria-current={active ? "page" : undefined}
        className={
          active
            ? "flex items-center w-full rounded-md bg-secondary/20 text-secondary font-semibold border-l-2 border-secondary pl-1.5"
            : "flex items-center w-full rounded-md text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
        }
      >
        <item.icon className="mr-2 h-4 w-4 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.title}</span>
            {locked && tierLabel && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-secondary/20 text-secondary ml-1 flex-shrink-0">
                {tierLabel}
              </span>
            )}
          </>
        )}
      </NavLink>
    );

    return (
      <SidebarMenuItem key={`${item.title}-${item.url}`}>
        <SidebarMenuButton asChild isActive={active}>
          {item.description ? (
            <Tooltip>
              <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                <p className="text-xs">{item.description}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            linkContent
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const showSettings = isOwner || permissions.includes("manage_settings");

  return (
    <TooltipProvider delayDuration={300}>
      <Sidebar collapsible="icon" className="border-r border-border">
        <SidebarContent className="bg-primary text-primary-foreground">
          <div className="flex items-center gap-3 p-4 border-b border-primary-foreground/10">
            <img src={logoWhite} alt="TeeVents" className="h-8 w-8 object-contain flex-shrink-0" />
            {!collapsed && (
              <span className="font-display text-lg font-semibold tracking-wide">TeeVents</span>
            )}
          </div>

          {activeCategories.map((cat) => {
            let items = cat.items;
            if (cat.label === "Content & Media" && tournamentSlug) {
              items = [
                { title: "View Live Tournament Page", url: `/t/${tournamentSlug}`, icon: Eye, feature: null, description: "View your live tournament webpage" },
                ...cat.items,
              ];
            }
            const visibleItems = items.filter(isVisible);
            if (visibleItems.length === 0) return null;

            const categoryActive = visibleItems.some((i) => isItemActive(i.url));
            const bgClass = cat.color.split(" ").find((c) => c.startsWith("bg-")) ?? "";
            const borderClass = cat.color.split(" ").find((c) => c.startsWith("border-l-")) ?? "";

            return (
              <Collapsible
                key={cat.label}
                open={openCategories[cat.label] ?? true}
                onOpenChange={(open) =>
                  setOpenCategories((prev) => ({ ...prev, [cat.label]: open }))
                }
              >
                <SidebarGroup
                  className={`${bgClass} rounded-md mx-1 ${categoryActive ? "ring-1 ring-secondary/40" : ""}`}
                >
                  <div className={`border-l-2 ${borderClass} ml-1 pl-2`}>
                    <CollapsibleTrigger asChild>
                      <SidebarGroupLabel
                        className={`group/label flex w-full cursor-pointer items-center justify-between text-[10px] tracking-widest uppercase font-semibold ${
                          categoryActive ? "text-secondary" : "text-primary-foreground/60"
                        }`}
                      >
                        <span className="truncate">{collapsed ? "" : cat.label}</span>
                        {!collapsed && (
                          <ChevronDown
                            className={`h-3 w-3 flex-shrink-0 transition-transform ${
                              (openCategories[cat.label] ?? true) ? "" : "-rotate-90"
                            }`}
                          />
                        )}
                      </SidebarGroupLabel>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>{visibleItems.map(renderItem)}</SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            );
          })}


          {showSettings && !isLeagueWorkspace && (
            <SidebarGroup>
              <div className="border-l-2 border-l-gray-400 ml-2 pl-2">
                <SidebarGroupLabel className="text-primary-foreground/50 text-[10px] tracking-widest uppercase font-semibold">
                  {collapsed ? "" : "Settings"}
                </SidebarGroupLabel>
              </div>
              <SidebarGroupContent>
                <SidebarMenu>
                  {settingsItems.map(renderItem)}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <a
                        href="/help"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground flex items-center"
                      >
                        <HelpCircle className="mr-2 h-4 w-4" />
                        {!collapsed && <span>Help Center</span>}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/dashboard/activity-log"
                        className="text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground flex items-center"
                        activeClassName="bg-primary-foreground/15 text-primary-foreground"
                      >
                        <Activity className="mr-2 h-4 w-4" />
                        {!collapsed && <span>Activity Log</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="bg-primary border-t border-primary-foreground/10 p-3 space-y-2">
          <button
            onClick={async () => {
              const { decideWorkspaceSwitch } = await import("@/lib/workspaceSwitch");
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) { navigate("/select-workspace"); return; }
              const { data: memberships } = await supabase
                .from("org_members")
                .select("organization_id, organizations(workspace_type)")
                .eq("user_id", session.user.id);
              const rows = (memberships || []).map((m: any) => ({
                organization_id: m.organizations?.id || m.organization_id,
                workspace_type: m.organizations?.workspace_type || "tournament",
              }));
              const { path } = decideWorkspaceSwitch(rows, location.pathname);
              navigate(path);
            }}
            className="flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground text-sm transition-colors w-full"
          >
            <LogOut className="h-4 w-4 rotate-180" />
            {!collapsed && <span>Switch Workspace</span>}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-primary-foreground/60 hover:text-primary-foreground text-sm transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}
