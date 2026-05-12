import { Link } from "react-router-dom";
import {
  Globe, CreditCard, Users, BarChart3, Award, MessageSquare, Trophy, QrCode,
  Smartphone, Printer, DollarSign, Palette, Shield, Tag, Building2, Calendar,
  ShoppingBag, Gift, HeartHandshake, ImageIcon, ClipboardList, Mail, MapPin,
  Megaphone, FileText, Camera, Briefcase, Star, Zap, Layout as LayoutIcon,
} from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Feature = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  bullets: string[];
};

const categories: { name: string; features: Feature[] }[] = [
  {
    name: "Tournament Setup",
    features: [
      {
        icon: Globe,
        title: "Custom Tournament Website",
        description: "A branded public site for every event — no coding required.",
        bullets: [
          "Six professional layout templates",
          "Custom domain support (yourtournament.com)",
          "Mobile-responsive design",
          "Built-in tabs for sponsors, schedule, and rules",
        ],
      },
      {
        icon: LayoutIcon,
        title: "Site Builder",
        description: "Drag-and-drop editor to customize every section of your event page.",
        bullets: [
          "Live preview as you edit",
          "Color, logo, and hero image controls",
          "Public/private tab management",
          "SEO-friendly out of the box",
        ],
      },
      {
        icon: Calendar,
        title: "Tournament Creation",
        description: "Spin up a complete tournament in under 5 minutes.",
        bullets: [
          "Auto-generated titles based on course",
          "30-step interactive planning checklist",
          "Course details, format, and date setup",
          "Save as draft or publish instantly",
        ],
      },
    ],
  },
  {
    name: "Registration & Payments",
    features: [
      {
        icon: CreditCard,
        title: "Online Registration",
        description: "Stripe-powered checkout with all major payment methods.",
        bullets: [
          "Apple Pay & Google Pay support",
          "Promo codes and discounts",
          "Add-on products at checkout",
          "Automated confirmation emails",
        ],
      },
      {
        icon: DollarSign,
        title: "Transparent Fees",
        description: "5% platform fee on paid transactions — no monthly subscriptions.",
        bullets: [
          "Combined platform + Stripe fee shown at checkout",
          "Pay $399 only when upgrading a tournament to Pro",
          "Free tier supports 1 tournament with 72 players",
          "No setup fees or hidden charges",
        ],
      },
      {
        icon: Briefcase,
        title: "Payout Methods",
        description: "Three flexible ways to receive your tournament funds.",
        bullets: [
          "Stripe Connect — automatic payouts",
          "PayPal — bi-weekly transfers",
          "Check — mailed on request",
          "Secure admin-verified bank account changes",
        ],
      },
      {
        icon: ClipboardList,
        title: "Waitlist Management",
        description: "Automated queue when your tournament fills up.",
        bullets: [
          "Players join waitlist with one click",
          "24-hour claim window when spots open",
          "Automatic email notifications",
          "Convert waitlist to registration",
        ],
      },
    ],
  },
  {
    name: "Players & Pairings",
    features: [
      {
        icon: Users,
        title: "Player Management",
        description: "Manage every golfer, group, and hole assignment in one place.",
        bullets: [
          "Drag-and-drop pairings",
          "CSV import for bulk player upload",
          "Handicap tracking",
          "Hole assignments with shotgun support",
        ],
      },
      {
        icon: QrCode,
        title: "Check-In",
        description: "Fast on-site check-in with QR code scanning.",
        bullets: [
          "Scan player QR codes from any phone",
          "Live check-in dashboard",
          "Tee time and group display",
          "Last-minute substitutions",
        ],
      },
    ],
  },
  {
    name: "Live Scoring & Leaderboard",
    features: [
      {
        icon: Smartphone,
        title: "Live Scoring",
        description: "Players enter scores from their phone — no app to download.",
        bullets: [
          "8 scoring formats (Stroke, Stableford, Scramble, Best Ball, more)",
          "6-character access codes for friction-less entry",
          "Hole-by-hole entry on any device",
          "Auto-saves to leaderboard in real-time",
        ],
      },
      {
        icon: Trophy,
        title: "Live Leaderboard",
        description: "Beautiful real-time leaderboard for big-screen displays.",
        bullets: [
          "Auto-refreshing standings",
          "Rotating sponsor banner",
          "Scrolling sponsor ticker",
          "Public share link for spectators",
        ],
      },
      {
        icon: Printer,
        title: "Printables",
        description: "Print-ready materials with embedded QR codes.",
        bullets: [
          "Scorecards with player QR codes",
          "Cart signs and hole assignments",
          "Name badges and alpha lists",
          "Sponsor signs",
        ],
      },
    ],
  },
  {
    name: "Sponsors & Revenue",
    features: [
      {
        icon: Award,
        title: "Sponsor Management",
        description: "Tiered sponsorship sales and recognition.",
        bullets: [
          "Custom sponsor tiers and pricing",
          "Logo uploads and payment tracking",
          "Leaderboard logo rotation",
          "Public sponsor landing pages",
        ],
      },
      {
        icon: ShoppingBag,
        title: "Add-On Store",
        description: "Sell merchandise, mulligans, and extras at checkout.",
        bullets: [
          "Full product CRUD (create, edit, delete)",
          "Inventory tracking",
          "Product images and descriptions",
          "Active/inactive toggle",
        ],
      },
      {
        icon: Gift,
        title: "Auction & Raffle",
        description: "Run silent auctions and raffles alongside your tournament.",
        bullets: [
          "Item listings with photos",
          "Live bidding",
          "Buy-now pricing",
          "Winner notifications",
        ],
      },
      {
        icon: HeartHandshake,
        title: "Donations",
        description: "Accept donations with optional 501(c)(3) tax receipts.",
        bullets: [
          "Custom donation amounts",
          "Nonprofit tax-exempt receipting",
          "Donor recognition wall",
          "Recurring donation support",
        ],
      },
    ],
  },
  {
    name: "Communication",
    features: [
      {
        icon: MessageSquare,
        title: "Messaging",
        description: "Reach players, sponsors, and volunteers in seconds.",
        bullets: [
          "Bulk email blasts",
          "SMS messaging (Pro)",
          "Scheduled sends",
          "Delivery tracking",
        ],
      },
      {
        icon: Mail,
        title: "Email Templates",
        description: "Customize every transactional and outreach email.",
        bullets: [
          "Editable confirmation emails",
          "Refund and waitlist notifications",
          "Group registration confirmations",
          "Branded sender identity",
        ],
      },
      {
        icon: Megaphone,
        title: "Share & Promote",
        description: "Marketing tools to fill your field.",
        bullets: [
          "Trackable share links (?ref parameters)",
          "QR codes for flyers",
          "Social media share kit",
          "Featured in TeeVents search (Pro)",
        ],
      },
      {
        icon: Camera,
        title: "Flyer Studio",
        description: "Design custom marketing flyers without leaving TeeVents.",
        bullets: [
          "Canva integration",
          "Pre-built templates",
          "Add tournament details automatically",
          "Download or print",
        ],
      },
    ],
  },
  {
    name: "Operations & Reporting",
    features: [
      {
        icon: BarChart3,
        title: "Real-Time Budget Tracker",
        description: "Live revenue, expenses, and profit/loss.",
        bullets: [
          "Categorized line items",
          "Auto-pulled registration revenue",
          "Manual expense entry",
          "Exportable summaries",
        ],
      },
      {
        icon: FileText,
        title: "Financial Reports",
        description: "Complete transaction history and revenue tracking.",
        bullets: [
          "Per-tournament and per-org views",
          "Refund and chargeback tracking",
          "Stripe payout sync",
          "1099-K friendly exports",
        ],
      },
      {
        icon: Users,
        title: "Team Management",
        description: "Add staff and volunteers with granular role-based access.",
        bullets: [
          "14 granular permissions",
          "Custom roles per organization",
          "Invitation-based onboarding",
          "Activity audit log",
        ],
      },
      {
        icon: ImageIcon,
        title: "Photo Gallery",
        description: "Public gallery for tournament photos and recap.",
        bullets: [
          "Drag-and-drop uploads",
          "Public share link",
          "Player photo tagging",
          "Download originals",
        ],
      },
      {
        icon: Star,
        title: "Post-Event Surveys",
        description: "Collect feedback and improve next year's event.",
        bullets: [
          "Customizable questions",
          "Email distribution",
          "Response analytics",
          "Anonymous responses option",
        ],
      },
    ],
  },
  {
    name: "Trust & Security",
    features: [
      {
        icon: Shield,
        title: "PCI Level 1 Payments",
        description: "Bank-level security on every transaction.",
        bullets: [
          "Stripe handles all card data",
          "TeeVents never holds organizer funds",
          "Destination charges split at checkout",
          "Strict PII storage policies",
        ],
      },
      {
        icon: Palette,
        title: "White-Label Branding",
        description: "Your tournament, your colors, your domain.",
        bullets: [
          "Custom domain (CNAME or A record)",
          "Upload your logo and brand colors",
          "No TeeVents branding on Pro events",
          "Branded email sender",
        ],
      },
      {
        icon: Zap,
        title: "Real Human Support",
        description: "Talk to golf-industry pros, not chatbots.",
        bullets: [
          "Priority response on Pro & Enterprise",
          "In-app chat assistant",
          "Help center with step-by-step guides",
          "Phone and email support",
        ],
      },
    ],
  },
];

