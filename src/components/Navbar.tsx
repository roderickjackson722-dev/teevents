import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoWhite from "@/assets/logo-white.png";

const navLinks = [
  { label: "Features", to: "/features" },
  { label: "Pricing", to: "/pricing" },
  { label: "About", to: "/about" },
  { label: "Reviews", to: "/reviews" },
  { label: "Find Your Event", to: "/find-your-event" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  const active = (to: string) => pathname === to || (to === "/pricing" && pathname === "/plans");
  return <nav aria-label="Main navigation" className="fixed inset-x-0 top-0 z-50 border-b border-primary-foreground/15 bg-golf-green-dark">
    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
      <Link to="/" className="flex shrink-0 items-center gap-3"><img src={logoWhite} alt="" className="h-10 w-10 object-contain" /><span className="font-display text-xl font-semibold text-primary-foreground">TeeVents</span></Link>
      <div className="hidden items-center gap-7 lg:flex">
        <Link to="/organizer-login" className="text-sm font-medium text-primary-foreground/85 hover:text-secondary">Organizer Login</Link>
        {navLinks.map(link => <Link key={link.to} to={link.to} aria-current={active(link.to) ? "page" : undefined} className={`text-sm font-medium transition-colors ${active(link.to) ? "text-secondary" : "text-primary-foreground/85 hover:text-secondary"}`}>{link.label}</Link>)}
        <Button asChild variant="secondary" className="font-semibold"><Link to="/get-started">Get Started</Link></Button>
      </div>
      <Button variant="ghost" size="icon" className="h-11 w-11 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground lg:hidden" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => setMobileOpen(open => !open)}>{mobileOpen ? <X /> : <Menu />}</Button>
    </div>
    {mobileOpen && <div id="mobile-navigation" className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-primary-foreground/15 bg-golf-green-dark px-6 py-5 lg:hidden">
      <div className="flex flex-col gap-2"><Link to="/organizer-login" className="flex min-h-11 items-center text-sm font-medium text-primary-foreground/85">Organizer Login</Link>{navLinks.map(link => <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)} className={`flex min-h-11 items-center text-sm font-medium ${active(link.to) ? "text-secondary" : "text-primary-foreground/85"}`}>{link.label}</Link>)}<Button asChild variant="secondary" className="mt-3 min-h-11 font-semibold"><Link to="/get-started" onClick={() => setMobileOpen(false)}>Get Started</Link></Button></div>
    </div>}
  </nav>;
}
