import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Gavel, Heart, BarChart3, Mail, Share2 } from "lucide-react";

const features = [
  { icon: DollarSign, title: "Multiple Revenue Streams", text: "Registrations, sponsorships, add-ons, donations, raffles, and silent auctions in one checkout." },
  { icon: Gavel, title: "Online Silent Auctions", text: "Run mobile-friendly bidding right from the tournament site." },
  { icon: Heart, title: "Donations Anywhere", text: "Add donation prompts to the website, registration flow, and live leaderboard." },
  { icon: BarChart3, title: "Real-Time Reporting", text: "Track total raised by category — registrations, sponsors, donations, auctions." },
  { icon: Mail, title: "Automated Tax Receipts", text: "Send 501(c)(3) compliant receipts automatically after every transaction." },
  { icon: Share2, title: "Built-in Promotion", text: "Trackable share links, QR codes, and a flyer studio so the right people show up." },
];

export default function GolfFundraiserManagement() {
  return (
    <Layout>
      <SEO
        title="Golf Fundraiser Management Software"
        description="Manage every part of your golf fundraiser — registrations, sponsorships, donations, silent auctions, and reporting — from one easy-to-use platform."
        path="/golf-fundraiser-management"
      />

      <section className="bg-gradient-to-b from-primary to-primary/90 text-primary-foreground">
        <div className="container mx-auto px-4 py-16 md:py-24 text-center max-w-4xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold leading-tight">
            Golf Fundraiser Management Software
          </h1>
          <p className="mt-5 text-base md:text-lg text-primary-foreground/85">
            Maximize every dollar raised at your golf fundraiser. Registration, sponsorships, donations,
            and auctions in one dashboard built for charity golf events.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90">
              <Link to="/get-started">Start Your Fundraiser</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/features">See All Features</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-14 md:py-20">
        <h2 className="text-2xl md:text-4xl font-display font-bold text-center mb-10">
          Everything a golf fundraiser needs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => {
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
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{f.text}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="text-center mt-12">
          <Button asChild size="lg" className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90">
            <Link to="/get-started">Launch Your Golf Fundraiser</Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
}
