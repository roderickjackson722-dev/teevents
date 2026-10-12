import Layout from "@/components/Layout";
import type { LegalSection } from "@/data/legalContent";

const id = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const LAST_UPDATED = "October 12, 2026";

export default function LegalPage({ title, sections, email }: { title: string; sections: LegalSection[]; email: string }) {
  const go = (t: string) => document.getElementById(id(t))?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <Layout>
      <section className="bg-primary py-16 text-center text-primary-foreground print:bg-background print:py-6 print:text-foreground md:py-20">
        <div className="container mx-auto max-w-4xl px-4">
          <p className="text-sm font-semibold tracking-widest text-secondary">TEEVENTS GOLF MANAGEMENT</p>
          <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">{title}</h1>
          <p className="mt-4 text-primary-foreground/80 print:text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>
      <div className="container mx-auto max-w-6xl px-4 py-12 md:py-16 lg:grid lg:grid-cols-[260px_1fr] lg:gap-12">
        <aside className="print:hidden">
          <label className="mb-6 block lg:hidden">
            <span className="mb-2 block text-sm font-semibold text-foreground">Jump to a section</span>
            <select className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" defaultValue="" onChange={e => e.target.value && go(e.target.value)}>
              <option value="" disabled>Table of contents</option>
              {sections.map(s => <option key={s.title} value={s.title}>{s.title}</option>)}
            </select>
          </label>
          <nav aria-label="Table of contents" className="sticky top-24 hidden lg:block">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-secondary">Contents</p>
            <ol className="space-y-1 border-l border-border">
              {sections.map(s => <li key={s.title}><a href={`#${id(s.title)}`} onClick={e => { e.preventDefault(); go(s.title); }} className="block border-l-2 border-transparent py-1.5 pl-4 text-sm text-muted-foreground hover:border-secondary hover:text-primary">{s.title}</a></li>)}
            </ol>
          </nav>
        </aside>
        <article className="max-w-3xl space-y-10">
          {sections.map(s => (
            <section key={s.title} id={id(s.title)} className="scroll-mt-24 break-inside-avoid">
              <h2 className="font-display text-2xl font-bold text-primary">{s.title}</h2>
              <p className="mt-3 text-lg leading-relaxed text-foreground/85">{s.body.split(email).flatMap((part, i) => i ? [<a key={i} href={`mailto:${email}`} className="font-semibold text-primary underline decoration-secondary underline-offset-4">{email}</a>, part] : [part])}</p>
            </section>
          ))}
          <div className="rounded-xl border-l-4 border-secondary bg-muted/50 p-6">
            <h2 className="font-display text-xl font-bold text-primary">Questions?</h2>
            <p className="mt-2 text-foreground/85">Email us at <a href={`mailto:${email}`} className="font-semibold text-primary underline decoration-secondary underline-offset-4">{email}</a>.</p>
          </div>
        </article>
      </div>
    </Layout>
  );
}
