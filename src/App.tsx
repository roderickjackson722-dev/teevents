import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CustomDomainRouter from "./components/CustomDomainRouter";
import About from "./pages/About";
import Services from "./pages/Services";
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
import Printables from "./pages/dashboard/Printables";
import ComingSoon from "./pages/dashboard/ComingSoon";
import SiteBuilder from "./pages/dashboard/SiteBuilder";
import Players from "./pages/dashboard/Players";
import Budget from "./pages/dashboard/Budget";
import Sponsors from "./pages/dashboard/Sponsors";
import Store from "./pages/dashboard/Store";
import Messages from "./pages/dashboard/Messages";
import Leaderboard from "./pages/dashboard/Leaderboard";
import Scoring from "./pages/dashboard/Scoring";
import CheckIn from "./pages/dashboard/CheckIn";
import Auction from "./pages/dashboard/Auction";
import Gallery from "./pages/dashboard/Gallery";
import Volunteers from "./pages/dashboard/Volunteers";
import Surveys from "./pages/dashboard/Surveys";
import Donations from "./pages/dashboard/Donations";
import Registration from "./pages/dashboard/Registration";
import Settings from "./pages/dashboard/Settings";
import UpgradePlan from "./pages/dashboard/UpgradePlan";
import PublicTournament from "./pages/PublicTournament";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import { Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import PlanGate from "./components/PlanGate";
import LiveScoring from "./pages/LiveScoring";
import ScanCheckIn from "./pages/ScanCheckIn";
import SalesDeck from "./pages/SalesDeck";
import Flyer from "./pages/Flyer";
import AcceptInvitation from "./pages/AcceptInvitation";
import Nonprofits from "./pages/Nonprofits";
import HowItWorks from "./pages/HowItWorks";
import VisitTracker from "./components/VisitTracker";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <VisitTracker />
        <Routes>
          <Route path="/" element={<CustomDomainRouter />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/platform" element={<Navigate to="/how-it-works" replace />} />
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
          <Route path="/dashboard/printables" element={<DashboardLayout><Printables /></DashboardLayout>} />
          <Route path="/dashboard/registration" element={<DashboardLayout><Registration /></DashboardLayout>} />
          <Route path="/dashboard/players" element={<DashboardLayout><Players /></DashboardLayout>} />
          <Route path="/dashboard/messages" element={<DashboardLayout><Messages /></DashboardLayout>} />
          <Route path="/dashboard/budget" element={<DashboardLayout><PlanGate feature="budget"><Budget /></PlanGate></DashboardLayout>} />
          <Route path="/dashboard/sponsors" element={<DashboardLayout><PlanGate feature="sponsors"><Sponsors /></PlanGate></DashboardLayout>} />
          <Route path="/dashboard/store" element={<DashboardLayout><PlanGate feature="store"><Store /></PlanGate></DashboardLayout>} />
          <Route path="/dashboard/leaderboard" element={<DashboardLayout><Leaderboard /></DashboardLayout>} />
          <Route path="/dashboard/scoring" element={<DashboardLayout><Scoring /></DashboardLayout>} />
          <Route path="/dashboard/check-in" element={<DashboardLayout><CheckIn /></DashboardLayout>} />
          <Route path="/dashboard/auction" element={<DashboardLayout><PlanGate feature="auction"><Auction /></PlanGate></DashboardLayout>} />
          <Route path="/dashboard/gallery" element={<DashboardLayout><PlanGate feature="gallery"><Gallery /></PlanGate></DashboardLayout>} />
          <Route path="/dashboard/volunteers" element={<DashboardLayout><PlanGate feature="volunteers"><Volunteers /></PlanGate></DashboardLayout>} />
          <Route path="/dashboard/surveys" element={<DashboardLayout><PlanGate feature="surveys"><Surveys /></PlanGate></DashboardLayout>} />
          <Route path="/dashboard/donations" element={<DashboardLayout><PlanGate feature="donations"><Donations /></PlanGate></DashboardLayout>} />
          <Route path="/dashboard/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
          <Route path="/dashboard/upgrade" element={<DashboardLayout><UpgradePlan /></DashboardLayout>} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/demo" element={<Navigate to="/how-it-works" replace />} />
          <Route path="/t/:slug" element={<PublicTournament />} />
          <Route path="/t/:slug/scoring" element={<LiveScoring />} />
          <Route path="/checkin/:tournamentId" element={<ScanCheckIn />} />
          <Route path="/deck" element={<SalesDeck />} />
          <Route path="/sales-deck" element={<SalesDeck />} />
          <Route path="/flyer" element={<Flyer />} />
          <Route path="/accept-invitation" element={<AcceptInvitation />} />
           <Route path="/nonprofits" element={<Nonprofits />} />
           <Route path="/how-it-works" element={<HowItWorks />} />
           <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
