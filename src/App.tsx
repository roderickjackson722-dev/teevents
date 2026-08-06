import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CustomDomainRouter from "./components/CustomDomainRouter";
import About from "./pages/About";
import Services from "./pages/Services";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import ManageEvents from "./pages/admin/ManageEvents";
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
import Leagues from "./pages/dashboard/Leagues";
import LeagueManage from "./pages/dashboard/LeagueManage";
import PublicLeague from "./pages/PublicLeague";
import LeagueMemberLogin from "./pages/LeagueMemberLogin";
import LeagueMemberPortal from "./pages/LeagueMemberPortal";
import LeagueEventRegister from "./pages/LeagueEventRegister";
import LeagueRegisterPublic from "./pages/LeagueRegisterPublic";

import SelectWorkspace from "./pages/SelectWorkspace";
import Signup from "./pages/Signup";
import CreateWorkspace from "./pages/CreateWorkspace";
import PlanningGuide from "./pages/dashboard/PlanningGuide";
import SetupChecklistPage from "./pages/dashboard/SetupChecklistPage";
import OrganizerNotes from "./pages/dashboard/OrganizerNotes";
import Printables from "./pages/dashboard/Printables";
import ComingSoon from "./pages/dashboard/ComingSoon";
import SiteBuilder from "./pages/dashboard/SiteBuilder";
import PublicPageEditor from "./pages/dashboard/PublicPageEditor";
import WebpageLayout from "./pages/dashboard/WebpageLayout";
import Players from "./pages/dashboard/Players";
import Budget from "./pages/dashboard/Budget";
import Sponsors from "./pages/dashboard/Sponsors";
import Store from "./pages/dashboard/Store";
import Leaderboard from "./pages/dashboard/Leaderboard";
import Scoring from "./pages/dashboard/Scoring";
import CRM from "./pages/dashboard/CRM";
import CourseDetails from "./pages/dashboard/CourseDetails";
import WaitlistPage from "./pages/dashboard/Waitlist";
import CheckIn from "./pages/dashboard/CheckIn";
import Auction from "./pages/dashboard/Auction";
import Auctions from "./pages/dashboard/Auctions";
import Raffles from "./pages/dashboard/Raffles";
import MediaClips from "./pages/dashboard/MediaClips";
import DayOfSettings from "./pages/dashboard/DayOfSettings";
import DayOf from "./pages/DayOf";
import Gallery from "./pages/dashboard/Gallery";
import Volunteers from "./pages/dashboard/Volunteers";
import Surveys from "./pages/dashboard/Surveys";
import Donations from "./pages/dashboard/Donations";
import Finances from "./pages/dashboard/Finances";
import Transactions from "./pages/dashboard/Transactions";
import EmailTemplateEditor from "./pages/dashboard/EmailTemplateEditor";
import EmailLog from "./pages/dashboard/EmailLog";
import Registration from "./pages/dashboard/Registration";
import ScoringPayouts from "./pages/dashboard/ScoringPayouts";
import Settings from "./pages/dashboard/Settings";
import ActivityLog from "./pages/dashboard/ActivityLog";
import OrganizationInfo from "./pages/dashboard/OrganizationInfo";
import Lodging from "./pages/dashboard/Lodging";
import DirectorShop from "./pages/dashboard/DirectorShop";
import SharePromote from "./pages/dashboard/SharePromote";
import FlyerStudio from "./pages/dashboard/FlyerStudio";
import Contests from "./pages/dashboard/Contests";
import UpgradePlan from "./pages/dashboard/UpgradePlan";
import ManualEntryGrantsAdmin from "./pages/admin/ManualEntryGrants";
import AdminSecurity from "./pages/admin/Security";
import AdminUsersEvents from "./pages/admin/UsersEvents";
import PayoutSettings from "./pages/dashboard/PayoutSettings";
import TeamManagementPage from "./pages/dashboard/TeamManagementPage";
import PublicSearch from "./pages/dashboard/PublicSearch";
import PublicTournament from "./pages/PublicTournament";
import RefundRequest from "./pages/RefundRequest";
import Survey from "./pages/Survey";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import { Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import SlugResolver from "./pages/SlugResolver";
import PlanGate from "./components/PlanGate";
import LiveScoring from "./pages/LiveScoring";
import ScanCheckIn from "./pages/ScanCheckIn";
import SalesDeck from "./pages/SalesDeck";
import Flyer from "./pages/Flyer";
import AcceptInvitation from "./pages/AcceptInvitation";
import ForcePasswordChange from "./pages/ForcePasswordChange";
import Nonprofits from "./pages/Nonprofits";
import Plans from "./pages/Plans";
import GolfLeagues from "./pages/GolfLeagues";
import EnterprisePricing from "./pages/EnterprisePricing";
import SampleOrganizer from "./pages/SampleOrganizer";
import SampleDashboard from "./pages/SampleDashboard";
import InteractiveDemo from "./pages/InteractiveDemo";
import VisitTracker from "./components/VisitTracker";
import CollegeTournament from "./pages/CollegeTournament";
import ResetPassword from "./pages/ResetPassword";
import FAQ from "./pages/FAQ";
import Features from "./pages/Features";
// SalesHub moved into AdminDashboard
import DemoTalkTrack from "./pages/DemoTalkTrack";
import DemoAgenda from "./pages/sales/DemoAgenda";
import StudySheet from "./pages/admin/StudySheet";
import AdminPayouts from "./pages/admin/Payouts";
import DemoConverter from "./pages/admin/DemoConverter";
import DemoAgendaEditor from "./pages/admin/DemoAgendaEditor";
import DemoTournamentSite from "./pages/demo/DemoTournamentSite";
import DemoDashboardPreview from "./pages/demo/DemoDashboardPreview";
import DemoLiveLeaderboard from "./pages/demo/DemoLiveLeaderboard";
import DemoDayOfPage from "./pages/demo/DemoDayOfPage";
import Claim from "./pages/Claim";
import ClaimDemo from "./pages/ClaimDemo";
import DemoPreparation from "./pages/admin/DemoPreparation";
import AdminStripeConnections from "./pages/admin/StripeConnections";
import AdminCourseDatabase from "./pages/admin/CourseDatabase";
import AdminOutreach from "./pages/admin/Outreach";
import Unsubscribe from "./pages/Unsubscribe";
import FlyerToDemo from "./pages/admin/FlyerToDemo";
import SalesProspecting from "./pages/admin/SalesProspecting";
import DemoLeads from "./pages/admin/DemoLeads";
import AdminCompetitors from "./pages/admin/Competitors";
import AdminBrandingFooter from "./pages/admin/BrandingFooter";
import CollegeHubBookings from "./pages/admin/CollegeHubBookings";
import PlatformTournaments from "./pages/admin/PlatformTournaments";
import LeagueInvoices from "./pages/admin/LeagueInvoices";
import LeagueReconciliation from "./pages/admin/LeagueReconciliation";
import AdminLeagues from "./pages/admin/Leagues";


import AdminScoring from "./pages/admin/AdminScoring";
import LeaguePromoCodes from "./pages/admin/LeaguePromoCodes";
import AiSalesAgent from "./pages/admin/AiSalesAgent";
import CollegeHubBookingsPublic from "./pages/CollegeHubBookings";
import CollegeHubSurveys from "./pages/admin/CollegeHubSurveys";
import CollegeSurvey from "./pages/CollegeSurvey";
import DemoPrepShare from "./pages/DemoPrepShare";
import HelpCenter from "./pages/help/HelpCenter";
import StepByStep from "./pages/help/StepByStep";
import ConnectStripe from "./pages/help/ConnectStripe";
import FeesAndHold from "./pages/help/FeesAndHold";
import PayoutSchedule from "./pages/help/PayoutSchedule";
import TaxInformation from "./pages/help/TaxInformation";
import PaymentSettings from "./pages/help/PaymentSettings";
import RefundsChargebacks from "./pages/help/RefundsChargebacks";
import CustomDomain from "./pages/help/CustomDomain";
import HowPaymentsWork from "./pages/help/HowPaymentsWork";
import UnderstandingPayoutTiming from "./pages/help/UnderstandingPayoutTiming";
import FindingStripePayouts from "./pages/help/FindingStripePayouts";
import UploadingImages from "./pages/help/UploadingImages";
import CompareEventbrite from "./pages/CompareEventbrite";
import CompareGolfGenius from "./pages/CompareGolfGenius";
import PinSheets from "./pages/dashboard/PinSheets";
import Compare from "./pages/Compare";
import CompareEventbritePdf from "./pages/CompareEventbritePdf";
import SalesFlyer from "./pages/SalesFlyer";
import SponsorRegistration from "./pages/SponsorRegistration";
import VendorRegistration from "./pages/VendorRegistration";
import PublicAddons from "./pages/PublicAddons";
import Vendors from "./pages/dashboard/Vendors";
import SideEvents from "./pages/dashboard/SideEvents";
import TeamPerformance from "./pages/dashboard/TeamPerformance";
import TournamentSearch from "./pages/TournamentSearch";
import LiveLeaderboard from "./pages/LiveLeaderboard";
import TeamHomepage from "./pages/TeamHomepage";
import ScoreLogin from "./pages/ScoreLogin";
import GroupScoring from "./pages/GroupScoring";
import LeagueTeamScoring from "./pages/LeagueTeamScoring";
import LeagueEventLeaderboard from "./pages/LeagueEventLeaderboard";

import SponsorLandingPage from "./pages/SponsorLandingPage";
import Book from "./pages/Book";
import ConfirmPayoutChange from "./pages/ConfirmPayoutChange";
import ConfirmBankChange from "./pages/ConfirmBankChange";
import TripsList from "./pages/trips/TripsList";
import TripNew from "./pages/trips/TripNew";
import TripDetail from "./pages/trips/TripDetail";
import PublicTrip from "./pages/trips/PublicTrip";
import PlayerHub from "./pages/PlayerHub";
import GolfTournamentSoftware from "./pages/seo/GolfTournamentSoftware";
import CharityGolfTournamentPlanning from "./pages/seo/CharityGolfTournamentPlanning";
import GolfFundraiserManagement from "./pages/seo/GolfFundraiserManagement";
import SampleTournament from "./pages/sample/SampleTournament";
import SampleDashboardPreview from "./pages/sample/SampleDashboardPreview";
import SampleLive from "./pages/sample/SampleLive";
import SampleTournamentDashboard from "./pages/sample/SampleTournamentDashboard";
import DemoAccess from "./pages/sample/DemoAccess";

import EventDaySales from "./pages/dashboard/EventDaySales";
import StressTest from "./pages/dashboard/StressTest";
import { installSampleSafeClient } from "./lib/sampleSafeClient";

const queryClient = new QueryClient();

if (typeof window !== "undefined") installSampleSafeClient();

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
          <Route path="/platform" element={<Navigate to="/plans" replace />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:slug" element={<EventDetail />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/prospect-samples" element={<AdminDashboard />} />
          <Route path="/setup-admin" element={<SetupAdmin />} />
          <Route path="/get-started" element={<CustomerAuth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/create-workspace" element={<CreateWorkspace />} />
          <Route path="/dashboard" element={<DashboardLayout><DashboardHome /></DashboardLayout>} />
          <Route path="/select-workspace" element={<SelectWorkspace />} />
          <Route path="/dashboard/tournaments" element={<DashboardLayout><Tournaments /></DashboardLayout>} />
          <Route path="/dashboard/public-page-editor" element={<DashboardLayout><PublicPageEditor /></DashboardLayout>} />
          <Route path="/dashboard/tournaments/:id/site-builder" element={<DashboardLayout><SiteBuilder /></DashboardLayout>} />
          <Route path="/dashboard/webpage-layout" element={<DashboardLayout><WebpageLayout /></DashboardLayout>} />
          <Route path="/dashboard/leagues" element={<DashboardLayout><Leagues /></DashboardLayout>} />
          <Route path="/dashboard/leagues/:leagueId" element={<DashboardLayout><LeagueManage /></DashboardLayout>} />
          <Route path="/dashboard/leagues/:leagueId/manage" element={<DashboardLayout><LeagueManage /></DashboardLayout>} />
          <Route path="/league/:slug" element={<PublicLeague />} />
          <Route path="/league/:slug/score" element={<LeagueMemberLogin />} />
          <Route path="/league/:slug/me/:code" element={<LeagueMemberPortal />} />
          <Route path="/league/:slug/register" element={<LeagueRegisterPublic />} />
          <Route path="/league/:slug/register/:code" element={<LeagueEventRegister />} />



          <Route path="/dashboard/checklist" element={<DashboardLayout><PlanningGuide /></DashboardLayout>} />
          <Route path="/dashboard/setup-checklist" element={<DashboardLayout><SetupChecklistPage /></DashboardLayout>} />
          <Route path="/dashboard/notes" element={<DashboardLayout><OrganizerNotes /></DashboardLayout>} />
          <Route path="/dashboard/printables" element={<DashboardLayout><Printables /></DashboardLayout>} />
          <Route path="/dashboard/scoring-payouts" element={<DashboardLayout><ScoringPayouts /></DashboardLayout>} />
          <Route path="/dashboard/registration" element={<DashboardLayout><Registration /></DashboardLayout>} />
          <Route path="/dashboard/contests" element={<DashboardLayout><Contests /></DashboardLayout>} />
          <Route path="/dashboard/players" element={<DashboardLayout><Players /></DashboardLayout>} />
          <Route path="/dashboard/budget" element={<DashboardLayout><PlanGate feature="budget"><Budget /></PlanGate></DashboardLayout>} />
          <Route path="/dashboard/sponsors" element={<DashboardLayout><Sponsors /></DashboardLayout>} />
          <Route path="/dashboard/store" element={<DashboardLayout><PlanGate feature="store"><Store /></PlanGate></DashboardLayout>} />
          <Route path="/dashboard/leaderboard" element={<DashboardLayout><Leaderboard /></DashboardLayout>} />
          <Route path="/dashboard/scoring" element={<DashboardLayout><Scoring /></DashboardLayout>} />
          <Route path="/dashboard/crm" element={<DashboardLayout><CRM /></DashboardLayout>} />
          <Route path="/dashboard/course-details" element={<DashboardLayout><CourseDetails /></DashboardLayout>} />
          <Route path="/dashboard/pin-sheets" element={<DashboardLayout><PinSheets /></DashboardLayout>} />
          <Route path="/dashboard/waitlist" element={<DashboardLayout><WaitlistPage /></DashboardLayout>} />
          <Route path="/dashboard/check-in" element={<DashboardLayout><CheckIn /></DashboardLayout>} />
          <Route path="/dashboard/auction" element={<DashboardLayout><PlanGate feature="auction"><Auction /></PlanGate></DashboardLayout>} />
          <Route path="/dashboard/auctions" element={<DashboardLayout><PlanGate feature="auction"><Auctions /></PlanGate></DashboardLayout>} />
          <Route path="/dashboard/raffles" element={<DashboardLayout><PlanGate feature="auction"><Raffles /></PlanGate></DashboardLayout>} />
          <Route path="/dashboard/media" element={<DashboardLayout><MediaClips /></DashboardLayout>} />
          <Route path="/dashboard/day-of" element={<DashboardLayout><DayOfSettings /></DashboardLayout>} />
          <Route path="/dashboard/stress-test" element={<DashboardLayout><StressTest /></DashboardLayout>} />
          <Route path="/dashboard/event-day-sales" element={<DashboardLayout><EventDaySales /></DashboardLayout>} />
          <Route path="/day-of/:slug/:code" element={<DayOf />} />
          <Route path="/day-of/:slug" element={<DayOf />} />
          <Route path="/dashboard/gallery" element={<DashboardLayout><PlanGate feature="gallery"><Gallery /></PlanGate></DashboardLayout>} />
          <Route path="/dashboard/volunteers" element={<DashboardLayout><PlanGate feature="volunteers"><Volunteers /></PlanGate></DashboardLayout>} />
          <Route path="/dashboard/surveys" element={<DashboardLayout><PlanGate feature="surveys"><Surveys /></PlanGate></DashboardLayout>} />
          <Route path="/dashboard/donations" element={<DashboardLayout><PlanGate feature="donations"><Donations /></PlanGate></DashboardLayout>} />
          <Route path="/dashboard/finances" element={<DashboardLayout><Finances /></DashboardLayout>} />
          <Route path="/dashboard/transactions" element={<DashboardLayout><Transactions /></DashboardLayout>} />
          <Route path="/dashboard/email-templates" element={<DashboardLayout><EmailTemplateEditor /></DashboardLayout>} />
          <Route path="/dashboard/email-log" element={<DashboardLayout><EmailLog /></DashboardLayout>} />
          <Route path="/dashboard/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
          <Route path="/dashboard/activity-log" element={<DashboardLayout><ActivityLog /></DashboardLayout>} />
          <Route path="/dashboard/team" element={<DashboardLayout><TeamManagementPage /></DashboardLayout>} />
          <Route path="/dashboard/organization-info" element={<DashboardLayout><OrganizationInfo /></DashboardLayout>} />
          <Route path="/dashboard/lodging" element={<DashboardLayout><Lodging /></DashboardLayout>} />
          <Route path="/dashboard/public-search" element={<DashboardLayout><PublicSearch /></DashboardLayout>} />
          <Route path="/dashboard/director-shop" element={<DashboardLayout><DirectorShop /></DashboardLayout>} />
          <Route path="/dashboard/upgrade" element={<DashboardLayout><UpgradePlan /></DashboardLayout>} />
          <Route path="/dashboard/payout-settings" element={<DashboardLayout><PayoutSettings /></DashboardLayout>} />
          <Route path="/dashboard/share-promote" element={<DashboardLayout><SharePromote /></DashboardLayout>} />
          <Route path="/dashboard/flyer-studio" element={<DashboardLayout><PlanGate feature="flyer-studio"><FlyerStudio /></PlanGate></DashboardLayout>} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/book" element={<Book />} />
          <Route path="/demo" element={<Navigate to="/book" replace />} />
          <Route path="/t/:slug" element={<PublicTournament />} />
          <Route path="/tournament/:slug" element={<PublicTournament />} />
          <Route path="/tournaments/search" element={<TournamentSearch />} />
          <Route path="/t/:slug/scoring" element={<LiveScoring />} />
          <Route path="/player/:slug/:token" element={<PlayerHub />} />
          <Route path="/live/:slug" element={<LiveLeaderboard />} />
          <Route path="/team/:slug" element={<TeamHomepage />} />
          <Route path="/league-score" element={<LeagueTeamScoring />} />
          <Route path="/league-score/:code" element={<LeagueTeamScoring />} />
          <Route path="/league-leaderboard/:eventId" element={<LeagueEventLeaderboard />} />

          <Route path="/score/:slug" element={<ScoreLogin />} />
          <Route path="/score/:slug/:code" element={<GroupScoring />} />
          <Route path="/sample/dashboard/:token" element={<SampleTournamentDashboard />} />
          <Route path="/sample/access/:token" element={<DemoAccess />} />

          <Route path="/sample/:slug" element={<SampleTournament />} />
          <Route path="/sample/:slug/dashboard" element={<SampleDashboardPreview />} />
          <Route path="/sample/:slug/live" element={<SampleLive />} />
           <Route path="/refund/:tournamentId" element={<RefundRequest />} />
           <Route path="/survey/:token" element={<Survey />} />
           <Route path="/checkin/:tournamentId" element={<ScanCheckIn />} />
          <Route path="/deck" element={<SalesDeck />} />
          <Route path="/sales-deck" element={<SalesDeck />} />
          <Route path="/flyer" element={<Flyer />} />
          <Route path="/accept-invitation" element={<AcceptInvitation />} />
          <Route path="/force-password-change" element={<ForcePasswordChange />} />
           <Route path="/nonprofits" element={<Nonprofits />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/golf-leagues" element={<GolfLeagues />} />
           <Route path="/how-it-works" element={<Navigate to="/plans" replace />} />
           <Route path="/pricing" element={<Navigate to="/plans" replace />} />
           <Route path="/enterprise-pricing" element={<EnterprisePricing />} />
           <Route path="/sample-organizer" element={<SampleDashboard />} />
           <Route path="/sample-organizer-public" element={<SampleOrganizer />} />
            <Route path="/sample-dashboard" element={<SampleDashboard />} />
            <Route path="/interactive-demo" element={<InteractiveDemo />} />
           <Route path="/college/:slug" element={<CollegeTournament />} />
           <Route path="/reset-password" element={<ResetPassword />} />
           <Route path="/faq" element={<FAQ />} />
           <Route path="/features" element={<Features />} />
           <Route path="/sales-hub" element={<Navigate to="/admin" replace />} />
           <Route path="/sales-hub/demo-talk-track" element={<DemoTalkTrack />} />
           <Route path="/sales/demo-agenda" element={<DemoAgenda />} />
           <Route path="/admin/study-sheet" element={<Navigate to="/admin" replace />} />
           <Route path="/admin/payouts" element={<AdminPayouts />} />
           <Route path="/admin/demo-converter" element={<DemoConverter />} />
            <Route path="/admin/demo-converter/:id" element={<DemoPreparation />} />
            <Route path="/admin/sales-hub/demo-agenda" element={<DemoAgendaEditor />} />
            <Route path="/demo/:token" element={<DemoTournamentSite />} />
            <Route path="/demo/:token/dashboard" element={<DemoDashboardPreview />} />
            <Route path="/demo/:token/live" element={<DemoLiveLeaderboard />} />
            <Route path="/demo/:token/day-of" element={<DemoDayOfPage />} />
            <Route path="/claim/:token" element={<Claim />} />
             <Route path="/claim-demo/:token" element={<ClaimDemo />} />
             <Route path="/demo-prep/:token" element={<DemoPrepShare />} />
             <Route path="/admin/competitors" element={<AdminCompetitors />} />
             <Route path="/admin/branding-footer" element={<AdminBrandingFooter />} />
            <Route path="/admin/college-hub/bookings" element={<CollegeHubBookings />} />
            <Route path="/admin/college-hub/surveys" element={<CollegeHubSurveys />} />
            <Route path="/s/:slug" element={<CollegeSurvey />} />
            <Route path="/admin/platform-tournaments" element={<PlatformTournaments />} />
            <Route path="/admin/league-invoices" element={<LeagueInvoices />} />
            <Route path="/admin/league-reconciliation" element={<LeagueReconciliation />} />
            <Route path="/admin/leagues" element={<AdminLeagues />} />


            <Route path="/admin/scoring/:tournamentId" element={<AdminScoring />} />
            <Route path="/admin/manage-events" element={<ManageEvents />} />
            <Route path="/admin/ai-sales-agent" element={<AiSalesAgent />} />
             <Route path="/college-hub/bookings" element={<CollegeHubBookingsPublic />} />
          <Route path="/admin/stripe-connections" element={<AdminStripeConnections />} />
          <Route path="/admin/course-database" element={<AdminCourseDatabase />} />
           <Route path="/admin/outreach" element={<AdminOutreach />} />
           <Route path="/unsubscribe" element={<Unsubscribe />} />
           <Route path="/admin/sales/flyer-to-demo" element={<FlyerToDemo />} />
           <Route path="/admin/sales/prospecting" element={<SalesProspecting />} />
           <Route path="/admin/demo-leads" element={<DemoLeads />} />
           <Route path="/admin/manual-entry-grants" element={<ManualEntryGrantsAdmin />} />
           <Route path="/admin/security" element={<AdminSecurity />} />
           <Route path="/admin/users-events" element={<AdminUsersEvents />} />
           <Route path="/admin/league-promo-codes" element={<LeaguePromoCodes />} />
           <Route path="/help" element={<HelpCenter />} />
           <Route path="/help/step-by-step" element={<StepByStep />} />
           <Route path="/help/connect-stripe" element={<ConnectStripe />} />
           <Route path="/help/fees-and-hold" element={<FeesAndHold />} />
           <Route path="/help/payout-schedule" element={<PayoutSchedule />} />
           <Route path="/help/tax-information" element={<TaxInformation />} />
           <Route path="/help/payment-settings" element={<PaymentSettings />} />
           <Route path="/help/refunds-chargebacks" element={<RefundsChargebacks />} />
           <Route path="/help/custom-domain" element={<CustomDomain />} />
          <Route path="/help/how-payments-work" element={<HowPaymentsWork />} />
           <Route path="/help/understanding-payout-timing" element={<UnderstandingPayoutTiming />} />
           <Route path="/help/finding-stripe-payouts" element={<FindingStripePayouts />} />
          <Route path="/help/uploading-images" element={<UploadingImages />} />
           <Route path="/compare" element={<Compare />} />
           <Route path="/compare/eventbrite-vs-teevents" element={<CompareEventbrite />} />
           <Route path="/compare/golf-genius-vs-teevents" element={<CompareGolfGenius />} />
           <Route path="/admin/sales-hub/compare-golf-genius" element={<CompareGolfGenius />} />
            <Route path="/compare/eventbrite-vs-teevents/pdf" element={<CompareEventbritePdf />} />
             <Route path="/sales-flyer" element={<SalesFlyer />} />
              <Route path="/t/:slug/sponsor" element={<SponsorRegistration />} />
              <Route path="/tournament/:slug/sponsor" element={<SponsorRegistration />} />
              <Route path="/t/:slug/vendors" element={<VendorRegistration />} />
              <Route path="/tournament/:slug/vendors" element={<VendorRegistration />} />
              <Route path="/t/:slug/add-ons" element={<PublicAddons />} />
              <Route path="/tournament/:slug/add-ons" element={<PublicAddons />} />
            <Route path="/dashboard/vendors" element={<DashboardLayout><Vendors /></DashboardLayout>} />
            <Route path="/dashboard/side-events" element={<DashboardLayout><SideEvents /></DashboardLayout>} />
            <Route path="/dashboard/team-performance" element={<DashboardLayout><TeamPerformance /></DashboardLayout>} />
             <Route path="/sponsor/:slug" element={<SponsorLandingPage />} />
            <Route path="/confirm-payout-change" element={<ConfirmPayoutChange />} />
            <Route path="/confirm-bank-change" element={<ConfirmBankChange />} />
             <Route path="/trips" element={<TripsList />} />
             <Route path="/trips/new" element={<TripNew />} />
             <Route path="/trips/public/:token" element={<PublicTrip />} />
             <Route path="/trips/:id" element={<TripDetail />} />
             <Route path="/golf-tournament-software" element={<GolfTournamentSoftware />} />
             <Route path="/charity-golf-tournament-planning" element={<CharityGolfTournamentPlanning />} />
              <Route path="/golf-fundraiser-management" element={<GolfFundraiserManagement />} />
            <Route path="/:slug" element={<SlugResolver />} />
            <Route path="*" element={<NotFound />} />

        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
