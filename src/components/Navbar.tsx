import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logoWhite from "@/assets/logo-white.png";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "How It Works", to: "/how-it-works" },
  { label: "Get Started", to: "/pricing" },
  { label: "About Us", to: "/about" },
  { label: "Services", to: "/services" },
  { label: "Events", to: "/events" },
  { label: "Reviews", to: "/reviews" },
  { label: "Contact", to: "/contact" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-golf-green-dark/95 backdrop-blur-sm border-b border-primary/20">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-3">
          <img src={logoWhite} alt="TeeVents Golf" className="h-10 w-10 object-contain" />
          <span className="font-display text-xl font-semibold text-primary-foreground tracking-wide">
            TeeVents
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium tracking-wider uppercase transition-colors ${
                pathname === link.to
                  ? "text-secondary"
                  : "text-primary-foreground/80 hover:text-secondary"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/get-started"
            className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-md text-sm font-semibold tracking-wider uppercase hover:bg-secondary/90 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-primary-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-golf-green-dark border-t border-primary/20 overflow-hidden"
          >
            <div className="flex flex-col p-4 gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`text-sm font-medium tracking-wider uppercase py-2 transition-colors ${
                    pathname === link.to
                      ? "text-secondary"
                      : "text-primary-foreground/80 hover:text-secondary"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/get-started"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-md text-sm font-semibold tracking-wider uppercase mt-2 w-fit"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
