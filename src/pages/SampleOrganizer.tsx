import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Trophy, Users, DollarSign, Heart, ClipboardList, LayoutDashboard, Calendar
} from "lucide-react";
import SEO from "@/components/SEO";
import logoBlack from "@/assets/logo-black.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import DemoOverviewTab from "@/components/sample-tournament/DemoOverviewTab";
import DemoLeaderboardTab from "@/components/sample-tournament/DemoLeaderboardTab";
import DemoSponsorsTab from "@/components/sample-tournament/DemoSponsorsTab";
import DemoVolunteersTab from "@/components/sample-tournament/DemoVolunteersTab";
import DemoFinancesTab from "@/components/sample-tournament/DemoFinancesTab";
import DemoRegistrationTab from "@/components/sample-tournament/DemoRegistrationTab";


const SampleOrganizer = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <SEO
        title="Interactive Demo | TeeVents"
        description="Experience a fully interactive sample tournament on TeeVents. Explore leaderboards, registration, sponsors, volunteers, and financials."
        path="/sample-organizer"
        noIndex
      />

      {/* Demo Mode Banner */}
      <div className="bg-secondary text-secondary-foreground px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium">
        <span>🎯 You're viewing a demo tournament — want a personalized walkthrough?</span>
        <Link
          to="/book"
          className="inline-flex items-center gap-1.5 bg-secondary-foreground/20 hover:bg-secondary-foreground/30 px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors"
        >
          <Calendar className="h-3 w-3" /> Book a Live Demo
        </Link>
      </div>

      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoBlack} alt="TeeVents" className="h-8 w-8 object-contain" />
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">TeeVents Demo</h1>
              <p className="text-xs text-muted-foreground">Interactive Sample Tournament</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:inline-flex text-xs">
              Demo Mode
            </Badge>
            <Button size="sm" variant="secondary" onClick={() => navigate("/sample-dashboard")}>
              <LayoutDashboard className="h-4 w-4 mr-1" />
              Open Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-6xl mx-auto px-4 pt-8 pb-4 text-center"
      >
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          Pebble Beach Charity Classic
        </h2>
        <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
          Explore a fully populated sample tournament. Click through every tab to see how TeeVents works for organizers and golfers.
        </p>
      </motion.div>

      {/* Tabbed Content */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1.5 rounded-xl">
            {[
              { value: "overview", label: "Overview", icon: ClipboardList },
              { value: "leaderboard", label: "Leaderboard", icon: Trophy },
              { value: "sponsors", label: "Sponsors", icon: Heart },
              { value: "volunteers", label: "Volunteers", icon: Users },
              { value: "finances", label: "Finances", icon: DollarSign },
              { value: "register", label: "Register", icon: ArrowRight },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1.5 text-xs sm:text-sm px-3 py-2"
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview"><DemoOverviewTab /></TabsContent>
          <TabsContent value="leaderboard"><DemoLeaderboardTab /></TabsContent>
          <TabsContent value="sponsors"><DemoSponsorsTab /></TabsContent>
          <TabsContent value="volunteers"><DemoVolunteersTab /></TabsContent>
          <TabsContent value="finances"><DemoFinancesTab /></TabsContent>
          <TabsContent value="register"><DemoRegistrationTab /></TabsContent>
        </Tabs>
      </div>

      {/* Footer CTA */}
      <div className="border-t border-border bg-card py-8">
        <div className="max-w-6xl mx-auto px-4 text-center space-y-4">
          <p className="text-muted-foreground text-sm">
            Ready to run your own tournament?
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={() => navigate("/get-started")}>
              Get Started
            </Button>
            <Link to="/book">
              <Button variant="outline">
                <Calendar className="h-4 w-4 mr-1" /> Book a Live Demo
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SampleOrganizer;
