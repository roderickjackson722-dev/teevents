import {
  LayoutDashboard, Trophy, ClipboardCheck, Users, MessageSquare,
  DollarSign, Wallet, Award, ShoppingBag, Settings, LogOut, ShoppingCart,
  BarChart3, ScanLine, Gavel, ImageIcon, UserCheck, ClipboardList, Heart,
  Clock, CreditCard, Share2, FileEdit, Printer, PenLine, Mail, HelpCircle,
  FlaskConical, MapPin, Sliders, Search as SearchIcon, FileText, Megaphone,
  PartyPopper, Building2, Store, Target,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoWhite from "@/assets/logo-white.png";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { useOrgContext } from "@/hooks/useOrgContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

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
}

interface SidebarCategory {
  label: string;
  color: string; // tailwind border-l color class
  items: NavItem[];
}

// Phase-based navigation: Setup → Promotion → Operations → Finance → Post-Event → Settings
const categories: SidebarCategory[] = [
  {
    label: "Setup",
    color: "border-l-blue-400",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, feature: null },
      { title: "Tournament Details", url: "/dashboard/tournaments", icon: Trophy, feature: null },
      { title: "Course Details", url: "/dashboard/course-details", icon: MapPin, feature: null },
      { title: "Handicap Settings", url: "/dashboard/test-simulator", icon: Sliders, feature: "leaderboard" },
      { title: "Registration Form", url: "/dashboard/registration", icon: FileEdit, feature: "registration" },
      { title: "Sponsorship Tiers", url: "/dashboard/sponsors", icon: Award, feature: "sponsors" },
      { title: "Team Management", url: "/dashboard/settings", icon: Building2, feature: null },
      { title: "Planning Guide", url: "/dashboard/checklist", icon: ClipboardCheck, feature: null },
    ],
  },
  {
    label: "Promotion",
    color: "border-l-green-400",
    items: [
      { title: "Share & Promote", url: "/dashboard/share-promote", icon: Share2, feature: null },
      { title: "Flyer Studio", url: "/dashboard/flyer-studio", icon: Megaphone, feature: "flyer-studio" },
      { title: "Public Search", url: "/dashboard/settings", icon: SearchIcon, feature: null },
      { title: "Printables", url: "/dashboard/printables", icon: Printer, feature: null },
      { title: "Email Templates", url: "/dashboard/email-templates", icon: Mail, feature: null },
    ],
  },
  {
    label: "Operations",
    color: "border-l-purple-400",
    items: [
      { title: "Players", url: "/dashboard/players", icon: Users, feature: "players" },
      { title: "Waitlist", url: "/dashboard/waitlist", icon: ClipboardList, feature: null },
      { title: "Check-In", url: "/dashboard/check-in", icon: ScanLine, feature: "check-in" },
      { title: "Tee Sheet", url: "/dashboard/tee-sheet", icon: Clock, feature: "leaderboard" },
      { title: "Live Leaderboard", url: "/dashboard/leaderboard", icon: BarChart3, feature: "leaderboard" },
      { title: "Scoring", url: "/dashboard/scoring", icon: PenLine, feature: "leaderboard" },
      { title: "Test Simulator", url: "/dashboard/test-simulator", icon: FlaskConical, feature: "leaderboard" },
      { title: "Sponsor Management", url: "/dashboard/sponsors", icon: Award, feature: "sponsors" },
      { title: "Volunteers", url: "/dashboard/volunteers", icon: UserCheck, feature: "volunteers" },
      { title: "Vendors", url: "/dashboard/vendors", icon: Store, feature: null },
      { title: "Event Day Contests", url: "/dashboard/contests", icon: Trophy, feature: null },
      { title: "Messages", url: "/dashboard/messages", icon: MessageSquare, feature: "email-messaging" },
    ],
  },
  {
    label: "Finance",
    color: "border-l-yellow-400",
    items: [
      { title: "Finances", url: "/dashboard/finances", icon: Wallet, feature: null },
      { title: "Payout Settings", url: "/dashboard/payout-settings", icon: CreditCard, feature: null },
      { title: "Budget", url: "/dashboard/budget", icon: DollarSign, feature: "budget" },
      { title: "Add On Store", url: "/dashboard/store", icon: ShoppingBag, feature: "store" },
      { title: "Director Shop", url: "/dashboard/director-shop", icon: ShoppingCart, feature: null },
    ],
  },
  {
    label: "Post-Event",
    color: "border-l-teal-400",
    items: [
      { title: "Surveys & Feedback", url: "/dashboard/surveys", icon: ClipboardList, feature: "surveys" },
      { title: "Photo Gallery", url: "/dashboard/gallery", icon: ImageIcon, feature: "gallery" },
      { title: "Donations", url: "/dashboard/donations", icon: Heart, feature: "donations" },
      { title: "Auction", url: "/dashboard/auction", icon: Gavel, feature: "auction" },
    ],
  },
];

const settingsItems: NavItem[] = [
  { title: "General Settings", url: "/dashboard/settings", icon: Settings, feature: null },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { hasFeature, requiredPlan } = usePlanFeatures();
  const { org } = useOrgContext();

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

  const renderItem = (item: NavItem) => {
    const locked = item.feature && !hasFeature(item.feature);
    const tier = item.feature ? requiredPlan(item.feature) : "";
    const tierLabel = tier === "starter" ? "Starter" : tier === "premium" ? "Premium" : "";

    return (
      <SidebarMenuItem key={`${item.title}-${item.url}`}>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.url}
            end={item.url === "/dashboard"}
            className="text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            activeClassName="bg-primary-foreground/15 text-secondary font-medium"
          >
            <item.icon className="mr-2 h-4 w-4" />
            {!collapsed && (
              <>
                <span className="flex-1">{item.title}</span>
                {locked && tierLabel && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-secondary/20 text-secondary ml-1">
                    {tierLabel}
                  </span>
                )}
              </>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const showSettings = isOwner || permissions.includes("manage_settings");

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="bg-primary text-primary-foreground">
        <div className="flex items-center gap-3 p-4 border-b border-primary-foreground/10">
          <img src={logoWhite} alt="TeeVents" className="h-8 w-8 object-contain flex-shrink-0" />
          {!collapsed && (
            <span className="font-display text-lg font-semibold tracking-wide">TeeVents</span>
          )}
        </div>

        {categories.map((cat) => {
          const visibleItems = cat.items.filter(isVisible);
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={cat.label}>
              <div className={`border-l-2 ${cat.color} ml-2 pl-2`}>
                <SidebarGroupLabel className="text-primary-foreground/50 text-[10px] tracking-widest uppercase font-semibold">
                  {collapsed ? "" : cat.label}
                </SidebarGroupLabel>
              </div>
              <SidebarGroupContent>
                <SidebarMenu>{visibleItems.map(renderItem)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}

        {showSettings && (
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="bg-primary border-t border-primary-foreground/10 p-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-primary-foreground/60 hover:text-primary-foreground text-sm transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
