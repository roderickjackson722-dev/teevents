import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X, LogIn, User, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logoWhite from "@/assets/logo-white.png";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const baseLinks = [
  { label: "Home", to: "/" },
  { label: "Plans & Pricing", to: "/plans" },
  { label: "Find a Tournament", to: "/tournaments/search" },
  { label: "Leagues", to: "/golf-leagues" },
  { label: "About Us", to: "/about" },
  { label: "Reviews", to: "/reviews" },
  { label: "Contact", to: "/contact" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { enabled: tripsEnabled } = useFeatureFlag("enable_group_trips");
  const [user, setUser] = useState<{ email?: string | null } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const navLinks = tripsEnabled
    ? [...baseLinks.slice(0, 3), { label: "Group Trips", to: "/trips" }, ...baseLinks.slice(3)]
    : baseLinks;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const initials = (user?.email || "?").slice(0, 1).toUpperCase();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-golf-green-dark/95 backdrop-blur-sm border-b border-primary/20">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-3 flex-shrink-0">
          <img src={logoWhite} alt="TeeVents Golf" className="h-10 w-10 object-contain flex-shrink-0" />
          <span className="font-display text-xl font-semibold text-primary-foreground tracking-wide whitespace-nowrap">TeeVents</span>
        </Link>

        <div className="hidden lg:flex items-center gap-6 xl:gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium tracking-wider uppercase whitespace-nowrap transition-colors ${
                pathname === link.to ? "text-secondary" : "text-primary-foreground/80 hover:text-secondary"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/request-sample"
            className="hidden lg:inline-flex items-center gap-2 border border-primary-foreground/30 text-primary-foreground px-3 py-2 rounded-md text-sm font-semibold tracking-wider uppercase hover:bg-primary-foreground/10 transition-colors"
          >
            Request a Sample
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 bg-primary-foreground/10 text-primary-foreground px-3 py-2 rounded-md text-sm font-semibold hover:bg-primary-foreground/15 transition-colors">
                <span className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold">{initials}</span>
                <span className="hidden lg:inline max-w-[140px] truncate normal-case">{user.email}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
                  <Settings className="w-4 h-4 mr-2" /> Account Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link
                to="/get-started?mode=signin"
                className="flex items-center gap-2 border border-primary-foreground/30 text-primary-foreground px-3 py-2 rounded-md text-sm font-semibold tracking-wider uppercase hover:bg-primary-foreground/10 transition-colors"
              >
                <LogIn className="h-4 w-4" /> Sign In
              </Link>
              <Link
                to="/get-started"
                className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-md text-sm font-semibold tracking-wider uppercase hover:bg-secondary/90 transition-colors"
              >
                Start for Free
              </Link>
            </>
          )}
        </div>

        <button className="lg:hidden text-primary-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-golf-green-dark border-t border-primary/20 overflow-hidden"
          >
            <div className="flex flex-col p-4 gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`text-sm font-medium tracking-wider uppercase py-2 transition-colors ${
                    pathname === link.to ? "text-secondary" : "text-primary-foreground/80 hover:text-secondary"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/request-sample"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 border border-primary-foreground/30 text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold tracking-wider uppercase mt-2 w-fit"
              >
                Request a Sample
              </Link>
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-md text-sm font-semibold tracking-wider uppercase w-fit">
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </Link>
                  <button onClick={() => { setMobileOpen(false); handleSignOut(); }} className="flex items-center gap-2 text-primary-foreground/80 px-4 py-2 text-sm font-semibold tracking-wider uppercase w-fit">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/get-started?mode=signin" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 border border-primary-foreground/30 text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold tracking-wider uppercase w-fit">
                    <LogIn className="h-4 w-4" /> Sign In
                  </Link>
                  <Link to="/get-started" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-md text-sm font-semibold tracking-wider uppercase w-fit">
                    Start a Tournament for Free
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
