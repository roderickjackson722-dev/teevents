import {
  LayoutDashboard,
  Trophy,
  ClipboardCheck,
  Users,
  MessageSquare,
  DollarSign,
  Award,
  ShoppingBag,
  Settings,
  LogOut,
  BarChart3,
  ScanLine,
  Gavel,
  ImageIcon,
  UserCheck,
  ClipboardList,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoWhite from "@/assets/logo-white.png";

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

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Tournaments", url: "/dashboard/tournaments", icon: Trophy },
  { title: "Planning Guide", url: "/dashboard/checklist", icon: ClipboardCheck },
];

const managementItems = [
  { title: "Players", url: "/dashboard/players", icon: Users },
  { title: "Check-In", url: "/dashboard/check-in", icon: ScanLine },
  { title: "Leaderboard", url: "/dashboard/leaderboard", icon: BarChart3 },
  { title: "Messages", url: "/dashboard/messages", icon: MessageSquare },
  { title: "Budget", url: "/dashboard/budget", icon: DollarSign },
  { title: "Sponsors", url: "/dashboard/sponsors", icon: Award },
  { title: "Store", url: "/dashboard/store", icon: ShoppingBag },
  { title: "Auction", url: "/dashboard/auction", icon: Gavel },
  { title: "Gallery", url: "/dashboard/gallery", icon: ImageIcon },
  { title: "Volunteers", url: "/dashboard/volunteers", icon: UserCheck },
  { title: "Surveys", url: "/dashboard/surveys", icon: ClipboardList },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

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

        <SidebarGroup>
          <SidebarGroupLabel className="text-primary-foreground/50 text-xs tracking-widest uppercase">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
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
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
