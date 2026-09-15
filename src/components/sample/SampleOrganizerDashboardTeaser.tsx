import {
  BarChart3,
  CalendarClock,
  ChevronDown,
  ClipboardCheck,
  DollarSign,
  Eye,
  LayoutDashboard,
  Menu,
  Trophy,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Props {
  slug: string;
  eventName: string;
  eventDate: string | null;
  playerCount: number;
  revenueCents: number;
  primaryColor: string;
  secondaryColor: string;
}

const sections = [
  {
    label: "Event",
    items: ["Event Checklist & Timeline", "Event Details", "Quick Actions"],
  },
  {
    label: "Players & Pairings",
    items: ["Roster", "Pairings", "Registration Management", "Check-In"],
  },
  {
    label: "Leaderboard & Live Scoring",
    items: ["Leaderboard & Live Scoring", "Scoring Settings"],
  },
  {
    label: "Sponsors & Fundraising",
    items: ["Sponsors", "Donations", "Auctions"],
  },
];

export default function SampleOrganizerDashboardTeaser({
  slug,
  eventName,
  eventDate,
  playerCount,
  revenueCents,
  primaryColor,
  secondaryColor,
}: Props) {
  const dateLabel = eventDate
    ? new Date(`${eventDate}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Date to be announced";

  return (
    <section
      data-tour="organizer-dashboard"
      className="bg-golf-cream py-10 sm:py-14"
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: primaryColor }}
            >
              Organizer view
            </p>
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              The same TeeVents dashboard you’ll use
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              The tour focused on the four most common experiences. Your
              dashboard also includes rosters, drag-and-drop pairings, sponsors,
              finances, messaging, printables, and more.
            </p>
          </div>
          <Button
            asChild
            style={{ backgroundColor: secondaryColor, color: primaryColor }}
            className="font-bold"
          >
            <Link to={`/sample/${slug}/dashboard`}>
              Open Full Dashboard <Eye className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-background shadow-lg">
          <div className="flex min-h-[500px]">
            <aside
              className="hidden w-60 shrink-0 flex-col text-primary-foreground md:flex"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex h-16 items-center gap-2 border-b border-primary-foreground/20 px-4">
                <LayoutDashboard className="h-5 w-5" />
                <span className="font-bold">TeeVents</span>
              </div>
              <div className="space-y-4 p-3">
                {sections.map((section, sectionIndex) => (
                  <div
                    key={section.label}
                    className="border-l-2 pl-2"
                    style={{
                      borderColor:
                        sectionIndex === 0
                          ? secondaryColor
                          : "color-mix(in srgb, currentColor 35%, transparent)",
                    }}
                  >
                    <p className="mb-1 text-[10px] font-bold uppercase opacity-60">
                      {section.label}
                    </p>
                    {section.items.map((item, itemIndex) => (
                      <div
                        key={item}
                        className={`rounded-md px-2 py-1.5 text-xs ${sectionIndex === 0 && itemIndex === 0 ? "bg-primary-foreground/15 font-semibold" : "opacity-80"}`}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              <header
                className="flex h-16 items-center justify-between gap-3 border-b-2 px-3 sm:px-4"
                style={{
                  borderColor: secondaryColor,
                  backgroundColor: `${secondaryColor}18`,
                }}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="md:hidden"
                    aria-label="Open dashboard menu"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    style={{
                      backgroundColor: secondaryColor,
                      color: primaryColor,
                    }}
                  >
                    <LayoutDashboard className="h-4 w-4" /> Open Dashboard
                  </Button>
                  <span className="hidden truncate font-bold text-foreground sm:inline">
                    {eventName}
                  </span>
                </div>
                <Button size="sm" variant="outline" className="max-w-40">
                  <span className="truncate">{eventName}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </header>
              <main className="p-4 sm:p-6">
                <div
                  className="mb-5 rounded-lg border p-5"
                  style={{
                    borderColor: `${secondaryColor}66`,
                    backgroundColor: `${secondaryColor}18`,
                  }}
                >
                  <h3 className="text-2xl font-bold text-foreground">
                    Event Checklist &amp; Timeline
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Track tasks and key dates for {eventName}.
                  </p>
                </div>
                <div className="mb-5 flex gap-2 border-b border-border">
                  <span
                    className="inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    <ClipboardCheck className="h-4 w-4" /> Checklist
                  </span>
                  <span className="inline-flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                    <CalendarClock className="h-4 w-4" /> Timeline
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Tournaments", value: "1", icon: Trophy },
                    {
                      label: "Players",
                      value: String(playerCount),
                      icon: Users,
                    },
                    {
                      label: "Revenue",
                      value: `$${(revenueCents / 100).toLocaleString()}`,
                      icon: DollarSign,
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg border border-border bg-card p-4"
                    >
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{stat.label}</span>
                        <stat.icon
                          className="h-4 w-4"
                          style={{ color: primaryColor }}
                        />
                      </div>
                      <p className="mt-2 text-2xl font-bold text-foreground">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3
                      className="h-5 w-5"
                      style={{ color: primaryColor }}
                    />
                    <h4 className="font-bold text-foreground">
                      Upcoming event
                    </h4>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {eventName} · {dateLabel}
                  </p>
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
