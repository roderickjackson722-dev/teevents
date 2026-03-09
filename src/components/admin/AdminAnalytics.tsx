import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Globe, Eye, Link as LinkIcon, MapPin, Monitor, Loader2 } from "lucide-react";

interface SiteVisit {
  id: string;
  page_url: string;
  referrer: string | null;
  user_agent: string | null;
  ip_address: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
}

const COLORS = ["#1a5c38", "#c8a84e", "#2d7a4f", "#e0c06e", "#3a9d68", "#8b6914", "#4db87e", "#a67c1a"];

const AdminAnalytics = () => {
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"today" | "7d" | "30d" | "all">("7d");

  useEffect(() => {
    fetchVisits();
  }, [range]);

  const fetchVisits = async () => {
    setLoading(true);
    let query = supabase
      .from("site_visits")
      .select("*")
      .order("created_at", { ascending: false });

    const now = new Date();
    if (range === "today") {
      query = query.gte("created_at", new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString());
    } else if (range === "7d") {
      query = query.gte("created_at", new Date(now.getTime() - 7 * 86400000).toISOString());
    } else if (range === "30d") {
      query = query.gte("created_at", new Date(now.getTime() - 30 * 86400000).toISOString());
    }

    const { data, error } = await query.limit(5000);
    if (error) console.error("Error fetching visits:", error);
    setVisits(data || []);
    setLoading(false);
  };

  // Aggregate: visits per day
  const visitsPerDay = (() => {
    const map: Record<string, number> = {};
    visits.forEach(v => {
      const day = new Date(v.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      map[day] = (map[day] || 0) + 1;
    });
    return Object.entries(map).reverse().map(([date, count]) => ({ date, visits: count }));
  })();

  // Top pages
  const topPages = (() => {
    const map: Record<string, number> = {};
    visits.forEach(v => {
      try {
        const path = new URL(v.page_url).pathname;
        map[path] = (map[path] || 0) + 1;
      } catch {
        map[v.page_url] = (map[v.page_url] || 0) + 1;
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([page, count]) => ({ page, count }));
  })();

  // Top referrers
  const topReferrers = (() => {
    const map: Record<string, number> = {};
    visits.forEach(v => {
      let ref = v.referrer || "Direct";
      if (ref === "" || ref === "Direct / No referrer") ref = "Direct";
      else {
        try {
          ref = new URL(ref).hostname;
        } catch { /* keep raw */ }
      }
      map[ref] = (map[ref] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([source, count]) => ({ source, count }));
  })();

  // Top locations
  const topLocations = (() => {
    const map: Record<string, number> = {};
    visits.forEach(v => {
      const loc = [v.city, v.country].filter(Boolean).join(", ") || "Unknown";
      map[loc] = (map[loc] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([location, count]) => ({ location, count }));
  })();

  // Unique IPs
  const uniqueVisitors = new Set(visits.map(v => v.ip_address).filter(Boolean)).size;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-xl">Site Analytics</h2>
        <Select value={range} onValueChange={(v) => setRange(v as any)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Visits", value: visits.length, icon: Eye },
          { label: "Unique Visitors", value: uniqueVisitors, icon: Globe },
          { label: "Pages Viewed", value: topPages.length, icon: Monitor },
          { label: "Referrer Sources", value: topReferrers.length, icon: LinkIcon },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Visits Over Time */}
      {visitsPerDay.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold text-sm text-muted-foreground mb-4">Visits Over Time</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={visitsPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="visits" stroke="#1a5c38" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Card className="p-6">
          <h3 className="font-semibold text-sm text-muted-foreground mb-4">Top Pages</h3>
          <div className="space-y-2">
            {topPages.map(({ page, count }, i) => (
              <div key={page} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-muted-foreground w-5 text-right">{i + 1}.</span>
                  <span className="truncate font-mono text-xs">{page}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(count / topPages[0].count) * 100}%` }}
                    />
                  </div>
                  <span className="font-medium w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
            {topPages.length === 0 && <p className="text-sm text-muted-foreground">No data yet</p>}
          </div>
        </Card>

        {/* Top Referrers */}
        <Card className="p-6">
          <h3 className="font-semibold text-sm text-muted-foreground mb-4">Traffic Sources</h3>
          {topReferrers.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={topReferrers}
                  dataKey="count"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ source, percent }) => `${source} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                  fontSize={11}
                >
                  {topReferrers.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">No data yet</p>
          )}
        </Card>
      </div>

      {/* Visitor Locations */}
      <Card className="p-6">
        <h3 className="font-semibold text-sm text-muted-foreground mb-4 flex items-center gap-2">
          <MapPin className="h-4 w-4" /> Visitor Locations
        </h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {topLocations.map(({ location, count }, i) => (
            <div key={location} className="flex items-center justify-between text-sm py-1.5 px-3 rounded bg-muted/50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground w-5 text-right font-mono text-xs">{i + 1}.</span>
                <span className="truncate">{location}</span>
              </div>
              <span className="font-medium text-primary ml-2">{count}</span>
            </div>
          ))}
          {topLocations.length === 0 && <p className="text-sm text-muted-foreground">No data yet</p>}
        </div>
      </Card>

      {/* Recent Visits Table */}
      <Card className="p-6">
        <h3 className="font-semibold text-sm text-muted-foreground mb-4">Recent Visits</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">Time</th>
                <th className="pb-2 pr-4">Page</th>
                <th className="pb-2 pr-4">Referrer</th>
                <th className="pb-2 pr-4">Location</th>
                <th className="pb-2">IP</th>
              </tr>
            </thead>
            <tbody>
              {visits.slice(0, 25).map(v => (
                <tr key={v.id} className="border-b border-muted/50">
                  <td className="py-2 pr-4 whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(v.created_at).toLocaleString("en-US", {
                      month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
                    })}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs truncate max-w-[160px]">
                    {(() => { try { return new URL(v.page_url).pathname; } catch { return v.page_url; } })()}
                  </td>
                  <td className="py-2 pr-4 text-xs truncate max-w-[140px]">
                    {v.referrer && v.referrer !== "Direct / No referrer" && v.referrer !== ""
                      ? (() => { try { return new URL(v.referrer).hostname; } catch { return v.referrer; } })()
                      : <span className="text-muted-foreground">Direct</span>}
                  </td>
                  <td className="py-2 pr-4 text-xs">
                    {[v.city, v.country].filter(Boolean).join(", ") || <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="py-2 text-xs font-mono text-muted-foreground">{v.ip_address || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visits.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No visits recorded yet</p>}
          {visits.length > 25 && (
            <p className="text-xs text-muted-foreground text-center mt-3">Showing 25 of {visits.length} visits</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AdminAnalytics;
