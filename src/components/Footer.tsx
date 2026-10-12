import { Link } from "react-router-dom";
import logoBlack from "@/assets/logo-black.png";

const Footer = (_props: { includeLeagueSearch?: boolean }) => {
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
        <div className="flex flex-col md:flex-row items-start justify-between gap-8">
          <div className="flex items-center gap-3">
            <img src={logoBlack} alt="TeeVents" className="h-12 w-12 object-contain invert" />
            <div>
              <h3 className="font-display text-xl font-semibold">TeeVents Golf Mgt.</h3>
              <p className="text-sm text-primary-foreground/60 mt-1">
                Golf Tournament Planning & Consulting
              </p>
            </div>
          </div>

          <div className="grid w-full max-w-3xl grid-cols-2 gap-8 text-sm md:grid-cols-4">
            {[
              ["Platform", [["Features", "/features"], ["Pricing", "/pricing"], ["How It Works", "/#how-it-works"], ["Compare", "/compare"]]],
              ["Who It's For", [["For Organizers", "/for-organizers"], ["For Golfers", "/for-golfers"], ["Services", "/services"]]],
              ["Resources", [["Find Your Event", "/find-your-event"], ["Organizer Login", "/organizer-login"], ["Contact", "/contact"]]],
              ["Company", [["About", "/about"], ["Reviews", "/reviews"], ["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"]]],
            ].map(([heading, links]) => (
              <div key={heading as string}>
                <h4 className="mb-3 font-semibold text-secondary">{heading as string}</h4>
                <ul className="space-y-2 text-primary-foreground/70">
                  {(links as string[][]).map(([label, to]) => <li key={label}><Link to={to} className="hover:text-secondary transition-colors">{label}</Link></li>)}
                </ul>
              </div>
            ))}
          </div>
          </div>

          <div className="mt-8 pt-6 border-t border-primary-foreground/10 flex flex-col items-center gap-3 text-xs text-primary-foreground/40">

          <p className="text-primary-foreground/60 italic text-center">Built by a tournament director for tournament directors.</p>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-secondary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-secondary transition-colors">Terms of Service</Link>
          </div>
          <p>&copy; 2026 TeeVents Golf Management. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
