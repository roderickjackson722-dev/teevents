import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import About from "./pages/About";
import Services from "./pages/Services";
import Platform from "./pages/Platform";
import Events from "./pages/Events";
import Reviews from "./pages/Reviews";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import SetupAdmin from "./pages/SetupAdmin";
import CustomerAuth from "./pages/CustomerAuth";
import Onboarding from "./pages/Onboarding";
import DashboardLayout from "./components/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import Tournaments from "./pages/dashboard/Tournaments";
import PlanningGuide from "./pages/dashboard/PlanningGuide";
import ComingSoon from "./pages/dashboard/ComingSoon";
import SiteBuilder from "./pages/dashboard/SiteBuilder";
import PublicTournament from "./pages/PublicTournament";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/platform" element={<Platform />} />
          <Route path="/events" element={<Events />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/setup-admin" element={<SetupAdmin />} />
          <Route path="/get-started" element={<CustomerAuth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<DashboardLayout><DashboardHome /></DashboardLayout>} />
          <Route path="/dashboard/tournaments" element={<DashboardLayout><Tournaments /></DashboardLayout>} />
          <Route path="/dashboard/tournaments/:id/site-builder" element={<DashboardLayout><SiteBuilder /></DashboardLayout>} />
          <Route path="/dashboard/checklist" element={<DashboardLayout><PlanningGuide /></DashboardLayout>} />
          <Route path="/dashboard/players" element={<DashboardLayout><ComingSoon title="Player Management" description="Registration forms, player database, and pairings tools coming soon." /></DashboardLayout>} />
          <Route path="/dashboard/budget" element={<DashboardLayout><ComingSoon title="Budget Tracker" description="Real-time revenue and expense tracking coming soon." /></DashboardLayout>} />
          <Route path="/dashboard/sponsors" element={<DashboardLayout><ComingSoon title="Sponsor Management" description="Sponsor recognition tools and logo management coming soon." /></DashboardLayout>} />
          <Route path="/dashboard/store" element={<DashboardLayout><ComingSoon title="Tournament Store" description="Merchandise and product management coming soon." /></DashboardLayout>} />
          <Route path="/dashboard/settings" element={<DashboardLayout><ComingSoon title="Settings" description="Organization settings and branding customization coming soon." /></DashboardLayout>} />
          <Route path="/t/:slug" element={<PublicTournament />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
