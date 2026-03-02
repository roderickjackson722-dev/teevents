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
import PaymentSuccess from "./pages/PaymentSuccess";
import DashboardHome from "./pages/dashboard/DashboardHome";
import Tournaments from "./pages/dashboard/Tournaments";
import PlanningGuide from "./pages/dashboard/PlanningGuide";
import ComingSoon from "./pages/dashboard/ComingSoon";
import SiteBuilder from "./pages/dashboard/SiteBuilder";
import Players from "./pages/dashboard/Players";
import Budget from "./pages/dashboard/Budget";
import Sponsors from "./pages/dashboard/Sponsors";
import Store from "./pages/dashboard/Store";
import Messages from "./pages/dashboard/Messages";
import Leaderboard from "./pages/dashboard/Leaderboard";
import CheckIn from "./pages/dashboard/CheckIn";
import Auction from "./pages/dashboard/Auction";
import Gallery from "./pages/dashboard/Gallery";
import Volunteers from "./pages/dashboard/Volunteers";
import Surveys from "./pages/dashboard/Surveys";
import Donations from "./pages/dashboard/Donations";
import PublicTournament from "./pages/PublicTournament";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
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
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/dashboard" element={<DashboardLayout><DashboardHome /></DashboardLayout>} />
          <Route path="/dashboard/tournaments" element={<DashboardLayout><Tournaments /></DashboardLayout>} />
          <Route path="/dashboard/tournaments/:id/site-builder" element={<DashboardLayout><SiteBuilder /></DashboardLayout>} />
          <Route path="/dashboard/checklist" element={<DashboardLayout><PlanningGuide /></DashboardLayout>} />
          <Route path="/dashboard/players" element={<DashboardLayout><Players /></DashboardLayout>} />
          <Route path="/dashboard/messages" element={<DashboardLayout><Messages /></DashboardLayout>} />
          <Route path="/dashboard/budget" element={<DashboardLayout><Budget /></DashboardLayout>} />
          <Route path="/dashboard/sponsors" element={<DashboardLayout><Sponsors /></DashboardLayout>} />
          <Route path="/dashboard/store" element={<DashboardLayout><Store /></DashboardLayout>} />
          <Route path="/dashboard/leaderboard" element={<DashboardLayout><Leaderboard /></DashboardLayout>} />
          <Route path="/dashboard/check-in" element={<DashboardLayout><CheckIn /></DashboardLayout>} />
          <Route path="/dashboard/auction" element={<DashboardLayout><Auction /></DashboardLayout>} />
          <Route path="/dashboard/gallery" element={<DashboardLayout><Gallery /></DashboardLayout>} />
          <Route path="/dashboard/volunteers" element={<DashboardLayout><Volunteers /></DashboardLayout>} />
          <Route path="/dashboard/surveys" element={<DashboardLayout><Surveys /></DashboardLayout>} />
          <Route path="/dashboard/donations" element={<DashboardLayout><Donations /></DashboardLayout>} />
          <Route path="/dashboard/settings" element={<DashboardLayout><ComingSoon title="Settings" description="Organization settings and branding customization coming soon." /></DashboardLayout>} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/t/:slug" element={<PublicTournament />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
