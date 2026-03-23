import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart3, Mail, PhoneCall, Video, FileText, Users,
  TrendingUp, Target, CheckCircle2, XCircle, Clock, Send,
  ArrowRightLeft, Bell, Calendar, Plus, Loader2,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Prospect {
  id: string;
  status: string;
  contact_email: string;
  email_response_status: string | null;
  follow_up_count: number | null;
  last_email_sent_at: string | null;
  last_contacted_at: string | null;
  created_at: string;
  tournament_name?: string;
}

interface Activity {
  id: string;
  prospect_id: string;
  type: string;
  description: string;
  created_at: string;
}

interface Props {
  prospects: Prospect[];
  activities: Activity[];
  callAdminApi: (action: string, body: Record<string, any>) => Promise<any>;
  onRefresh: () => void;
}

const ACTIVITY_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  email: { label: "Emails Sent", icon: Mail, color: "hsl(var(--primary))" },
  call: { label: "Calls Made", icon: PhoneCall, color: "hsl(215, 70%, 50%)" },
  meeting: { label: "Meetings", icon: Video, color: "hsl(280, 60%, 50%)" },
  follow_up: { label: "Follow-Ups", icon: Bell, color: "hsl(35, 80%, 50%)" },
  note: { label: "Notes Added", icon: FileText, color: "hsl(160, 50%, 45%)" },
  status_change: { label: "Status Changes", icon: ArrowRightLeft, color: "hsl(0, 0%, 50%)" },
};

const STATUS_COLORS: Record<string, string> = {
  new: "hsl(210, 70%, 55%)",
  contacted: "hsl(45, 80%, 50%)",
  demo_scheduled: "hsl(280, 60%, 55%)",
  proposal_sent: "hsl(25, 80%, 55%)",
  negotiating: "hsl(240, 55%, 55%)",
  won: "hsl(140, 60%, 45%)",
  lost: "hsl(0, 65%, 50%)",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  demo_scheduled: "Demo Scheduled",
  proposal_sent: "Proposal Sent",
  negotiating: "Negotiating",
  won: "Won",
  lost: "Lost",
};

