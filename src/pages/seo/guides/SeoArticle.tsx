import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import type { GuideContent, GuideLink, MockupKind } from "./types";

// Full topic index shown at the bottom of every guide so visitors (and crawlers)
// can reach any article from any article.
const ALL_TOPICS: GuideLink[] = [
  { to: "/what-is-a-scramble", label: "What Is a Scramble in Golf?" },
  { to: "/golf-tournament-formats", label: "Golf Tournament Formats Explained" },
  { to: "/what-is-a-shotgun-start", label: "What Is a Shotgun Start?" },
  { to: "/charity-golf-tournament-guide", label: "How to Run a Charity Golf Tournament" },
  { to: "/golf-tournament-sponsor-management", label: "Golf Tournament Sponsor Management" },
  { to: "/live-scoring-golf-tournaments", label: "Live Scoring for Golf Tournaments" },
  { to: "/custom-golf-tournament-website", label: "Custom Golf Tournament Websites" },
  { to: "/golf-tournament-software-pricing", label: "Golf Tournament Software Pricing" },
  { to: "/eventbrite-vs-golf-tournament-software", label: "Eventbrite vs Golf Tournament Software" },
  { to: "/golfstatus-vs-golf-genius", label: "GolfStatus vs Golf Genius" },
  { to: "/golf-tournament-software", label: "Golf Tournament Software Overview" },
  { to: "/charity-golf-tournament-planning", label: "Charity Golf Tournament Planning" },
  { to: "/golf-fundraiser-management", label: "Golf Fundraiser Management" },
  { to: "/eventbrite-for-golf-tournaments", label: "Eventbrite for Golf Tournaments" },
  { to: "/golf-tournament-registration-platform", label: "Golf Tournament Registration Platform" },
  { to: "/best-golf-tournament-management-software", label: "Best Golf Tournament Management Software" },
  { to: "/online-golf-tournament-registration", label: "Online Golf Tournament Registration" },
  { to: "/golfstatus-alternatives", label: "GolfStatus Alternatives" },
  { to: "/golf-genius-alternatives", label: "Golf Genius Alternatives" },
  { to: "/perfect-golf-event-reviews", label: "Perfect Golf Event Reviews" },
  { to: "/rsvpify-for-golf-tournaments", label: "RSVPify for Golf Tournaments" },
  { to: "/golf-tournament-pairings-management", label: "Managing Golf Tournament Pairings" },
  { to: "/golf-tournament-handicap-system", label: "Golf Tournament Handicap System" },
  { to: "/golf-tournament-sponsor-packages", label: "Golf Tournament Sponsor Packages" },
  { to: "/golf-tournament-live-scoring", label: "Golf Tournament Live Scoring" },
  { to: "/golf-tournament-website-builder", label: "Golf Tournament Website Builder" },
  { to: "/golf-tournament-website-design", label: "Golf Tournament Website Design" },
  { to: "/branded-golf-event-page", label: "Branded Golf Event Page" },
  { to: "/golf-tournament-page-customization", label: "Golf Tournament Page Customization" },
];

const Mockup = ({ kind }: { kind: MockupKind }) => {
  const frames: Record<MockupKind, { label: string; rows: string[] }> = {
    leaderboard: {
      label: "Live Leaderboard",
      rows: ["1  Team Watson  −7  thru 18", "2  Bolton Builders  −5  thru 18", "3  First Tee Crew  −3  thru 16"],
    },
    site: {
      label: "Your Branded Event Site",
      rows: ["Hero image + your logo", "Register / Sponsor buttons", "Schedule · Sponsors · Course"],
    },
    sponsor: {
      label: "Sponsor Manager",
      rows: ["Title Sponsor — 1 of 1 sold", "Hole Sponsor — 12 of 18 sold", "Cart Sponsor — 2 of 2 sold"],
    },
    scoring: {
      label: "Score Entry",
      rows: ["Starting Hole 7 · Code 4F2K9B", "Hole 7 — enter team score", "Tap to confirm → next hole"],
    },
    pricing: {
      label: "Pricing",
      rows: ["Base — $0", "Pro — $399 one-time per tournament", "5% platform fee on paid transactions"],
    },
  };
  const frame = frames[kind];
  return (
    <figure className="my-8 rounded-xl border border-border bg-muted/40 p-5">
      <figcaption className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {frame.label}
      </figcaption>
      <div className="space-y-2">
        {frame.rows.map((row) => (
          <div key={row} className="rounded-md bg-background px-3 py-2 text-sm text-foreground shadow-sm">
            {row}
          </div>
        ))}
      </div>
    </figure>
  );
};

const SeoArticle = ({ content }: { content: GuideContent }) => (
  <Layout>
    <SEO
      title={content.metaTitle}
      description={content.metaDescription}
      path={`/${content.slug}`}
    />
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: content.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.q,
            acceptedAnswer: { "@type": "Answer", text: faq.a },
          })),
        }),
      }}
    />

    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
        <h1 className="text-3xl font-bold leading-tight sm:text-5xl">{content.title}</h1>
        <p className="mt-4 text-base opacity-90 sm:text-lg">{content.heroSubtitle}</p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/get-started">Start Your Tournament</Link>
        </Button>
      </div>
    </section>

    <article className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <p className="text-lg leading-relaxed text-muted-foreground">{content.intro}</p>

      {content.sections.map((section) => (
        <section key={section.heading} className="mt-10">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{section.heading}</h2>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="mt-4 leading-relaxed text-muted-foreground">
              {paragraph}
            </p>
          ))}
          {section.bullets && (
            <ul className="mt-4 space-y-2">
              {section.bullets.map((bullet) => (
                <li key={bullet.slice(0, 40)} className="flex gap-3 leading-relaxed text-muted-foreground">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
          {section.mockup && <Mockup kind={section.mockup} />}
        </section>
      ))}

      <section className="mt-14">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Frequently asked questions</h2>
        <dl className="mt-6 space-y-6">
          {content.faqs.map((faq) => (
            <div key={faq.q} className="rounded-lg border border-border p-5">
              <dt className="font-semibold text-foreground">{faq.q}</dt>
              <dd className="mt-2 leading-relaxed text-muted-foreground">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-14 rounded-xl bg-primary p-8 text-primary-foreground">
        <h2 className="text-2xl font-bold sm:text-3xl">{content.ctaHeading}</h2>
        <p className="mt-3 opacity-90">{content.ctaText}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/get-started">Start Your Tournament</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/request-sample">Request a Sample</Link>
          </Button>
        </div>
      </section>

      <nav className="mt-14" aria-label="Related guides">
        <h2 className="text-xl font-bold text-foreground">Keep reading</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {content.related.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className="block rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <nav className="mt-12 border-t border-border pt-8" aria-label="All golf tournament guides">
        <h2 className="text-xl font-bold text-foreground">All guides &amp; resources</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Every guide in the TeeVents library, in case you didn&apos;t find what you were looking for.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {ALL_TOPICS.map((topic) => {
            const isCurrent = topic.to === `/${content.slug}`;
            return (
              <li key={topic.to}>
                {isCurrent ? (
                  <span
                    aria-current="page"
                    className="block rounded-md bg-muted px-3 py-2 text-sm font-semibold text-foreground"
                  >
                    {topic.label}
                  </span>
                ) : (
                  <Link
                    to={topic.to}
                    className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {topic.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </article>
  </Layout>
);

export default SeoArticle;
