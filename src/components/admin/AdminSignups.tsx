import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserPlus, Users, Phone, Mail, Building2, ExternalLink, Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SignupRow = {
  kind: "new_organizer" | "team_invite";
  created_at: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  organization: string | null;
  planning_status: string | null;
  role: string | null;
  heard_from: string | null;
  status: string | null;
  tournament_title?: string | null;
};

const PLAN_LABELS: Record<string, string> = {
  scheduled: "Has date scheduled",
  planning: "Planning, no date yet",
  browsing: "Just exploring",
};

const LOGIN_URL = "https://www.teevents.golf/login";
const ROD_PHONE = "404-781-7140";
const ROD_EMAIL = "info@teevents.golf";

export const WELCOME_EMAIL_SUBJECT = "Welcome to TeeVents — here's my direct contact info";

export function buildWelcomeEmail(name?: string | null) {
  const first = (name || "").trim().split(/\s+/)[0] || "there";
  return `Hi ${first},

Welcome to TeeVents! I'm Rod Jackson, the founder, and I wanted to reach out personally to say thank you for signing up.

You can log in to your dashboard anytime here:
${LOGIN_URL}

My goal is to make your tournament as easy as possible to run. If you have ANY questions — setting up your event page, adding players, sponsors, payments, or anything else — please reach out to me directly:

Phone: ${ROD_PHONE}
Email: ${ROD_EMAIL}

Don't hesitate to call or text. I'm happy to walk you through anything, and I'd rather hear from you early than have you stuck on something.

Looking forward to working with you.

Best,
Rod Jackson
Founder, TeeVents Golf
${ROD_PHONE} | ${ROD_EMAIL}
https://www.teevents.golf`;
}

function WelcomeEmailTemplate() {
  const [copied, setCopied] = useState<"subject" | "body" | null>(null);
  const body = buildWelcomeEmail(null);

  const copy = async (what: "subject" | "body") => {
    await navigator.clipboard.writeText(what === "subject" ? WELCOME_EMAIL_SUBJECT : body);
    setCopied(what);
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <Card className="p-4 border-[#F5A623]/50 bg-[#F5A623]/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Welcome Email Template</h3>
          <p className="text-sm text-muted-foreground">
            Copy and send from your own inbox to new organizers. Includes your phone, email, and the login link.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => copy("subject")}>
            {copied === "subject" ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
            Subject
          </Button>
          <Button size="sm" onClick={() => copy("body")}>
            {copied === "body" ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
            Copy Email
          </Button>
        </div>
      </div>
      <div className="mt-3 text-xs font-medium">Subject: {WELCOME_EMAIL_SUBJECT}</div>
      <pre className="mt-2 whitespace-pre-wrap text-sm bg-card border rounded-md p-3 max-h-64 overflow-auto">
        {body}
      </pre>
      <p className="text-xs text-muted-foreground mt-2">
        Tip: use the “Welcome Email” button on any signup below to copy a version personalized with their name.
      </p>
    </Card>
  );
}


export default function AdminSignups() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SignupRow[]>([]);
  const [filter, setFilter] = useState<"all" | "new_organizer" | "team_invite">("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: vetting }, { data: invites }] = await Promise.all([
        supabase
          .from("signup_vetting" as any)
          .select("email, full_name, phone, planning_status, roles, role_other, heard_from, heard_from_other, vetting_status, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("org_invitations" as any)
          .select("email, role, status, created_at, organization_id, organizations:organization_id(name)")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

      const vRows: SignupRow[] = ((vetting as any[]) || []).map((v) => ({
        kind: "new_organizer",
        created_at: v.created_at,
        email: v.email,
        full_name: v.full_name,
        phone: v.phone,
        organization: null,
        planning_status: v.planning_status,
        role: Array.isArray(v.roles) && v.roles.length ? v.roles.join(", ") : v.role_other || null,
        heard_from: v.heard_from === "other" ? v.heard_from_other : v.heard_from,
        status: v.vetting_status,
      }));

      const iRows: SignupRow[] = ((invites as any[]) || []).map((i) => ({
        kind: "team_invite",
        created_at: i.created_at,
        email: i.email,
        full_name: null,
        phone: null,
        organization: i.organizations?.name || null,
        planning_status: null,
        role: i.role,
        heard_from: null,
        status: i.status,
      }));

      const combined = [...vRows, ...iRows].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRows(combined);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (filter !== "all" && r.kind !== filter) return false;
    if (q) {
      const s = q.toLowerCase();
      return (
        r.email?.toLowerCase().includes(s) ||
        r.full_name?.toLowerCase().includes(s) ||
        r.phone?.toLowerCase().includes(s) ||
        r.organization?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const counts = {
    all: rows.length,
    new_organizer: rows.filter((r) => r.kind === "new_organizer").length,
    team_invite: rows.filter((r) => r.kind === "team_invite").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-display font-bold">Signup Backlog</h2>
        <p className="text-sm text-muted-foreground">
          Every person who signed up on the site — see whether it's a new organizer creating their own
          tournament or an existing team getting a granted-permission invite.
        </p>
      </div>

      <WelcomeEmailTemplate />


      <div className="flex flex-wrap gap-2 items-center">
        {(["all", "new_organizer", "team_invite"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              filter === k
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {k === "all" ? "All" : k === "new_organizer" ? "New Organizers" : "Team Invites"}
            <span className="ml-2 opacity-70">{counts[k]}</span>
          </button>
        ))}
        <Input
          className="max-w-xs ml-auto"
          placeholder="Search name, email, phone, org..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No signups match this filter.</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r, idx) => (
            <Card key={idx} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                    r.kind === "new_organizer" ? "bg-[#F5A623]/20 text-[#1a5c38]" : "bg-blue-100 text-blue-700"
                  }`}>
                    {r.kind === "new_organizer" ? <UserPlus className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{r.full_name || r.email}</span>
                      <Badge variant={r.kind === "new_organizer" ? "default" : "secondary"}>
                        {r.kind === "new_organizer" ? "New Organizer" : "Team Invite"}
                      </Badge>
                      {r.status && <Badge variant="outline">{r.status}</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" /> {r.email}
                      </div>
                      {r.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          <a href={`tel:${r.phone}`} className="hover:underline">{r.phone}</a>
                        </div>
                      )}
                      {r.organization && (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" /> Joining: <strong>{r.organization}</strong>
                        </div>
                      )}
                      {r.role && <div>Role: {r.role}</div>}
                      {r.planning_status && (
                        <div>Planning: {PLAN_LABELS[r.planning_status] || r.planning_status}</div>
                      )}
                      {r.heard_from && <div>Heard from: {r.heard_from}</div>}
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground shrink-0">
                  <div>{new Date(r.created_at).toLocaleString()}</div>
                  {r.kind === "new_organizer" && r.phone && (
                    <Button asChild size="sm" variant="outline" className="mt-2">
                      <a href={`tel:${r.phone}`}>
                        <Phone className="h-3.5 w-3.5 mr-1" /> Welcome Call
                      </a>
                    </Button>
                  )}
                  {r.email && (
                    <div className="flex flex-col items-end">
                      <Button asChild size="sm" variant="ghost" className="mt-1">
                        <a href={`mailto:${r.email}?subject=${encodeURIComponent(WELCOME_EMAIL_SUBJECT)}&body=${encodeURIComponent(buildWelcomeEmail(r.full_name))}`}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1" /> Email
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigator.clipboard.writeText(buildWelcomeEmail(r.full_name))}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" /> Welcome Email
                      </Button>
                    </div>
                  )}

                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
