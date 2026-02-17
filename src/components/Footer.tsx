import { Link } from "react-router-dom";
import iconBlack from "@/assets/icon-black.png";

const Footer = () => {
  return (
    <footer className="bg-golf-green-dark text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <img src={iconBlack} alt="TeeVents" className="h-12 w-12 object-contain invert" />
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
            <Link to="/reviews" className="hover:text-secondary transition-colors">Reviews</Link>
            <Link to="/contact" className="hover:text-secondary transition-colors">Contact</Link>
            <Link to="/login" className="hover:text-secondary transition-colors">Coach Login</Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-primary-foreground/10 text-center text-xs text-primary-foreground/40">
          <p>&copy; {new Date().getFullYear()} TeeVents Golf Management. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
