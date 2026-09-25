import { Link } from "react-router-dom";
import logoBlack from "@/assets/logo-black.png";

const Footer = () => {
  return (
    <footer className="bg-golf-green-dark text-primary-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": "https://www.teevents.golf/#organization",
            name: "TeeVents Golf",
            alternateName: "TeeVents Golf Management",
            url: "https://www.teevents.golf/",
            logo: "https://www.teevents.golf/logo.png",
            email: "info@teevents.golf",
            description: "Golf tournament management platform for organizers.",
            address: { "@type": "PostalAddress", addressCountry: "US" },
            contactPoint: [
              {
                "@type": "ContactPoint",
                contactType: "customer support",
                email: "info@teevents.golf",
                areaServed: "US",
                availableLanguage: "English",
              },
            ],
          }),
        }}
      />
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <img src={logoBlack} alt="TeeVents" className="h-12 w-12 object-contain invert" />
            <div>
              <h3 className="font-display text-xl font-semibold">TeeVents Golf Mgt.</h3>
              <p className="text-sm text-primary-foreground/60 mt-1">
                Golf Tournament Planning & Consulting
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-primary-foreground/70">
            <Link to="/" className="hover:text-secondary transition-colors">Home</Link>
            <Link to="/about" className="hover:text-secondary transition-colors">About</Link>
            <Link to="/services" className="hover:text-secondary transition-colors">Services</Link>
            <Link to="/plans" className="hover:text-secondary transition-colors">Plans & Pricing</Link>
            <Link to="/events" className="hover:text-secondary transition-colors">Events</Link>
            <Link to="/reviews" className="hover:text-secondary transition-colors">Reviews</Link>
            <Link to="/contact" className="hover:text-secondary transition-colors">Contact</Link>
            <Link to="/compare/eventbrite-vs-teevents" className="hover:text-secondary transition-colors">Compare</Link>
            <Link to="/login" className="hover:text-secondary transition-colors">Organizer Login</Link>
          </div>
          </div>

          {/* Comparisons — clickable platform boxes */}
          <div className="mt-10">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-primary-foreground/60 mb-4">
              Comparisons
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
              <Link
                to="/compare/teevents-vs-eventbrite"
                className="group rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 p-4 transition-colors hover:border-secondary hover:bg-primary-foreground/10"
              >
                <p className="font-display font-semibold text-primary-foreground group-hover:text-secondary transition-colors">
                  TeeVents vs. Eventbrite
                </p>
                <p className="text-xs text-primary-foreground/50 mt-1">
                  Flat pricing vs. per-ticket fees — see the savings.
                </p>
              </Link>
              <Link
                to="/compare/golf-genius-vs-teevents"
                className="group rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 p-4 transition-colors hover:border-secondary hover:bg-primary-foreground/10"
              >
                <p className="font-display font-semibold text-primary-foreground group-hover:text-secondary transition-colors">
                  TeeVents vs. Golf Genius
                </p>
                <p className="text-xs text-primary-foreground/50 mt-1">
                  Full event platform at a fraction of the cost.
                </p>
              </Link>
              <Link
                to="/compare/teevents-vs-zeffy"
                className="group rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 p-4 transition-colors hover:border-secondary hover:bg-primary-foreground/10"
              >
                <p className="font-display font-semibold text-primary-foreground group-hover:text-secondary transition-colors">
                  TeeVents vs. Zeffy
                </p>
                <p className="text-xs text-primary-foreground/50 mt-1">
                  Donation forms vs. a full golf tournament platform.
                </p>
              </Link>
              <Link
                to="/compare/teevents-vs-givebutter"
                className="group rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 p-4 transition-colors hover:border-secondary hover:bg-primary-foreground/10"
              >
                <p className="font-display font-semibold text-primary-foreground group-hover:text-secondary transition-colors">
                  TeeVents vs. GiveButter
                </p>
                <p className="text-xs text-primary-foreground/50 mt-1">
                  Fundraising campaigns vs. golf-built event tools.
                </p>
              </Link>
              <Link
                to="/compare/teevents-vs-google-forms"
                className="group rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 p-4 transition-colors hover:border-secondary hover:bg-primary-foreground/10"
              >
                <p className="font-display font-semibold text-primary-foreground group-hover:text-secondary transition-colors">
                  TeeVents vs. Google Forms
                </p>
                <p className="text-xs text-primary-foreground/50 mt-1">
                  Spreadsheets vs. payments, pairings and scoring.
                </p>
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-primary-foreground/10 flex flex-col items-center gap-3 text-xs text-primary-foreground/40">

          <p className="text-primary-foreground/60 italic">Built by golf tournament managers, for golf tournament managers.</p>
          <div className="flex gap-4">
            <Link to="/privacy-policy" className="hover:text-secondary transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-secondary transition-colors">Terms of Service</Link>
          </div>
          <p>&copy; {new Date().getFullYear()} TeeVents Golf Management. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
