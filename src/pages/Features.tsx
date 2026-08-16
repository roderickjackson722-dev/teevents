import { Link } from "react-router-dom";
import {
  Globe, CreditCard, Users, BarChart3, Award, MessageSquare, Trophy, QrCode,
  Smartphone, Printer, DollarSign, Palette, Shield, Building2, Calendar,
  ShoppingBag, Gift, HeartHandshake, ImageIcon, ClipboardList, Mail,
  Megaphone, FileText, Camera, Briefcase, Star, Zap, Layout as LayoutIcon,
} from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Tier = "Free" | "Pro";
type Feature = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  bullets: string[];
  tier: Tier;
};

// Ordered chronologically: from pre-planning through post-event wrap-up.
const categories: { name: string; subtitle: string; features: Feature[] }[] = [
  {
    name: "1. Plan & Set Up",
    subtitle: "Get your tournament off the ground in minutes.",
    features: [
      {
        icon: Calendar,
        title: "Tournament Creation",
        description: "Spin up a complete tournament in under 5 minutes.",
        bullets: [
          "Auto-generated titles based on course",
          "Course details, format, and date setup",
          "Save as draft or publish instantly",
          "Choose from 8 scoring formats",
        ],
        tier: "Free",
      },
      {
        icon: ClipboardList,
        title: "Planning Checklist",
        description: "A 30-step interactive guide that walks you through every milestone.",
        bullets: [
          "Triggered automatically on tournament creation",
          "Track progress as you go",
          "Best-practice tips at each step",
          "Built by tournament directors",
        ],
        tier: "Free",
      },
      {
        icon: Briefcase,
        title: "Payout Setup",
        description: "Three flexible ways to receive your tournament funds.",
        bullets: [
          "Stripe Connect — automatic payouts",
          "PayPal — bi-weekly transfers",
          "Check — mailed on request",
          "Secure admin-verified bank account changes",
        ],
        tier: "Free",
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
        tier: "Pro",
      },
    ],
  },
  {
    name: "2. Build Your Site & Brand",
    subtitle: "A professional public site for every event — no coding required.",
    features: [
      {
        icon: Globe,
        title: "Custom Tournament Website",
        description: "A branded public site for every event.",
        bullets: [
          "Six professional layout templates",
          "Mobile-responsive design",
          "Built-in tabs for sponsors, schedule, and rules",
          "SEO-friendly out of the box",
        ],
        tier: "Free",
      },
      {
        icon: LayoutIcon,
        title: "Site Builder",
        description: "Drag-and-drop editor to customize every section of your event page.",
        bullets: [
          "Live preview as you edit",
          "Color, logo, and hero image controls",
          "Public/private tab management",
          "Reorder sections with one click",
        ],
        tier: "Free",
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
        tier: "Pro",
      },
    ],
  },
  {
    name: "3. Promote & Sell",
    subtitle: "Marketing tools to fill your field and recruit sponsors.",
    features: [
      {
        icon: Megaphone,
        title: "Share & Promote",
        description: "Trackable links and share kits to get the word out.",
        bullets: [
          "Trackable share links (?ref parameters)",
          "QR codes for flyers",
          "Social media share kit",
          "Featured in TeeVents search (Pro)",
        ],
        tier: "Free",
      },
      {
        icon: Camera,
        title: "Flyer Studio",
        description: "Design custom marketing flyers without leaving TeeVents.",
        bullets: [
          "Canva integration",
          "Pre-built templates",
          "Tournament details added automatically",
          "Download or print",
        ],
        tier: "Free",
      },
      {
        icon: Award,
        title: "Sponsor Sales",
        description: "Tiered sponsorship sales with public landing pages.",
        bullets: [
          "Custom sponsor tiers and pricing",
          "Public sponsor landing pages",
          "Logo uploads and payment tracking",
          "Recognition on website and leaderboard",
        ],
        tier: "Free",
      },
    ],
  },
  {
    name: "4. Register Players & Sponsors",
    subtitle: "Take payments and manage signups from day one.",
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
        tier: "Free",
      },
      {
        icon: DollarSign,
        title: "Transparent Fees",
        description: "5% platform fee on paid transactions — no monthly subscriptions.",
        bullets: [
          "Combined platform + Stripe fee shown at checkout",
          "Free tier supports 1 tournament with 72 players",
          "Pay $399 only when upgrading a tournament to Pro",
          "No setup fees or hidden charges",
        ],
        tier: "Free",
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
        tier: "Free",
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
        tier: "Free",
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
        tier: "Pro",
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
        tier: "Free",
      },
    ],
  },
  {
    name: "5. Communicate with Players",
    subtitle: "Reach players, sponsors, and volunteers in seconds.",
    features: [
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
        tier: "Free",
      },
      {
        icon: MessageSquare,
        title: "Messaging",
        description: "Bulk messaging for last-minute updates and reminders.",
        bullets: [
          "Bulk email blasts",
          "SMS messaging (Pro)",
          "Scheduled sends",
          "Delivery tracking",
        ],
        tier: "Pro",
      },
    ],
  },
  {
    name: "6. Prepare for Tournament Day",
    subtitle: "Lock in pairings, print materials, and get on-course ready.",
    features: [
      {
        icon: Users,
        title: "Player & Pairing Management",
        description: "Manage every golfer, group, and hole assignment in one place.",
        bullets: [
          "Drag-and-drop pairings",
          "CSV import for bulk player upload",
          "Handicap tracking",
          "Hole assignments with shotgun support",
        ],
        tier: "Free",
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
        tier: "Free",
      },
      {
        icon: QrCode,
        title: "On-Site Check-In",
        description: "Fast check-in with QR code scanning from any phone.",
        bullets: [
          "Scan player QR codes from any phone",
          "Live check-in dashboard",
          "Tee time and group display",
          "Last-minute substitutions",
        ],
        tier: "Free",
      },
    ],
  },
  {
    name: "7. Tournament Day & Live Scoring",
    subtitle: "Real-time scoring and a leaderboard worthy of the big screen.",
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
        tier: "Free",
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
        tier: "Free",
      },
    ],
  },
  {
    name: "8. After the Event",
    subtitle: "Wrap up the books, share the memories, and improve next year.",
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
        tier: "Free",
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
        tier: "Free",
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
        tier: "Free",
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
        tier: "Pro",
      },
    ],
  },
  {
    name: "9. Trust & Support",
    subtitle: "Bank-level security and real human help — included for everyone.",
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
        tier: "Free",
      },
      {
        icon: Zap,
        title: "Real Human Support",
        description: "Talk to golf-industry pros, not chatbots.",
        bullets: [
          "In-app chat assistant",
          "Help center with step-by-step guides",
          "Phone and email support",
          "Priority response on Pro & Enterprise",
        ],
        tier: "Free",
      },
    ],
  },
];

