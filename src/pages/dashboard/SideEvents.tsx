import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Ticket, Tag, GripVertical } from "lucide-react";
import { toast } from "sonner";
import ManualEntryLimitModal from "@/components/ManualEntryLimitModal";
import { useManualEntryEnforcement } from "@/hooks/useManualEntryEnforcement";
import { pickTournamentId } from "@/hooks/useTournamentIdParam";

type CustomQuestion = {
  id: string;
  label: string;
  type: "checkbox" | "text" | "select";
  required: boolean;
  options?: string[]; // for type "select"
};

type SideEvent = {
  id: string;
  tournament_id: string;
  name: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  price_cents: number;
  max_tickets: number | null;
  tickets_sold: number;
  is_active: boolean;
  show_on_public: boolean;
  hide_ticket_count: boolean;
  display_order: number;
  custom_questions: CustomQuestion[] | null;
};

const empty = {
  name: "",
  description: "",
  event_date: "",
  location: "",
  price_dollars: "0",
  max_tickets: "",
  is_active: true,
  show_on_public: true,
  hide_ticket_count: false,
  custom_questions: [] as CustomQuestion[],
};

function exportTicketsCsv(tickets: any[], events: { id: string; name: string }[]) {
  const eventName = (id: string) => events.find((e) => e.id === id)?.name || "";
  const escape = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const headers = ["Event", "Attendee Name", "Email", "Phone", "Quantity", "Status", "Ticket Code", "Checked In", "Purchased At"];
  const rows = tickets.map((t) => [
    eventName(t.side_event_id), t.attendee_name, t.attendee_email, t.attendee_phone || "",
    t.quantity, t.payment_status, t.ticket_code,
    t.checked_in_at ? new Date(t.checked_in_at).toISOString() : "",
    t.created_at ? new Date(t.created_at).toISOString() : "",
  ]);
  const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `side-event-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SideEvents() {
  const { org } = useOrgContext();
  const { demoGuard } = useDemoMode();
  const qc = useQueryClient();
  const [tournamentId, setTournamentId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SideEvent | null>(null);
  const [form, setForm] = useState({ ...empty });
  const manualEntry = useManualEntryEnforcement(tournamentId || null);

  const { data: tournaments } = useQuery({
    queryKey: ["se-tournaments", org?.orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, title")
        .eq("organization_id", org!.orgId)
        .order("date", { ascending: false });
      if (error) throw error;
      if (data && data.length) setTournamentId(pickTournamentId(data as any, tournamentId));
      return data;
    },
    enabled: !!org,
  });

  const { data: events, isLoading } = useQuery({
    queryKey: ["side-events", tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("side_events")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("display_order")
        .order("created_at");
      if (error) throw error;
      return (data as any[]) as SideEvent[];
    },
    enabled: !!tournamentId,
  });

  const { data: tickets } = useQuery({
    queryKey: ["side-event-tickets", tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("side_event_tickets")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tournamentId,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  };

  const openEdit = (e: SideEvent) => {
    setEditing(e);
    setForm({
      name: e.name,
      description: e.description || "",
      event_date: e.event_date ? e.event_date.slice(0, 16) : "",
      location: e.location || "",
      price_dollars: (e.price_cents / 100).toFixed(2),
      max_tickets: e.max_tickets?.toString() || "",
      is_active: e.is_active,
      show_on_public: e.show_on_public,
      hide_ticket_count: e.hide_ticket_count ?? false,
      custom_questions: Array.isArray(e.custom_questions) ? e.custom_questions : [],
    });
    setOpen(true);
  };

  const save = async () => {
    if (demoGuard()) return;
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const payload = {
      tournament_id: tournamentId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      event_date: form.event_date ? new Date(form.event_date).toISOString() : null,
      location: form.location.trim() || null,
      price_cents: Math.round(parseFloat(form.price_dollars || "0") * 100),
      max_tickets: form.max_tickets ? parseInt(form.max_tickets, 10) : null,
      is_active: form.is_active,
      show_on_public: form.show_on_public,
      hide_ticket_count: form.hide_ticket_count,
      custom_questions: (form.custom_questions || []).filter((q) => q.label.trim()),
    };
    if (!editing) {
      const proceed = await manualEntry.guard("side_event", payload.price_cents);
      if (!proceed) return;
    }
    const { error } = editing
      ? await supabase.from("side_events").update(payload).eq("id", editing.id)
      : await supabase.from("side_events").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Side event updated" : "Side event created");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["side-events", tournamentId] });
  };

  const remove = async (id: string) => {
    if (demoGuard()) return;
    if (!confirm("Delete this side event? Sold tickets will remain in the database.")) return;
    const { error } = await supabase.from("side_events").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Side event deleted");
    qc.invalidateQueries({ queryKey: ["side-events", tournamentId] });
  };

  const toggleField = async (e: SideEvent, field: "is_active" | "show_on_public", value: boolean) => {
    if (demoGuard()) return;
    const { error } = await supabase.from("side_events").update({ [field]: value } as any).eq("id", e.id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["side-events", tournamentId] });
  };

  const checkInTicket = async (id: string) => {
    if (demoGuard()) return;
    const { error } = await supabase
      .from("side_event_tickets")
      .update({ checked_in_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Checked in");
      qc.invalidateQueries({ queryKey: ["side-event-tickets", tournamentId] });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <ManualEntryLimitModal
        open={!!manualEntry.pending}
        onOpenChange={(o) => { if (!o) manualEntry.cancelPending(); }}
        used={manualEntry.pending?.used ?? 0}
        freeLimit={manualEntry.pending?.limit ?? 10}
        initialAmountCents={manualEntry.pending?.amountCents ?? 0}
        hasStripe={manualEntry.pending?.hasStripe ?? true}
        submitting={manualEntry.submitting}
        onConfirm={manualEntry.confirmPending}
      />
      <div>
        <h1 className="text-3xl font-bold">Side Events</h1>
        <p className="text-muted-foreground">
          Sell tickets to dinners, parties, clinics, or any add-on event. Separate from golf registration.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 flex items-center gap-4 flex-wrap">
          <div className="min-w-64">
            <Label>Tournament</Label>
            <Select value={tournamentId} onValueChange={setTournamentId}>
              <SelectTrigger><SelectValue placeholder="Select tournament" /></SelectTrigger>
              <SelectContent>
                {tournaments?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="outline" disabled={!tournamentId}>
              <Link to="/dashboard/registration?tab=promos">
                <Tag className="h-4 w-4 mr-2" /> Promo Codes
              </Link>
            </Button>
            <Button onClick={openCreate} disabled={!tournamentId}>
              <Plus className="h-4 w-4 mr-2" /> New Side Event
            </Button>
          </div>
        </CardContent>
      </Card>

      {tournamentId && <SectionTitleEditor tournamentId={tournamentId} />}

      <Card>
        <CardHeader><CardTitle>Side Events</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : !events?.length ? (
            <p className="text-muted-foreground">No side events yet. Create one to start selling tickets.</p>
          ) : (
            <div className="space-y-3">
              {events.map((e) => {
                const soldOut = e.max_tickets != null && e.tickets_sold >= e.max_tickets;
                return (
                  <div key={e.id} className="border rounded-lg p-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{e.name}</h3>
                        <Badge variant="outline">${(e.price_cents / 100).toFixed(2)}</Badge>
                        {!e.is_active && <Badge variant="secondary">Inactive</Badge>}
                        {!e.show_on_public && <Badge variant="secondary">Hidden</Badge>}
                        {soldOut && <Badge variant="destructive">Sold Out</Badge>}
                      </div>
                      {e.description && <p className="text-sm text-muted-foreground mt-1">{e.description}</p>}
                      <div className="text-xs text-muted-foreground mt-1 space-x-3">
                        {e.event_date && <span>{new Date(e.event_date).toLocaleString()}</span>}
                        {e.location && <span>📍 {e.location}</span>}
                        <span>
                          🎟 {e.tickets_sold}{e.max_tickets ? ` / ${e.max_tickets}` : ""} sold
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <label className="flex items-center gap-2 text-sm">
                          <Switch checked={e.is_active} onCheckedChange={(v) => toggleField(e, "is_active", v)} />
                          Active
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <Switch checked={e.show_on_public} onCheckedChange={(v) => toggleField(e, "show_on_public", v)} />
                          Show on public site
                        </label>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => remove(e.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Ticket className="h-5 w-5" /> Tickets Sold</CardTitle>
          <Button size="sm" variant="outline" onClick={() => exportTicketsCsv(tickets || [], events || [])} disabled={!tickets?.length}>
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          {!tickets?.length ? (
            <p className="text-muted-foreground">No tickets sold yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4">Attendee</th>
                    <th className="py-2 pr-4">Event</th>
                    <th className="py-2 pr-4">Qty</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Code</th>
                    <th className="py-2 pr-4">Check-In</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t: any) => {
                    const ev = events?.find((e) => e.id === t.side_event_id);
                    return (
                      <tr key={t.id} className="border-b">
                        <td className="py-2 pr-4">
                          <div>{t.attendee_name}</div>
                          <div className="text-xs text-muted-foreground">{t.attendee_email}</div>
                        </td>
                        <td className="py-2 pr-4">{ev?.name || "—"}</td>
                        <td className="py-2 pr-4">{t.quantity}</td>
                        <td className="py-2 pr-4">
                          <Badge variant={t.payment_status === "paid" ? "default" : "secondary"}>{t.payment_status}</Badge>
                        </td>
                        <td className="py-2 pr-4 font-mono">{t.ticket_code}</td>
                        <td className="py-2 pr-4">
                          {t.checked_in_at ? (
                            <Badge variant="outline">✓ {new Date(t.checked_in_at).toLocaleString()}</Badge>
                          ) : t.payment_status === "paid" ? (
                            <Button size="sm" variant="outline" onClick={() => checkInTicket(t.id)}>Check In</Button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Side Event" : "New Side Event"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Welcome Dinner" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date & Time</Label>
                <Input type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price (USD)</Label>
                <Input type="number" min="0" step="0.01" value={form.price_dollars} onChange={(e) => setForm({ ...form, price_dollars: e.target.value })} />
              </div>
              <div>
                <Label>Max Tickets (blank = unlimited)</Label>
                <Input type="number" min="1" value={form.max_tickets} onChange={(e) => setForm({ ...form, max_tickets: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.show_on_public} onCheckedChange={(v) => setForm({ ...form, show_on_public: v })} />
                Show on public site
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.hide_ticket_count} onCheckedChange={(v) => setForm({ ...form, hide_ticket_count: v })} />
                Hide ticket count
              </label>
            </div>

            {/* Custom Questions Builder */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Registration Questions</Label>
                  <p className="text-xs text-muted-foreground">
                    Ask attendees to confirm waivers, dietary needs, shirt size, etc. during checkout.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm({
                      ...form,
                      custom_questions: [
                        ...(form.custom_questions || []),
                        {
                          id: crypto.randomUUID(),
                          label: "",
                          type: "checkbox",
                          required: true,
                        },
                      ],
                    })
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Question
                </Button>
              </div>

              {(form.custom_questions || []).length === 0 && (
                <p className="text-xs text-muted-foreground italic">No questions yet.</p>
              )}

              <div className="space-y-3">
                {(form.custom_questions || []).map((q, idx) => {
                  const update = (patch: Partial<CustomQuestion>) => {
                    const next = [...(form.custom_questions || [])];
                    next[idx] = { ...next[idx], ...patch };
                    setForm({ ...form, custom_questions: next });
                  };
                  const remove = () => {
                    const next = [...(form.custom_questions || [])];
                    next.splice(idx, 1);
                    setForm({ ...form, custom_questions: next });
                  };
                  return (
                    <div key={q.id} className="border rounded-md p-3 space-y-2 bg-muted/30">
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground mt-2 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder={
                              q.type === "checkbox"
                                ? "e.g. I agree to the event waiver"
                                : "e.g. What is your shirt size?"
                            }
                            value={q.label}
                            onChange={(e) => update({ label: e.target.value })}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Select value={q.type} onValueChange={(v: any) => update({ type: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="checkbox">Acknowledgment checkbox</SelectItem>
                                <SelectItem value="text">Short text answer</SelectItem>
                                <SelectItem value="select">Multiple choice</SelectItem>
                              </SelectContent>
                            </Select>
                            <label className="flex items-center gap-2 text-sm">
                              <Switch
                                checked={q.required}
                                onCheckedChange={(v) => update({ required: v })}
                              />
                              Required
                            </label>
                          </div>
                          {q.type === "select" && (
                            <div>
                              <Label className="text-xs">Options (one per line)</Label>
                              <Textarea
                                rows={3}
                                placeholder={"S\nM\nL\nXL"}
                                value={(q.options || []).join("\n")}
                                onChange={(e) =>
                                  update({
                                    options: e.target.value
                                      .split("\n")
                                      .map((s) => s.trim())
                                      .filter(Boolean),
                                  })
                                }
                              />
                            </div>
                          )}
                        </div>
                        <Button type="button" size="sm" variant="ghost" onClick={remove}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save Changes" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionTitleEditor({ tournamentId }: { tournamentId: string }) {
  const qc = useQueryClient();
  const { demoGuard } = useDemoMode();
  const [value, setValue] = useState<string>("");
  const [hidden, setHidden] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const { data } = useQuery({
    queryKey: ["se-section-title", tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("side_events_section_title")
        .eq("id", tournamentId)
        .maybeSingle();
      if (error) throw error;
      return (data as any)?.side_events_section_title ?? "";
    },
  });

  if (data !== undefined && !loaded) {
    const v = (data || "").toString();
    if (v === "__hidden__") {
      setHidden(true);
      setValue("");
    } else {
      setValue(v);
    }
    setLoaded(true);
  }

  const save = async () => {
    if (demoGuard()) return;
    const payload = hidden ? "__hidden__" : (value.trim() || null);
    const { error } = await supabase
      .from("tournaments")
      .update({ side_events_section_title: payload } as any)
      .eq("id", tournamentId);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["se-section-title", tournamentId] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Public section heading</CardTitle>
        <p className="text-sm text-muted-foreground">
          Controls the heading shown above your side events on the public tournament page.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={hidden} onCheckedChange={setHidden} />
          Hide the heading entirely on the public page
        </label>
        <div>
          <Label>Custom heading text</Label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Side Events & Tickets"
            disabled={hidden}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Leave blank to use the default ("Side Events & Tickets"), enter your own (e.g. "Add-Ons & Experiences"), or toggle the switch above to hide it completely.
          </p>
        </div>
        <Button onClick={save}>Save</Button>
      </CardContent>
    </Card>
  );
}
