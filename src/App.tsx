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
import TeeSheet from "./pages/dashboard/TeeSheet";
import WaitlistPage from "./pages/dashboard/Waitlist";
import CheckIn from "./pages/dashboard/CheckIn";
import Auction from "./pages/dashboard/Auction";
import Gallery from "./pages/dashboard/Gallery";
import Volunteers from "./pages/dashboard/Volunteers";
import Surveys from "./pages/dashboard/Surveys";
import Donations from "./pages/dashboard/Donations";
import Finances from "./pages/dashboard/Finances";
import EmailTemplateEditor from "./pages/dashboard/EmailTemplateEditor";
import Registration from "./pages/dashboard/Registration";
import Settings from "./pages/dashboard/Settings";
import DirectorShop from "./pages/dashboard/DirectorShop";
import SharePromote from "./pages/dashboard/SharePromote";
import FlyerStudio from "./pages/dashboard/FlyerStudio";
import UpgradePlan from "./pages/dashboard/UpgradePlan";
import PayoutSettings from "./pages/dashboard/PayoutSettings";
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
import Pricing from "./pages/Pricing";
import SampleOrganizer from "./pages/SampleOrganizer";
import SampleDashboard from "./pages/SampleDashboard";
import VisitTracker from "./components/VisitTracker";
import CollegeTournament from "./pages/CollegeTournament";
import ResetPassword from "./pages/ResetPassword";
import FAQ from "./pages/FAQ";
// SalesHub moved into AdminDashboard
import DemoTalkTrack from "./pages/DemoTalkTrack";
import DemoAgenda from "./pages/sales/DemoAgenda";
import StudySheet from "./pages/admin/StudySheet";
import HelpCenter from "./pages/help/HelpCenter";
import ConnectStripe from "./pages/help/ConnectStripe";
import FeesAndHold from "./pages/help/FeesAndHold";
import PayoutSchedule from "./pages/help/PayoutSchedule";
import TaxInformation from "./pages/help/TaxInformation";
import PaymentSettings from "./pages/help/PaymentSettings";
import RefundsChargebacks from "./pages/help/RefundsChargebacks";
import CustomDomain from "./pages/help/CustomDomain";
import CompareEventbrite from "./pages/CompareEventbrite";
import CompareEventbritePdf from "./pages/CompareEventbritePdf";

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
          <Route path="/dashboard/tee-sheet" element={<DashboardLayout><TeeSheet /></DashboardLayout>} />
          <Route path="/dashboard/waitlist" element={<DashboardLayout><WaitlistPage /></DashboardLayout>} />
          <Route path="/dashboard/check-in" element={<DashboardLayout><CheckIn /></DashboardLayout>} />
          <Route path="/dashboard/auction" element={<DashboardLayout><PlanGate feature="auction"><Auction /></PlanGate></DashboardLayout>} />
          <Route path="/dashboard/gallery" element={<DashboardLayout><PlanGate feature="gallery"><Gallery /></PlanGate></DashboardLayout>} />
          <Route path="/dashboard/volunteers" element={<DashboardLayout><PlanGate feature="volunteers"><Volunteers /></PlanGate></DashboardLayout>} />
          <Route path="/dashboard/surveys" element={<DashboardLayout><PlanGate feature="surveys"><Surveys /></PlanGate></DashboardLayout>} />
          <Route path="/dashboard/donations" element={<DashboardLayout><PlanGate feature="donations"><Donations /></PlanGate></DashboardLayout>} />
          <Route path="/dashboard/finances" element={<DashboardLayout><Finances /></DashboardLayout>} />
          <Route path="/dashboard/email-templates" element={<DashboardLayout><EmailTemplateEditor /></DashboardLayout>} />
          <Route path="/dashboard/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
          <Route path="/dashboard/director-shop" element={<DashboardLayout><DirectorShop /></DashboardLayout>} />
          <Route path="/dashboard/upgrade" element={<DashboardLayout><UpgradePlan /></DashboardLayout>} />
          <Route path="/dashboard/payout-settings" element={<DashboardLayout><PayoutSettings /></DashboardLayout>} />
          <Route path="/dashboard/share-promote" element={<DashboardLayout><SharePromote /></DashboardLayout>} />
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
           <Route path="/pricing" element={<Pricing />} />
           <Route path="/sample-organizer" element={<SampleOrganizer />} />
           <Route path="/sample-dashboard" element={<SampleDashboard />} />
           <Route path="/college/:slug" element={<CollegeTournament />} />
           <Route path="/reset-password" element={<ResetPassword />} />
           <Route path="/faq" element={<FAQ />} />
           <Route path="/sales-hub" element={<Navigate to="/admin" replace />} />
           <Route path="/sales-hub/demo-talk-track" element={<DemoTalkTrack />} />
           <Route path="/sales/demo-agenda" element={<DemoAgenda />} />
           <Route path="/admin/study-sheet" element={<Navigate to="/admin" replace />} />
           <Route path="/help" element={<HelpCenter />} />
           <Route path="/help/connect-stripe" element={<ConnectStripe />} />
           <Route path="/help/fees-and-hold" element={<FeesAndHold />} />
           <Route path="/help/payout-schedule" element={<PayoutSchedule />} />
           <Route path="/help/tax-information" element={<TaxInformation />} />
           <Route path="/help/payment-settings" element={<PaymentSettings />} />
           <Route path="/help/refunds-chargebacks" element={<RefundsChargebacks />} />
           <Route path="/help/custom-domain" element={<CustomDomain />} />
           <Route path="/compare/eventbrite-vs-teevents" element={<CompareEventbrite />} />
           <Route path="/compare/eventbrite-vs-teevents/pdf" element={<CompareEventbritePdf />} />
           <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