const Features = () => {
  return (
    <Layout>
      <SEO
        title="All Features | TeeVents Golf Tournament Software"
        description="Explore every TeeVents feature: registration, live scoring, sponsors, payments, custom websites, and more — built for golf tournament organizers."
        
      />
      <div className="bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <header className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              Everything you need to run a great tournament
            </h1>
            <p className="text-lg text-muted-foreground">
              A complete platform for golf tournament organizers — from registration
              through live scoring and payouts. Below is the full feature list.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90">
                <Link to="/get-started">Get Started</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/plans">View Pricing</Link>
              </Button>
            </div>
          </header>

          <div className="space-y-14">
            {categories.map((cat) => (
              <section key={cat.name}>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-6 border-b pb-2">
                  {cat.name}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {cat.features.map((f) => {
                    const Icon = f.icon;
                    return (
                      <Card key={f.title} className="h-full">
                        <CardHeader>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-md bg-primary/10 text-primary">
                              <Icon className="h-5 w-5" />
                            </div>
                            <CardTitle className="text-lg">{f.title}</CardTitle>
                          </div>
                          <p className="text-sm text-muted-foreground">{f.description}</p>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1.5">
                            {f.bullets.map((b) => (
                              <li key={b} className="text-sm text-foreground flex gap-2">
                                <span className="text-primary mt-1.5 h-1 w-1 rounded-full bg-primary shrink-0" />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-16 text-center bg-card border rounded-xl p-8 md:p-12">
            <h3 className="text-2xl md:text-3xl font-display font-bold mb-3">
              Ready to run your next tournament?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Start free with one tournament up to 72 players. Upgrade to Pro for $399 per tournament when you need more.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90">
                <Link to="/get-started">Get Started</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/book">Book a Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Features;