export default function AdminProspectStats({ prospects, activities }: Props) {
  // Activity counts by type
  const activityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of activities) {
      counts[a.type] = (counts[a.type] || 0) + 1;
    }
    return counts;
  }, [activities]);

  // Pipeline counts
  const pipelineCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of prospects) {
      counts[p.status] = (counts[p.status] || 0) + 1;
    }
    return counts;
  }, [prospects]);

  // Conversion rate
  const conversionRate = useMemo(() => {
    if (!prospects.length) return 0;
    const won = prospects.filter(p => p.status === "won").length;
    return Math.round((won / prospects.length) * 100);
  }, [prospects]);

  // Email response breakdown
  const emailResponseCounts = useMemo(() => {
    const counts: Record<string, number> = { none: 0, sent: 0, opened: 0, replied: 0, no_response: 0 };
    for (const p of prospects) {
      const status = p.email_response_status || "none";
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  }, [prospects]);

  // Weekly activity trend (last 8 weeks)
  const weeklyTrend = useMemo(() => {
    const weeks: { label: string; emails: number; calls: number; meetings: number; follow_ups: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(new Date(), i * 7));
      const weekEnd = endOfWeek(subDays(new Date(), i * 7));
      const weekActivities = activities.filter(a =>
        isWithinInterval(new Date(a.created_at), { start: weekStart, end: weekEnd })
      );
      weeks.push({
        label: format(weekStart, "MMM d"),
        emails: weekActivities.filter(a => a.type === "email").length,
        calls: weekActivities.filter(a => a.type === "call").length,
        meetings: weekActivities.filter(a => a.type === "meeting").length,
        follow_ups: weekActivities.filter(a => a.type === "follow_up").length,
      });
    }
    return weeks;
  }, [activities]);

  // Total follow-ups across all prospects
  const totalFollowUps = useMemo(() =>
    prospects.reduce((sum, p) => sum + (p.follow_up_count || 0), 0),
    [prospects]
  );

  // Pipeline chart data
  const pipelineData = useMemo(() =>
    Object.entries(STATUS_LABELS).map(([key, label]) => ({
      name: label,
      value: pipelineCounts[key] || 0,
      fill: STATUS_COLORS[key],
    })).filter(d => d.value > 0),
    [pipelineCounts]
  );

  const weeklyChartConfig: ChartConfig = {
    emails: { label: "Emails", color: "hsl(var(--primary))" },
    calls: { label: "Calls", color: "hsl(215, 70%, 50%)" },
    meetings: { label: "Meetings", color: "hsl(280, 60%, 50%)" },
    follow_ups: { label: "Follow-Ups", color: "hsl(35, 80%, 50%)" },
  };

  const pipelineChartConfig: ChartConfig = {
    value: { label: "Prospects" },
  };

  const topStats = [
    { label: "Total Prospects", value: prospects.length, icon: Users, color: "text-primary" },
    { label: "Emails Sent", value: activityCounts.email || 0, icon: Mail, color: "text-blue-500" },
    { label: "Calls Made", value: activityCounts.call || 0, icon: PhoneCall, color: "text-emerald-500" },
    { label: "Meetings Held", value: activityCounts.meeting || 0, icon: Video, color: "text-purple-500" },
    { label: "Follow-Ups", value: totalFollowUps, icon: Bell, color: "text-amber-500" },
    { label: "Conversion Rate", value: `${conversionRate}%`, icon: TrendingUp, color: "text-green-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" /> Prospecting Stats
        </h2>
        <p className="text-muted-foreground mt-1">
          Track outreach efforts, pipeline health, and conversion metrics.
        </p>
      </div>

      {/* Top-level stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {topStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4 text-center">
              <Icon className={`h-5 w-5 mx-auto mb-1 ${stat.color}`} />
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </Card>
          );
        })}
      </div>

      {/* Activity breakdown + Pipeline */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Activity breakdown by type */}
        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> Activity Breakdown
          </h3>
          <div className="space-y-3">
            {Object.entries(ACTIVITY_LABELS).map(([type, config]) => {
              const count = activityCounts[type] || 0;
              const totalActivities = activities.length || 1;
              const pct = Math.round((count / totalActivities) * 100);
              const Icon = config.icon;
              return (
                <div key={type} className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground font-medium">{config.label}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: config.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Pipeline distribution */}
        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-primary" /> Pipeline Distribution
          </h3>
          {pipelineData.length > 0 ? (
            <ChartContainer config={pipelineChartConfig} className="h-[200px]">
              <PieChart>
                <Pie
                  data={pipelineData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {pipelineData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">No prospects yet.</p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {pipelineData.map((d) => (
              <span key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Weekly activity trend */}
      <Card className="p-5">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" /> Weekly Activity Trend
        </h3>
        <ChartContainer config={weeklyChartConfig} className="h-[250px]">
          <BarChart data={weeklyTrend}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="emails" fill="var(--color-emails)" radius={[2, 2, 0, 0]} stackId="a" />
            <Bar dataKey="calls" fill="var(--color-calls)" radius={[2, 2, 0, 0]} stackId="a" />
            <Bar dataKey="meetings" fill="var(--color-meetings)" radius={[2, 2, 0, 0]} stackId="a" />
            <Bar dataKey="follow_ups" fill="var(--color-follow_ups)" radius={[2, 2, 0, 0]} stackId="a" />
          </BarChart>
        </ChartContainer>
      </Card>

      {/* Email response stats */}
      <Card className="p-5">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" /> Email Response Tracking
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { key: "sent", label: "Sent", icon: Send, color: "text-blue-500" },
            { key: "opened", label: "Opened", icon: Mail, color: "text-amber-500" },
            { key: "replied", label: "Replied", icon: CheckCircle2, color: "text-green-500" },
            { key: "no_response", label: "No Response", icon: XCircle, color: "text-red-400" },
            { key: "none", label: "Not Contacted", icon: Clock, color: "text-muted-foreground" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="text-center p-3 bg-muted/30 rounded-lg">
                <Icon className={`h-5 w-5 mx-auto mb-1 ${item.color}`} />
                <div className="text-xl font-bold text-foreground">{emailResponseCounts[item.key] || 0}</div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