const TierBadge = ({ tier }: { tier: Tier }) => {
  if (tier === "Pro") {
    return (
      <Badge className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 border-0 shrink-0">
        Pro
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="shrink-0">
      Free
    </Badge>
  );
};

const Features = () => {
  return (
    <Layout>
      <SEO
        title="All Features | TeeVents Golf Tournament Software"
        description="Explore every TeeVents feature in tournament-day order — from planning and registration through live scoring and post-event reporting. See what's included Free vs. Pro."
      />
      <div className="bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <header className="text-center max-w-3xl mx-auto mb-10 md:mb-14">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              Everything you need to run a great tournament
            </h1>
            <p className="text-lg text-muted-foreground">
              The full TeeVents toolkit, in the order you'll use it — from pre-planning
              concepts through tournament-day scoring and post-event wrap-up.
            </p>
            <div className="mt-6 flex flex-wrap justify-center items-center gap-3">
              <Badge variant="secondary" className="text-sm">Free — included for everyone</Badge>
              <Badge className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 border-0 text-sm">
                Pro — $399 per tournament
              </Badge>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90">
                <Link to="/get-started">Start a Tournament for Free</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/request-sample">Request a Sample</Link>
              </Button>
            </div>
          </header>

          <div className="space-y-14">
            {categories.map((cat) => (
              <section key={cat.name}>
                <div className="mb-6 border-b pb-3">
                  <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                    {cat.name}
                  </h2>
                  <p className="text-sm md:text-base text-muted-foreground mt-1">
                    {cat.subtitle}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {cat.features.map((f) => {
                    const Icon = f.icon;
                    return (
                      <Card key={f.title} className="h-full">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-md bg-primary/10 text-primary">
                                <Icon className="h-5 w-5" />
                              </div>
                              <CardTitle className="text-lg">{f.title}</CardTitle>
                            </div>
                            <TierBadge tier={f.tier} />
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
              Start free — the entire management platform is included. Add paid add-ons like custom domain, auction & raffle, or SMS blasts only when you need them.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90">
                <Link to="/get-started">Start a Tournament for Free</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/request-sample">Request a Sample</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Features;
