import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus, Trash2, Check, X, LogOut, Calendar, MapPin, Link as LinkIcon,
  Users, Mail, FileText, ChevronDown, ChevronUp, Pencil, Save
} from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Tables<"events">[]>([]);
  const [requests, setRequests] = useState<Tables<"event_access_requests">[]>([]);
  const [approvedEmails, setApprovedEmails] = useState<Tables<"approved_emails">[]>([]);
  const [resources, setResources] = useState<Tables<"event_resources">[]>([]);
  const [activeTab, setActiveTab] = useState<"events" | "requests" | "emails">("events");
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  // New event form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newStatus, setNewStatus] = useState<"current" | "past">("current");
  const [newImageUrl, setNewImageUrl] = useState("");

  // New email form
  const [newEmailEventId, setNewEmailEventId] = useState("");
  const [newEmail, setNewEmail] = useState("");

  // New resource form
  const [newResEventId, setNewResEventId] = useState("");
  const [newResTitle, setNewResTitle] = useState("");
  const [newResDesc, setNewResDesc] = useState("");
  const [newResLink, setNewResLink] = useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/admin-login"); return; }

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) { navigate("/admin-login"); return; }

    await fetchAll();
    setLoading(false);
  };

  const fetchAll = async () => {
    const [eventsRes, requestsRes, emailsRes, resourcesRes] = await Promise.all([
      supabase.from("events").select("*").order("date", { ascending: false }),
      supabase.from("event_access_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("approved_emails").select("*").order("created_at", { ascending: false }),
      supabase.from("event_resources").select("*").order("sort_order", { ascending: true }),
    ]);
    setEvents(eventsRes.data || []);
    setRequests(requestsRes.data || []);
    setApprovedEmails(emailsRes.data || []);
    setResources(resourcesRes.data || []);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const addEvent = async () => {
    if (!newTitle.trim()) return;
    const { error } = await supabase.from("events").insert({
      title: newTitle.trim(), description: newDesc.trim() || null,
      date: newDate || null, location: newLocation.trim() || null,
      link: newLink.trim() || null, status: newStatus, image_url: newImageUrl.trim() || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewTitle(""); setNewDesc(""); setNewDate(""); setNewLocation(""); setNewLink(""); setNewImageUrl("");
    await fetchAll();
    toast({ title: "Event added!" });
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("events").delete().eq("id", id);
    await fetchAll();
    toast({ title: "Event deleted" });
  };

  const updateRequestStatus = async (id: string, status: "approved" | "denied") => {
    await supabase.from("event_access_requests").update({ status }).eq("id", id);
    await fetchAll();
    toast({ title: `Request ${status}` });
  };

  const addApprovedEmail = async () => {
    if (!newEmailEventId || !newEmail.trim()) return;
    const { error } = await supabase.from("approved_emails").insert({
      event_id: newEmailEventId, email: newEmail.trim().toLowerCase(),
    });
    if (error) {
      toast({ title: "Error", description: error.code === "23505" ? "Email already added" : error.message, variant: "destructive" });
      return;
    }
    setNewEmail("");
    await fetchAll();
    toast({ title: "Email added to auto-approve list" });
  };

  const removeApprovedEmail = async (id: string) => {
    await supabase.from("approved_emails").delete().eq("id", id);
    await fetchAll();
  };

  const addResource = async () => {
    if (!newResEventId || !newResTitle.trim()) return;
    const { error } = await supabase.from("event_resources").insert({
      event_id: newResEventId, title: newResTitle.trim(),
      description: newResDesc.trim() || null, link: newResLink.trim() || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewResTitle(""); setNewResDesc(""); setNewResLink("");
    await fetchAll();
    toast({ title: "Resource added!" });
  };

  const deleteResource = async (id: string) => {
    await supabase.from("event_resources").delete().eq("id", id);
    await fetchAll();
  };

  if (loading) return <Layout><div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div></Layout>;

  const getEventTitle = (eventId: string) => events.find(e => e.id === eventId)?.title || "Unknown";

  return (
    <Layout>
      {/* Header */}
      <section className="bg-primary py-8">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-primary-foreground">Admin Dashboard</h1>
            <p className="text-primary-foreground/70 mt-1">Manage events, access, and resources</p>
          </div>
          <Button variant="ghost" onClick={handleSignOut} className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary/80">
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>
      </section>

      <section className="bg-golf-cream min-h-[70vh] py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Tabs */}
          <div className="flex gap-2 mb-8 border-b border-border pb-2">
            {([
              ["events", "Events", Calendar],
              ["requests", "Access Requests", Users],
              ["emails", "Auto-Approve Emails", Mail],
            ] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-md text-sm font-medium transition-colors ${
                  activeTab === key ? "bg-card border border-b-0 border-border text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
                {key === "requests" && requests.filter(r => r.status === "pending").length > 0 && (
                  <span className="bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 ml-1">
                    {requests.filter(r => r.status === "pending").length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Events Tab */}
          {activeTab === "events" && (
            <div className="space-y-6">
              {/* Add Event Form */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="font-display font-bold text-lg mb-4">Add New Event</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Title *" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                  <Input placeholder="Description" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                  <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
                  <Input placeholder="Location" value={newLocation} onChange={e => setNewLocation(e.target.value)} />
                  <Input placeholder="Link (URL)" value={newLink} onChange={e => setNewLink(e.target.value)} />
                  <Input placeholder="Image URL" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} />
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as "current" | "past")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="current">Current</option>
                    <option value="past">Past</option>
                  </select>
                  <Button onClick={addEvent}><Plus className="h-4 w-4 mr-1" /> Add Event</Button>
                </div>
              </div>

              {/* Events List */}
              {events.map(event => (
                <div key={event.id} className="bg-card rounded-lg border border-border">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        event.status === "current" ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"
                      }`}>{event.status}</span>
                      <h3 className="font-display font-semibold">{event.title}</h3>
                      {event.date && <span className="text-xs text-muted-foreground">{new Date(event.date).toLocaleDateString()}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)} className="text-muted-foreground hover:text-foreground">
                        {expandedEvent === event.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <button onClick={() => deleteEvent(event.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded: Resources */}
                  {expandedEvent === event.id && (
                    <div className="border-t border-border p-4">
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-1"><FileText className="h-4 w-4" /> Resources</h4>
                      <div className="space-y-2 mb-4">
                        {resources.filter(r => r.event_id === event.id).map(res => (
                          <div key={res.id} className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-2">
                            <div>
                              <span className="font-medium">{res.title}</span>
                              {res.link && <a href={res.link} target="_blank" rel="noopener noreferrer" className="ml-2 text-secondary hover:underline text-xs">({res.link})</a>}
                            </div>
                            <button onClick={() => deleteResource(res.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input placeholder="Resource title" className="flex-1" value={newResEventId === event.id ? newResTitle : ""} onFocus={() => setNewResEventId(event.id)} onChange={e => { setNewResEventId(event.id); setNewResTitle(e.target.value); }} />
                        <Input placeholder="Link (URL)" className="flex-1" value={newResEventId === event.id ? newResLink : ""} onFocus={() => setNewResEventId(event.id)} onChange={e => { setNewResEventId(event.id); setNewResLink(e.target.value); }} />
                        <Button size="sm" onClick={addResource}><Plus className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === "requests" && (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Event</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr key={req.id} className="border-t border-border">
                      <td className="p-3">{req.name}</td>
                      <td className="p-3 text-muted-foreground">{req.email}</td>
                      <td className="p-3">{getEventTitle(req.event_id)}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          req.status === "approved" ? "bg-green-100 text-green-800" :
                          req.status === "denied" ? "bg-red-100 text-red-800" :
                          "bg-yellow-100 text-yellow-800"
                        }`}>{req.status}</span>
                      </td>
                      <td className="p-3 text-right">
                        {req.status === "pending" && (
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => updateRequestStatus(req.id, "approved")} className="text-green-600 hover:text-green-800">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => updateRequestStatus(req.id, "denied")} className="text-red-600 hover:text-red-800">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {requests.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No access requests yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Auto-Approve Emails Tab */}
          {activeTab === "emails" && (
            <div className="space-y-6">
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="font-display font-bold text-lg mb-4">Add Auto-Approve Email</h2>
                <p className="text-sm text-muted-foreground mb-4">These emails will be automatically granted access when they request it.</p>
                <div className="flex gap-3">
                  <select
                    value={newEmailEventId}
                    onChange={e => setNewEmailEventId(e.target.value)}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[180px]"
                  >
                    <option value="">Select event</option>
                    {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
                  <Input placeholder="Email address" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="flex-1" />
                  <Button onClick={addApprovedEmail}><Plus className="h-4 w-4 mr-1" /> Add</Button>
                </div>
              </div>

              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Email</th>
                      <th className="text-left p-3 font-medium">Event</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedEmails.map(ae => (
                      <tr key={ae.id} className="border-t border-border">
                        <td className="p-3">{ae.email}</td>
                        <td className="p-3">{getEventTitle(ae.event_id)}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => removeApprovedEmail(ae.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    ))}
                    {approvedEmails.length === 0 && (
                      <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No auto-approve emails configured</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default AdminDashboard;
