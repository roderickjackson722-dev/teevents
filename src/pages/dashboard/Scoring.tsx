import { useEffect, useState } from "react";
import { useSearchParams, Link as RouterLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trophy, Copy, ExternalLink, QrCode, Link2, Users, Loader2, Download, Calculator, FlaskConical } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { getFormatById } from "@/lib/scoringFormats";
import HandicapSettings from "@/components/dashboard/HandicapSettings";

export default function Scoring() {
  const { org, loading: orgLoading } = useOrgContext();
  const [selectedTournament, setSelectedTournament] = useState("");

  const { data: tournaments } = useQuery({
    queryKey: ["tournaments", org?.orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, title, course_par, slug, site_published, scoring_format")
        .eq("organization_id", org!.orgId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!org,
  });

  const selectedData = tournaments?.find((t) => t.id === selectedTournament);
  const scoringFormat = getFormatById(selectedData?.scoring_format || "stroke_play");

  const { data: registrations } = useQuery({
    queryKey: ["scoring-registrations", selectedTournament],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_registrations")
        .select("id, first_name, last_name, email, group_number, scoring_code")
        .eq("tournament_id", selectedTournament)
        .order("group_number")
        .order("last_name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTournament,
  });

  const scoringUrl = selectedData?.slug && selectedData?.site_published
    ? `${window.location.origin}/t/${selectedData.slug}/scoring`
    : null;

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!" });
  };

  // Group players by group_number for QR codes
  const groups = registrations?.reduce<Record<number, typeof registrations>>((acc, r) => {
    if (r.group_number != null) {
      if (!acc[r.group_number]) acc[r.group_number] = [];
      acc[r.group_number].push(r);
    }
    return acc;
  }, {}) || {};

  const printQRCodes = () => {
    window.print();
  };

  if (orgLoading) return <div className="p-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Scoring</h1>
        <p className="text-muted-foreground">Manage live scoring, QR codes, and scoring links for your tournaments.</p>
      </div>

      <Select value={selectedTournament} onValueChange={setSelectedTournament}>
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder="Select a tournament" />
        </SelectTrigger>
        <SelectContent>
          {tournaments?.map((t) => (
            <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!selectedTournament && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Select a tournament above to manage scoring.</p>
          </CardContent>
        </Card>
      )}

      {selectedTournament && (
        <Tabs defaultValue="links" className="space-y-4">
          <TabsList>
            <TabsTrigger value="links">
              <Link2 className="h-4 w-4 mr-1.5" /> Scoring Links
            </TabsTrigger>
            <TabsTrigger value="qr-codes">
              <QrCode className="h-4 w-4 mr-1.5" /> QR Codes
            </TabsTrigger>
            <TabsTrigger value="players">
              <Users className="h-4 w-4 mr-1.5" /> Player Codes
            </TabsTrigger>
            <TabsTrigger value="handicap">
              <Calculator className="h-4 w-4 mr-1.5" /> Handicap
            </TabsTrigger>
          </TabsList>

          {/* ===== SCORING LINKS TAB ===== */}
          <TabsContent value="links" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" /> Scoring Links & Access
                </CardTitle>
                <CardDescription>
                  Share these links with players so they can enter scores from their phones.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {scoringUrl ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{scoringFormat?.name || "Stroke Play"}</Badge>
                      <span className="text-sm text-muted-foreground">Par {selectedData?.course_par || 72}</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Public Scoring Page</label>
                        <div className="flex items-center gap-2">
                          <Input value={scoringUrl} readOnly className="flex-1 bg-muted" />
                          <Button variant="outline" size="icon" onClick={() => copyLink(scoringUrl)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" asChild>
                            <a href={scoringUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Players enter their group number or email to start scoring.
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1 block">Leaderboard Page</label>
                        <div className="flex items-center gap-2">
                          <Input
                            value={`${window.location.origin}/t/${selectedData?.slug}`}
                            readOnly
                            className="flex-1 bg-muted"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => copyLink(`${window.location.origin}/t/${selectedData?.slug}`)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Public leaderboard showing live scores.
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1 block">Admin Scoring (Dashboard)</label>
                        <Button variant="outline" asChild>
                          <a href="/dashboard/leaderboard">
                            <Trophy className="h-4 w-4 mr-1.5" /> Open Leaderboard & Score Entry
                          </a>
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">
                          Enter or edit scores directly from the admin dashboard.
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground">
                      {!selectedData?.slug
                        ? "This tournament doesn't have a public URL (slug) yet."
                        : "This tournament's site is not published yet. Publish it to enable player scoring links."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== QR CODES TAB ===== */}
          <TabsContent value="qr-codes" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <QrCode className="h-5 w-5" /> Scoring QR Codes
                    </CardTitle>
                    <CardDescription>
                      Print QR codes for each group. Players scan to go directly to their group's scoring page.
                    </CardDescription>
                  </div>
                  {Object.keys(groups).length > 0 && (
                    <Button variant="outline" onClick={printQRCodes} className="print:hidden">
                      <Download className="h-4 w-4 mr-1.5" /> Print QR Codes
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!scoringUrl ? (
                  <p className="text-muted-foreground text-center py-6">
                    Publish the tournament site to generate QR codes.
                  </p>
                ) : Object.keys(groups).length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">
                    No groups assigned yet. Assign players to groups in the Players page first.
                  </p>
                ) : (
                  <>
                    {/* Main QR code for general scoring page */}
                    <div className="mb-6 p-4 border rounded-lg flex items-center gap-6 print:break-after-page">
                      <QRCodeSVG value={scoringUrl} size={120} />
                      <div>
                        <h3 className="font-semibold text-lg">General Scoring Page</h3>
                        <p className="text-sm text-muted-foreground">
                          Players enter their group number or email to start.
                        </p>
                        <code className="text-xs text-muted-foreground mt-1 block break-all">{scoringUrl}</code>
                      </div>
                    </div>

                    {/* Per-group QR codes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(groups)
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .map(([groupNum, players]) => {
                          // Use the first player's scoring code for direct access
                          const firstCode = players[0]?.scoring_code;
                          const qrUrl = firstCode
                            ? `${scoringUrl}?code=${firstCode}`
                            : scoringUrl;

                          return (
                            <div
                              key={groupNum}
                              className="border rounded-lg p-4 flex flex-col items-center gap-3 print:break-inside-avoid"
                            >
                              <QRCodeSVG value={qrUrl} size={140} />
                              <div className="text-center">
                                <h4 className="font-semibold">Group {groupNum}</h4>
                                <div className="text-xs text-muted-foreground">
                                  {players.map((p) => `${p.first_name} ${p.last_name?.[0] || ""}.`).join(", ")}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== PLAYER CODES TAB ===== */}
          <TabsContent value="players" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" /> Player Scoring Codes
                </CardTitle>
                <CardDescription>
                  Each player receives a unique scoring code. They can use it to access their group's scorecard directly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!registrations || registrations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">No players registered yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Player</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="text-center">Group</TableHead>
                          <TableHead>Scoring Code</TableHead>
                          <TableHead className="text-center">Direct Link</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {registrations.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">
                              {r.first_name} {r.last_name}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{r.email}</TableCell>
                            <TableCell className="text-center">
                              {r.group_number != null ? (
                                <Badge variant="secondary">Group {r.group_number}</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {r.scoring_code ? (
                                <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                                  {r.scoring_code}
                                </code>
                              ) : (
                                <span className="text-xs text-muted-foreground">Not assigned</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {scoringUrl && r.scoring_code ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyLink(`${scoringUrl}?code=${r.scoring_code}`)}
                                >
                                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          {/* ===== HANDICAP SETTINGS TAB ===== */}
          <TabsContent value="handicap" className="space-y-4">
            <HandicapSettings tournamentId={selectedTournament} scoringFormat={selectedData?.scoring_format || undefined} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
