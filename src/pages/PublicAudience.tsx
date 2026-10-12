import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import HeroSection from "@/components/HeroSection";
import HomeHowItWorks from "@/components/HomeHowItWorks";
import { Button } from "@/components/ui/button";
import heroGolf from "@/assets/hero-golf.jpg";

export function HowItWorksPage() {
  return <Layout><SEO title="How It Works — Your Event Built For You | TeeVents" description="Tell your dedicated TeeVents rep about your event. We build your branded site, registration, pairings, and scoring so you can run your tournament." path="/how-it-works" /><HeroSection backgroundImage={heroGolf} title="How TeeVents Works" subtitle="A dedicated rep builds your event for you — on every plan." height="min-h-[420px]" /><HomeHowItWorks /><div className="bg-background px-6 pb-16 text-center"><Button asChild variant="secondary" size="lg"><Link to="/get-started">Get Started <ArrowRight /></Link></Button></div></Layout>;
}

const organizerBenefits = ["Your rep builds your professional tournament website", "Sell registrations & sponsorships online", "Manage players, pairings, and live scoring", "Get paid automatically — we never hold your money", "Share registration and financial reports with your board", "Invite staff and volunteers with role-based access"];
const golferBenefits = ["Discover & register for tournaments", "QR check-in & live scoring from your phone", "Follow the live leaderboard", "Instant email confirmation & calendar invites"];

function AudiencePage({ organizers }: { organizers: boolean }) {
  const title = organizers ? "For Tournament Organizers" : "For Golfers";
  const description = organizers ? "Your dedicated TeeVents rep builds your event. Manage registrations, sponsors, players, scoring, and reports in one place." : "Discover golf tournaments, register online, and follow live scoring with TeeVents.";
  return <Layout><SEO title={`${title} | TeeVents`} description={description} path={organizers ? "/for-organizers" : "/for-golfers"} /><HeroSection backgroundImage={heroGolf} title={title} subtitle={description} height="min-h-[440px]" /><section className="bg-background px-6 py-16 md:py-24"><div className="mx-auto max-w-4xl"><ul className="grid gap-6 sm:grid-cols-2">{(organizers ? organizerBenefits : golferBenefits).map(item => <li key={item} className="flex items-start gap-3 border-t border-border pt-5"><CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span className="text-foreground">{item}</span></li>)}</ul><div className="mt-12 text-center"><Button asChild variant="secondary" size="lg"><Link to={organizers ? "/get-started" : "/tournaments/search"}>{organizers ? "Get Started" : "Find a Tournament"}<ArrowRight /></Link></Button></div></div></section></Layout>;
}
export function ForOrganizersPage() { return <AudiencePage organizers />; }
export function ForGolfersPage() { return <AudiencePage organizers={false} />; }
