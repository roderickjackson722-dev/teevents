import { createFileRoute, Link } from "@tanstack/react-router";
import { getCollegeHubList } from "@/lib/serverMeta";

const SITE = "https://www.teevents.golf";
const TITLE = "College Golf Tournaments Hub";

export const Route = createFileRoute("/college/")({
  loader: () => getCollegeHubList(),
  head: () => ({
    meta: [
      { title: `${TITLE} | TeeVents` },
      { name: "description", content: TITLE },
      { property: "og:type", content: "website" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: TITLE },
      { property: "og:url", content: `${SITE}/college` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: TITLE },
    ],
    links: [{ rel: "canonical", href: `${SITE}/college` }],
  }),
  component: CollegeHubIndex,
});

function CollegeHubIndex() {
  const events = Route.useLoaderData();
  return (
    <main className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">{TITLE}</h1>
        <p className="mt-3 text-muted-foreground">
          Browse college golf tournaments hosted on TeeVents — schedules, details and registration.
        </p>
        <ul className="mt-10 grid gap-4">
          {events.map((event) => (
            <li key={event.slug} className="rounded-lg border bg-card p-5">
              <Link to="/college/$slug" params={{ slug: event.slug }} className="text-lg font-semibold text-foreground hover:underline">
                {event.title}
              </Link>
              {event.tagline ? <p className="mt-1 text-sm text-muted-foreground">{event.tagline}</p> : null}
            </li>
          ))}
          {events.length === 0 ? <li className="text-muted-foreground">No college tournaments are listed right now.</li> : null}
        </ul>
      </div>
    </main>
  );
}
