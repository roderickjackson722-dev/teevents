import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FinalCta, GetStarted, Hero, OutlineLight, h2 } from "@/components/marketing/PageBits";
import { FAQ_CATEGORIES } from "@/data/faqContent";
import { supabase } from "@/integrations/supabase/client";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const allKeys = FAQ_CATEGORIES.flatMap(c => c.items.map(i => `${c.name}::${i.q}`));
const jsonLd = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ_CATEGORIES.flatMap(c => c.items.map(i => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } }))) });

export default function FAQ() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string[]>([]);
  const [closedCats, setClosedCats] = useState<string[]>([]);
  const term = q.trim().toLowerCase();
  const cats = useMemo(() => FAQ_CATEGORIES.map(c => ({ ...c, items: c.items.filter(i => !term || `${i.q} ${i.a}`.toLowerCase().includes(term)) })).filter(c => c.items.length), [term]);

  const onChange = (cat: string, vals: string[]) => {
    const added = vals.filter(v => !open.includes(v));
    added.forEach(v => { const question = v.split("::")[1]; void supabase.from("faq_question_clicks").insert({ category: cat, question }); });
    setOpen([...open.filter(v => !v.startsWith(`${cat}::`)), ...vals]);
  };
  const jump = (name: string) => {
    setClosedCats(cs => cs.filter(c => c !== name));
    document.getElementById(slug(name))?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <Hero eyebrow="FREQUENTLY ASKED QUESTIONS" title="Questions? We Have Answers." subtitle="Everything you need to know about TeeVents, from pricing to payments to live scoring. If you do not see your question here, reach out and a real person will get back to you within one business day.">
        <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
          <Button asChild variant="secondary" size="lg" className="font-bold"><Link to="/contact">CONTACT US</Link></Button>
          <OutlineLight to="/get-started">GET STARTED</OutlineLight>
        </div>
      </Hero>

      <nav aria-label="FAQ categories" className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex gap-2 overflow-x-auto px-4 py-3">
          {FAQ_CATEGORIES.map(c => <button key={c.name} onClick={() => jump(c.name)} className="shrink-0 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:border-secondary hover:bg-secondary/15">{c.name}</button>)}
        </div>
      </nav>

      <section className="py-12"><div className="container mx-auto max-w-3xl px-4">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search questions" placeholder="Search questions by keyword" value={q} onChange={e => setQ(e.target.value)} className="h-12 pl-10 text-base" /></div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setOpen(allKeys); setClosedCats([]); }}>Expand All</Button>
          <Button variant="outline" size="sm" onClick={() => setOpen([])}>Collapse All</Button>
          {term && <span className="text-sm text-muted-foreground">{cats.reduce((n, c) => n + c.items.length, 0)} matching questions</span>}
        </div>

        {cats.length === 0 && <p className="mt-12 text-center text-muted-foreground">No questions match your search. <Link to="/contact" className="font-semibold text-primary underline">Contact us</Link> and a real person will help.</p>}
        {cats.map(c => {
          const collapsed = closedCats.includes(c.name) && !term;
          return (
            <section key={c.name} id={slug(c.name)} className="mt-12 scroll-mt-36">
              <button className="flex w-full items-center justify-between text-left" aria-expanded={!collapsed} onClick={() => setClosedCats(cs => collapsed ? cs.filter(x => x !== c.name) : [...cs, c.name])}>
                <h2 className={h2}>{c.name}</h2><span className="text-sm font-semibold text-muted-foreground">{collapsed ? "Show" : "Hide"}</span>
              </button>
              {!collapsed && <Accordion type="multiple" value={open.filter(v => v.startsWith(`${c.name}::`))} onValueChange={v => onChange(c.name, v)} className="mt-4 rounded-xl border border-border bg-card px-5 shadow-sm">
                {c.items.map(i => <AccordionItem key={i.q} value={`${c.name}::${i.q}`}><AccordionTrigger className="text-left">{i.q}</AccordionTrigger><AccordionContent className="text-muted-foreground">{i.a}</AccordionContent></AccordionItem>)}
              </Accordion>}
            </section>);
        })}
      </div></section>

      <FinalCta title="Still Have Questions?" subtitle="We are here to help. Reach out and a real person will get back to you within one business day.">
        <Button asChild variant="secondary" size="lg" className="font-bold"><Link to="/contact">CONTACT US</Link></Button>
        <OutlineLight to="/get-started">GET STARTED</OutlineLight>
      </FinalCta>
    </Layout>
  );
}
void GetStarted;
