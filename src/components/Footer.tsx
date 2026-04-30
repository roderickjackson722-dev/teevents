import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Image } from "lucide-react";
import logoBlack from "@/assets/logo-black.png";
import { supabase } from "@/integrations/supabase/client";

type PastEventLink = {
  id: string;
  title: string;
  gallery_url: string | null;
  results_url: string | null;
};

const Footer = () => {
  const [pastEvents, setPastEvents] = useState<PastEventLink[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, title, gallery_url, results_url, display_order, date")
        .eq("managed_by_teevents", true)
        .eq("status", "past")
        .order("display_order", { ascending: true })
        .order("date", { ascending: false });

      const filtered = (data || []).filter(
        (t: any) => t.gallery_url || t.results_url
      );
      setPastEvents(filtered as PastEventLink[]);
    };
    load();
  }, []);

  return (
    <footer className="bg-golf-green-dark text-primary-foreground">
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
            <Link to="/how-it-works" className="hover:text-secondary transition-colors">How It Works</Link>
            <Link to="/pricing" className="hover:text-secondary transition-colors">Pricing</Link>
            <Link to="/events" className="hover:text-secondary transition-colors">Events</Link>
            <Link to="/reviews" className="hover:text-secondary transition-colors">Reviews</Link>
            <Link to="/contact" className="hover:text-secondary transition-colors">Contact</Link>
            <Link to="/compare/eventbrite-vs-teevents" className="hover:text-secondary transition-colors">Compare</Link>
            <Link to="/login" className="hover:text-secondary transition-colors">Coach Login</Link>
          </div>
        </div>

        {pastEvents.length > 0 && (
          <div className="mt-10 pt-8 border-t border-primary-foreground/10">
            <h4 className="font-display text-base font-semibold text-primary-foreground/90 mb-4 text-center md:text-left">
              Past Event Galleries & Results
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm text-primary-foreground/70">
              {pastEvents.map((evt) => (
                <li key={evt.id} className="flex items-start gap-2">
                  <Image className="h-3.5 w-3.5 mt-1 shrink-0 text-secondary" />
                  <div className="flex flex-col">
                    <span className="text-primary-foreground/90">{evt.title}</span>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      {evt.gallery_url && (
                        <a
                          href={evt.gallery_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-secondary transition-colors underline-offset-2 hover:underline"
                        >
                          Photos
                        </a>
                      )}
                      {evt.results_url && (
                        <a
                          href={evt.results_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-secondary transition-colors underline-offset-2 hover:underline"
                        >
                          Results
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-primary-foreground/10 flex flex-col items-center gap-3 text-xs text-primary-foreground/40">
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
