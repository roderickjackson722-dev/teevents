import {
  LayoutDashboard,
  Trophy,
  ClipboardCheck,
  Users,
  MessageSquare,
  DollarSign,
  Wallet,
  Award,
  ShoppingBag,
  Settings,
  LogOut,
  ShoppingCart,
  BarChart3,
  ScanLine,
  Gavel,
  ImageIcon,
  UserCheck,
  ClipboardList,
  Heart,
  Lock,
  FileEdit,
  Printer,
  PenLine,
  Mail,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoWhite from "@/assets/logo-white.png";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { useOrgContext } from "@/hooks/useOrgContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Map sidebar features to permission keys
const FEATURE_PERMISSION_MAP: Record<string, string> = {
  "registration": "manage_registration",
  "players": "manage_players",
  "check-in": "manage_check_in",
  "leaderboard": "manage_leaderboard",
  "email-messaging": "manage_messages",
  "budget": "manage_budget",
  "sponsors": "manage_sponsors",
  "store": "manage_store",
  "auction": "manage_auction",
  "gallery": "manage_gallery",
  "volunteers": "manage_volunteers",
  "surveys": "manage_surveys",
  "donations": "manage_donations",
};

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, feature: null },
  { title: "Tournaments", url: "/dashboard/tournaments", icon: Trophy, feature: null },
  { title: "Planning Guide", url: "/dashboard/checklist", icon: ClipboardCheck, feature: null },
  { title: "Printables", url: "/dashboard/printables", icon: Printer, feature: null },
];

const managementItems = [
  { title: "Registration", url: "/dashboard/registration", icon: FileEdit, feature: "registration" },
  { title: "Players", url: "/dashboard/players", icon: Users, feature: "players" },
  { title: "Check-In", url: "/dashboard/check-in", icon: ScanLine, feature: "check-in" },
  { title: "Leaderboard", url: "/dashboard/leaderboard", icon: BarChart3, feature: "leaderboard" },
  { title: "Scoring", url: "/dashboard/scoring", icon: PenLine, feature: "leaderboard" },
  { title: "Messages", url: "/dashboard/messages", icon: MessageSquare, feature: "email-messaging" },
  { title: "Email Templates", url: "/dashboard/email-templates", icon: Mail, feature: null },
  { title: "Finances", url: "/dashboard/finances", icon: Wallet, feature: null },
  { title: "Budget", url: "/dashboard/budget", icon: DollarSign, feature: "budget" },
  { title: "Sponsors", url: "/dashboard/sponsors", icon: Award, feature: "sponsors" },
  
  { title: "Add On Store", url: "/dashboard/store", icon: ShoppingBag, feature: "store" },
  { title: "Auction", url: "/dashboard/auction", icon: Gavel, feature: "auction" },
  { title: "Gallery", url: "/dashboard/gallery", icon: ImageIcon, feature: "gallery" },
  { title: "Volunteers", url: "/dashboard/volunteers", icon: UserCheck, feature: "volunteers" },
  { title: "Surveys", url: "/dashboard/surveys", icon: ClipboardList, feature: "surveys" },
  { title: "Donations", url: "/dashboard/donations", icon: Heart, feature: "donations" },
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

  // Filter management items based on permissions (owners see everything)
  const visibleManagementItems = managementItems.filter((item) => {
    if (isOwner) return true;
    const permKey = item.feature ? FEATURE_PERMISSION_MAP[item.feature] : null;
    if (!permKey) return true;
    return permissions.includes(permKey);
  });

  const renderItem = (item: typeof managementItems[0]) => {
    const locked = item.feature && !hasFeature(item.feature);
    const tier = item.feature ? requiredPlan(item.feature) : "";

    if (locked) {
      return (
        <SidebarMenuItem key={item.title}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  className="text-primary-foreground/40 hover:bg-primary-foreground/5 hover:text-primary-foreground/50"
                  activeClassName="bg-primary-foreground/10 text-primary-foreground/50"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.title}</span>
                      <Lock className="h-3 w-3 text-primary-foreground/30" />
                    </>
                  )}
                </NavLink>
              </SidebarMenuButton>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="text-xs">Requires <span className="font-semibold capitalize">{tier}</span> plan — click to learn more</p>
            </TooltipContent>
          </Tooltip>
        </SidebarMenuItem>
      );
    }

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.url}
            className="text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            activeClassName="bg-primary-foreground/15 text-secondary font-medium"
          >
            <item.icon className="mr-2 h-4 w-4" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  // Only show settings for owners or editors with manage_settings permission
  const showSettings = isOwner || permissions.includes("manage_settings");

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="bg-primary text-primary-foreground">
        <div className="flex items-center gap-3 p-4 border-b border-primary-foreground/10">
          <img src={logoWhite} alt="TeeVents" className="h-8 w-8 object-contain flex-shrink-0" />
          {!collapsed && (
            <span className="font-display text-lg font-semibold tracking-wide">
              TeeVents
            </span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-primary-foreground/50 text-xs tracking-widest uppercase">
            Overview
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                      activeClassName="bg-primary-foreground/15 text-secondary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleManagementItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-primary-foreground/50 text-xs tracking-widest uppercase">
              Management
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleManagementItems.map(renderItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {showSettings && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/dashboard/settings"
                      className="text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                      activeClassName="bg-primary-foreground/15 text-secondary font-medium"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Settings</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/dashboard/director-shop"
                      className="text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                      activeClassName="bg-primary-foreground/15 text-secondary font-medium"
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Director Shop</span>}
                    </NavLink>
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
