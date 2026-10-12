import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export const fade = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: 0.5 } };
export const h2 = "font-display text-3xl font-bold text-primary md:text-4xl";

export function Hero({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children?: ReactNode }) {
  return (
    <section className="bg-primary py-20 text-center text-primary-foreground md:py-28">
      <motion.div {...fade} className="container mx-auto max-w-4xl px-4">
        <p className="text-sm font-semibold tracking-widest text-secondary">{eyebrow}</p>
        <h1 className="mt-4 font-display text-4xl font-bold leading-tight md:text-6xl">{title}</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-foreground/85">{subtitle}</p>
        {children}
      </motion.div>
    </section>
  );
}

export function SectionHead({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: string }) {
  return (
    <motion.div {...fade} className="mx-auto mb-12 max-w-3xl text-center">
      {eyebrow && <p className="mb-3 text-sm font-semibold tracking-widest text-secondary">{eyebrow}</p>}
      <h2 className={h2}>{title}</h2>
      {subtitle && <p className="mt-3 text-lg text-muted-foreground">{subtitle}</p>}
    </motion.div>
  );
}

export function IconCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <motion.div {...fade} className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 w-fit rounded-lg bg-secondary/20 p-2.5 text-primary"><Icon className="h-5 w-5" aria-hidden="true" /></div>
      <h3 className="font-body text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-muted-foreground">{text}</p>
    </motion.div>
  );
}

export function Callout({ children }: { children: ReactNode }) {
  return <motion.p {...fade} className="mx-auto mt-10 max-w-3xl rounded-xl border-l-4 border-secondary bg-primary p-6 text-center text-lg text-primary-foreground">{children}</motion.p>;
}

export function GetStarted({ label = "GET STARTED" }: { label?: string }) {
  return <Button asChild variant="secondary" size="lg" className="font-bold"><Link to="/get-started">{label}<ArrowRight /></Link></Button>;
}

export function OutlineLight({ to, children }: { to: string; children: ReactNode }) {
  return <Button asChild variant="outline" size="lg" className="border-primary-foreground/50 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><Link to={to}>{children}</Link></Button>;
}

export function FinalCta({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section className="bg-primary py-20 text-center text-primary-foreground">
      <motion.div {...fade} className="container mx-auto max-w-3xl px-4">
        <h2 className="font-display text-3xl font-bold md:text-5xl">{title}</h2>
        <p className="mt-5 text-lg text-primary-foreground/85">{subtitle}</p>
        <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row"><GetStarted /><OutlineLight to="/request-sample">REQUEST A SAMPLE</OutlineLight></div>
      </motion.div>
    </section>
  );
}

export function Stats({ items }: { items: [string, string][] }) {
  return (
    <section className="bg-primary py-20 text-primary-foreground md:py-24">
      <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 text-center sm:grid-cols-2 lg:grid-cols-4">
        {items.map(([n, d]) => <motion.div {...fade} key={n}><p className="font-display text-5xl font-bold text-secondary md:text-6xl">{n}</p><p className="mx-auto mt-3 max-w-[16rem] text-primary-foreground/85">{d}</p></motion.div>)}
      </div>
    </section>
  );
}
