import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Trash2, Check, X, LogOut, Calendar, MapPin, Link as LinkIcon,
  Users, Mail, FileText, ChevronDown, ChevronUp, Pencil, Save, Loader2, Upload, GripVertical, Star, Quote, Bell,
  Tag, ExternalLink, Eye, EyeOff, Percent, DollarSign, Trophy, ArrowUpCircle, Target, Globe, UserCheck, BarChart3, ShoppingBag, School, KeyRound
} from "lucide-react";
import AdminProspects from "@/components/admin/AdminProspects";
import AdminFlyerTemplates from "@/components/admin/AdminFlyerTemplates";
import CollegeTournamentHub from "@/components/admin/CollegeTournamentHub";
import AdminFeatureToggles from "@/components/admin/AdminFeatureToggles";
import AdminStore from "@/components/admin/AdminStore";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import AdminDemoScript from "@/components/admin/AdminDemoScript";
import AdminNotifications from "@/components/admin/AdminNotifications";
import AdminAccounting from "@/components/admin/AdminAccounting";
import AdminTransactions from "@/components/admin/AdminTransactions";
import AdminEmailScripts from "@/components/admin/AdminEmailScripts";
import AdminProspectStats from "@/components/admin/AdminProspectStats";
import AdminSalesHub from "@/components/admin/AdminSalesHub";
import AdminSponsorshipPages from "@/components/admin/AdminSponsorshipPages";
import AdminTournamentEditModal, { type PaymentOverride } from "@/components/admin/AdminTournamentEditModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const [activeTab, setActiveTab] = useState<"events" | "requests" | "emails" | "reviews" | "promos" | "demos" | "sales-hub" | "all-tournaments" | "managed-tournaments" | "sponsorship-pages" | "analytics" | "store" | "college" | "flyer-templates" | "notifications" | "accounting" | "transactions">("events");

  // Prospects state
  const [adminProspects, setAdminProspects] = useState<any[]>([]);
  const [prospectActivities, setProspectActivities] = useState<any[]>([]);
  const [outreachTemplates, setOutreachTemplates] = useState<any[]>([]);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [editEventTitle, setEditEventTitle] = useState("");
  const [editEventDate, setEditEventDate] = useState("");
  const [editEventLocation, setEditEventLocation] = useState("");
  const [editEventStatus, setEditEventStatus] = useState<"current" | "past">("current");
  const [editGalleryUrl, setEditGalleryUrl] = useState("");
  const [editResultsUrl, setEditResultsUrl] = useState("");

  // New event form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newGalleryUrl, setNewGalleryUrl] = useState("");
  const [newResultsUrl, setNewResultsUrl] = useState("");
  const [newStatus, setNewStatus] = useState<"current" | "past">("current");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // New email form
  const [newEmailEventId, setNewEmailEventId] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [bulkApproveEmails, setBulkApproveEmails] = useState("");
  const [bulkApproveEventId, setBulkApproveEventId] = useState("");
  const [bulkApproveLoading, setBulkApproveLoading] = useState(false);

  // Grant access form
  const [grantEventId, setGrantEventId] = useState("");
  const [grantName, setGrantName] = useState("");
  const [grantEmail, setGrantEmail] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkEventId, setBulkEventId] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  // New resource form
  const [newResEventId, setNewResEventId] = useState("");
  const [newResTitle, setNewResTitle] = useState("");
  const [newResLink, setNewResLink] = useState("");
  const [editingResource, setEditingResource] = useState<string | null>(null);
  const [editResLink, setEditResLink] = useState("");

  // Reviews state
  const [reviews, setReviews] = useState<{ id: string; author: string; organization: string; text: string; sort_order: number; created_at: string }[]>([]);
  const [newReviewAuthor, setNewReviewAuthor] = useState("");
  const [newReviewOrg, setNewReviewOrg] = useState("");
  const [newReviewText, setNewReviewText] = useState("");
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const [editReviewAuthor, setEditReviewAuthor] = useState("");
  const [editReviewOrg, setEditReviewOrg] = useState("");
  const [editReviewText, setEditReviewText] = useState("");

  // Promo codes state
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [newPromoCode, setNewPromoCode] = useState("");
  const [newPromoType, setNewPromoType] = useState<"percent" | "fixed">("percent");
  const [newPromoValue, setNewPromoValue] = useState("");
  const [newPromoMaxUses, setNewPromoMaxUses] = useState("");
  const [newPromoExpires, setNewPromoExpires] = useState("");
  const [promoCreating, setPromoCreating] = useState(false);

  // Demo events state
  const [demoEvents, setDemoEvents] = useState<any[]>([]);
  const [newDemoLabel, setNewDemoLabel] = useState("");
  const [newDemoTitle, setNewDemoTitle] = useState("");
  const [demoCreating, setDemoCreating] = useState(false);

  // Organizations state
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [updatingOrgPlan, setUpdatingOrgPlan] = useState<string | null>(null);

  // All tournaments state
   const [allTournaments, setAllTournaments] = useState<any[]>([]);
  const [platformProducts, setPlatformProducts] = useState<any[]>([]);
  const [expandedTournament, setExpandedTournament] = useState<string | null>(null);
  const [tournamentSearch, setTournamentSearch] = useState("");
  const [deletingTournament, setDeletingTournament] = useState<string | null>(null);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<number>(0);
  const [orgFilter, setOrgFilter] = useState("");
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);

  const handleAdminResetPassword = async (orgId: string) => {
    // Find org members to get the email
    const { data: members } = await supabase.functions.invoke("admin-data", {
      body: { action: "get-org-members", org_id: orgId },
    });
    
    // Use the admin-data edge function to get user email, or query org_members
    const { data: orgMembers } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("organization_id", orgId)
      .eq("role", "owner")
      .limit(1);
    
    if (!orgMembers || orgMembers.length === 0) {
      toast({ title: "No owner found for this organization", variant: "destructive" });
      return;
    }

    const resetEmail = prompt("Enter the email address for the account to reset:");
    if (!resetEmail) return;

    setResettingPassword(orgId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: { email: resetEmail, redirect_url: `${window.location.origin}/reset-password` },
      });
      if (error) throw error;
      toast({ title: "Password reset email sent", description: `Reset link sent to ${resetEmail}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setResettingPassword(null);
  };

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

  const callAdminApi = useCallback(async (action?: string, body?: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`);
    if (action) url.searchParams.set("action", action);

    const res = await fetch(url.toString(), {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Request failed");
    }
    return res.json();
  }, []);

  const fetchAll = async () => {
    try {
      const data = await callAdminApi();
      setEvents(data.events || []);
      setRequests(data.requests || []);
      setApprovedEmails(data.approvedEmails || []);
      setResources(data.resources || []);
      setReviews(data.reviews || []);
      setPromoCodes(data.promoCodes || []);
      setDemoEvents(data.demoEvents || []);
      setOrganizations(data.organizations || []);
      setAdminProspects(data.prospects || []);
      setProspectActivities(data.prospectActivities || []);
      setOutreachTemplates(data.outreachTemplates || []);
      setAllTournaments(data.allTournaments || []);
      setPlatformProducts(data.platformProducts || []);
      setOutreachTemplates(data.outreachTemplates || []);
    } catch (err: any) {
      console.error("Failed to fetch admin data:", err);
      toast({ title: "Error loading data", description: err.message, variant: "destructive" });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const addEvent = async () => {
    if (!newTitle.trim()) return;
    setUploading(true);
    let imageUrl: string | null = null;

    if (newImageFile) {
      const fileExt = newImageFile.name.split(".").pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("event-images").upload(filePath, newImageFile);
      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        setUploading(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("event-images").getPublicUrl(filePath);
      imageUrl = publicUrl;
    }

    const { error } = await supabase.from("events").insert({
      title: newTitle.trim(), description: newDesc.trim() || null,
      date: newDate || null, end_date: newEndDate || null, location: newLocation.trim() || null,
      link: newLink.trim() || null, status: newStatus, image_url: imageUrl,
      gallery_url: newGalleryUrl.trim() || null,
      results_url: newResultsUrl.trim() || null,
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setUploading(false); return; }
    setNewTitle(""); setNewDesc(""); setNewDate(""); setNewEndDate(""); setNewLocation(""); setNewLink(""); setNewGalleryUrl(""); setNewResultsUrl(""); setNewImageFile(null);
    const fileInput = document.getElementById("event-image-upload") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
    await fetchAll();
    setUploading(false);
    toast({ title: "Event added!" });
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("events").delete().eq("id", id);
    await fetchAll();
    toast({ title: "Event deleted" });
  };

  const startEditingEvent = (event: Tables<"events">) => {
    setEditingEvent(event.id);
    setEditEventTitle(event.title);
    setEditEventDate(event.date || "");
    setEditEventLocation(event.location || "");
    setEditEventStatus(event.status as "current" | "past");
    setEditGalleryUrl((event as any).gallery_url || "");
    setEditResultsUrl((event as any).results_url || "");
  };

  const updateEvent = async (id: string) => {
    if (!editEventTitle.trim()) return;
    const { error } = await supabase.from("events").update({
      title: editEventTitle.trim(),
      date: editEventDate || null,
      location: editEventLocation.trim() || null,
      status: editEventStatus,
      gallery_url: editGalleryUrl.trim() || null,
      results_url: editResultsUrl.trim() || null,
    } as any).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setEditingEvent(null);
    await fetchAll();
    toast({ title: "Event updated!" });
  };

  const updateRequestStatus = async (id: string, status: "approved" | "denied") => {
    await supabase.from("event_access_requests").update({ status }).eq("id", id);
    await fetchAll();
    toast({ title: `Request ${status}` });
  };

  const grantAccess = async () => {
    if (!grantEventId || !grantName.trim() || !grantEmail.trim()) return;
    try {
      await callAdminApi("grant-access", {
        event_id: grantEventId,
        name: grantName.trim(),
        email: grantEmail.trim(),
      });
      setGrantName(""); setGrantEmail("");
      await fetchAll();
      toast({ title: "Access granted!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const bulkGrantAccess = async () => {
    if (!bulkEventId || !bulkEmails.trim()) return;
    const lines = bulkEmails.trim().split("\n").filter(l => l.trim());
    const entries = lines.map(line => {
      const parts = line.split(",").map(s => s.trim());
      if (parts.length >= 2) {
        return { name: parts[0], email: parts[1] };
      }
      // If no comma, treat entire line as email with "Member" as name
      return { name: "Member", email: parts[0] };
    }).filter(e => e.email);

    if (!entries.length) return;
    setBulkLoading(true);
    try {
      const result = await callAdminApi("bulk-grant-access", {
        event_id: bulkEventId,
        entries,
      });
      setBulkEmails("");
      await fetchAll();
      toast({ title: `Bulk import complete`, description: `${result.granted} granted, ${result.skipped} skipped` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setBulkLoading(false);
    }
  };

  const addApprovedEmail = async () => {
    if (!newEmailEventId || !newEmail.trim()) return;
    try {
      await callAdminApi("add-approved-email", {
        event_id: newEmailEventId,
        email: newEmail.trim().toLowerCase(),
      });
      setNewEmail("");
      await fetchAll();
      toast({ title: "Email added to auto-approve list" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const removeApprovedEmail = async (id: string) => {
    try {
      await callAdminApi("delete-approved-email", { id });
      await fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const bulkAddApprovedEmails = async () => {
    if (!bulkApproveEventId || !bulkApproveEmails.trim()) return;
    const emails = bulkApproveEmails.trim().split("\n").map(l => l.trim().toLowerCase()).filter(Boolean);
    if (!emails.length) return;
    setBulkApproveLoading(true);
    try {
      const result = await callAdminApi("bulk-add-approved-emails", {
        event_id: bulkApproveEventId,
        emails,
      });
      setBulkApproveEmails("");
      await fetchAll();
      toast({ title: "Bulk import complete", description: `${result.added} added, ${result.skipped} skipped (duplicates)` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setBulkApproveLoading(false);
    }
  };

  const addResource = async () => {
    if (!newResEventId || !newResTitle.trim()) return;
    try {
      await callAdminApi("add-resource", {
        event_id: newResEventId,
        title: newResTitle.trim(),
        link: newResLink.trim() || null,
      });
      setNewResTitle(""); setNewResLink("");
      await fetchAll();
      toast({ title: "Resource added!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const deleteResource = async (id: string) => {
    try {
      await callAdminApi("delete-resource", { id });
      await fetchAll();
      toast({ title: "Resource deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const updateResourceLink = async (id: string) => {
    try {
      await callAdminApi("update-resource-link", { id, link: editResLink.trim() || null });
      setEditingResource(null);
      await fetchAll();
      toast({ title: "Resource updated!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const droppableId = result.source.droppableId;

    // Event reordering
    if (droppableId === "events-list") {
      const sorted = [...events].sort((a, b) => ((a as any).sort_order ?? 0) - ((b as any).sort_order ?? 0));
      const reordered = Array.from(sorted);
      const [moved] = reordered.splice(result.source.index, 1);
      reordered.splice(result.destination.index, 0, moved);
      const updates = reordered.map((r, i) => ({ id: r.id, sort_order: i }));
      setEvents(reordered.map((r, i) => ({ ...r, sort_order: i } as any)));
      try {
        await callAdminApi("reorder-events", { updates });
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
        await fetchAll();
      }
      return;
    }

    // Resource reordering
    const eventId = droppableId;
    const sorted = resources
      .filter(r => r.event_id === eventId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const reordered = Array.from(sorted);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    const updates = reordered.map((r, i) => ({ id: r.id, sort_order: i }));
    setResources(prev => {
      const others = prev.filter(r => r.event_id !== eventId);
      return [...others, ...reordered.map((r, i) => ({ ...r, sort_order: i }))];
    });
    try {
      await callAdminApi("reorder-resources", { updates });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      await fetchAll();
    }
  };

  const addReview = async () => {
    if (!newReviewAuthor.trim() || !newReviewText.trim()) return;
    try {
      await callAdminApi("add-review", {
        author: newReviewAuthor.trim(),
        organization: newReviewOrg.trim(),
        text: newReviewText.trim(),
        sort_order: reviews.length,
      });
      setNewReviewAuthor(""); setNewReviewOrg(""); setNewReviewText("");
      await fetchAll();
      toast({ title: "Review added!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const deleteReview = async (id: string) => {
    try {
      await callAdminApi("delete-review", { id });
      await fetchAll();
      toast({ title: "Review deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const updateReview = async (id: string) => {
    if (!editReviewAuthor.trim() || !editReviewText.trim()) return;
    try {
      await callAdminApi("update-review", {
        id,
        author: editReviewAuthor.trim(),
        organization: editReviewOrg.trim(),
        text: editReviewText.trim(),
      });
      setEditingReview(null);
      await fetchAll();
      toast({ title: "Review updated!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const onReviewDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(reviews.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const updates = reordered.map((r, i) => ({ id: r.id, sort_order: i }));
    setReviews(reordered.map((r, i) => ({ ...r, sort_order: i })));
    try {
      await callAdminApi("reorder-reviews", { updates });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      await fetchAll();
    }
  };

  const addPromoCode = async () => {
    if (!newPromoCode.trim() || !newPromoValue) return;
    setPromoCreating(true);
    try {
      await callAdminApi("add-promo-code", {
        code: newPromoCode.trim(),
        discount_type: newPromoType,
        discount_value: parseFloat(newPromoValue),
        max_uses: newPromoMaxUses ? parseInt(newPromoMaxUses) : null,
        expires_at: newPromoExpires || null,
      });
      setNewPromoCode(""); setNewPromoValue(""); setNewPromoMaxUses(""); setNewPromoExpires("");
      await fetchAll();
      toast({ title: "Promo code created!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPromoCreating(false);
    }
  };

  const togglePromoCode = async (id: string, isActive: boolean) => {
    try {
      await callAdminApi("toggle-promo-code", { id, is_active: !isActive });
      await fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const deletePromoCode = async (id: string) => {
    try {
      await callAdminApi("delete-promo-code", { id });
      await fetchAll();
      toast({ title: "Promo code deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const createDemoEvent = async () => {
    if (!newDemoTitle.trim()) return;
    setDemoCreating(true);
    try {
      await callAdminApi("create-demo-event", {
        label: newDemoLabel.trim() || "Demo Event",
        tournament_title: newDemoTitle.trim(),
      });
      setNewDemoLabel(""); setNewDemoTitle("");
      await fetchAll();
      toast({ title: "Demo event created!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDemoCreating(false);
    }
  };

  const deleteDemoEvent = async (id: string) => {
    try {
      await callAdminApi("delete-demo-event", { id });
      await fetchAll();
      toast({ title: "Demo event deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const updateOrgPlan = async (orgId: string, newPlan: string) => {
    setUpdatingOrgPlan(orgId);
    try {
      await callAdminApi("update-org-plan", { organization_id: orgId, plan: newPlan });
      await fetchAll();
      toast({ title: "Plan updated!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUpdatingOrgPlan(null);
    }
  };

  const toggleTournamentPublished = async (tournamentId: string, currentValue: boolean) => {
    try {
      await callAdminApi("toggle-tournament-published", { tournament_id: tournamentId, site_published: !currentValue });
      setAllTournaments(prev => prev.map(t => t.id === tournamentId ? { ...t, site_published: !currentValue } : t));
      toast({ title: !currentValue ? "Tournament published!" : "Tournament unpublished" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const toggleTournamentRegistration = async (tournamentId: string, currentValue: boolean) => {
    try {
      await callAdminApi("toggle-tournament-registration", { tournament_id: tournamentId, registration_open: !currentValue });
      setAllTournaments(prev => prev.map(t => t.id === tournamentId ? { ...t, registration_open: !currentValue } : t));
      toast({ title: !currentValue ? "Registration opened!" : "Registration closed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const togglePassFees = async (tournamentId: string, currentValue: boolean) => {
    try {
      await callAdminApi("toggle-pass-fees", { tournament_id: tournamentId, pass_fees_to_registrants: !currentValue });
      setAllTournaments(prev => prev.map(t => t.id === tournamentId ? { ...t, pass_fees_to_registrants: !currentValue } : t));
      toast({ title: !currentValue ? "Fees will be passed to registrants" : "Fees reverted to organizer" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const toggleManagedByTeevents = async (tournamentId: string, value: boolean) => {
    try {
      await callAdminApi("toggle-managed-by-teevents", { tournament_id: tournamentId, managed_by_teevents: value });
      setAllTournaments(prev => prev.map(t => t.id === tournamentId ? { ...t, managed_by_teevents: value } : t));
      toast({ title: value ? "Marked as Managed by TeeVents" : "Removed Managed flag" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const togglePublicSearch = async (tournamentId: string, value: boolean) => {
    try {
      await callAdminApi("toggle-public-search", { tournament_id: tournamentId, show_in_public_search: value });
      setAllTournaments(prev => prev.map(t => t.id === tournamentId ? { ...t, show_in_public_search: value } : t));
      toast({ title: value ? "Listed on public search" : "Removed from public search" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    if (deleteConfirmStep === 0 || deletingTournament !== tournamentId) {
      setDeletingTournament(tournamentId);
      setDeleteConfirmStep(1);
      return;
    }
    if (deleteConfirmStep === 1) {
      setDeleteConfirmStep(2);
      return;
    }
    // Step 2: actually delete
    try {
      setDeleteConfirmStep(3); // loading state
      await callAdminApi("delete-tournament", { tournament_id: tournamentId });
      setAllTournaments(prev => prev.filter(t => t.id !== tournamentId));
      toast({ title: "Tournament deleted permanently" });
    } catch (err: any) {
      toast({ title: "Error deleting tournament", description: err.message, variant: "destructive" });
    }
    setDeletingTournament(null);
    setDeleteConfirmStep(0);
  };

  const cancelDelete = () => {
    setDeletingTournament(null);
    setDeleteConfirmStep(0);
  };

  if (loading) return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </Layout>
  );

  const getEventTitle = (eventId: string) => events.find(e => e.id === eventId)?.title || "Unknown";

  return (
    <Layout>
      {/* Header */}
      <section className="bg-primary py-8">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-primary-foreground">Admin Dashboard</h1>
            <p className="text-primary-foreground/70 mt-1">Manage tournaments, access, and resources</p>
          </div>
          <Button variant="ghost" onClick={handleSignOut} className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary/80">
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>
      </section>

      <section className="bg-golf-cream min-h-[70vh] py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Tabs */}
          <div className="mb-8 border-b border-border pb-2 space-y-3">
            <div>
              <div className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground mb-1.5">Platform Management</div>
              <div className="flex flex-wrap gap-2">
                {([
                  ["all-tournaments", "TeeVents Tournaments", Trophy],
                  ["requests", "Access Requests", Users],
                  ["emails", "Auto-Approve Emails", Mail],
                  ["college", "College Hub", School],
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
            </div>

            <div>
              <div className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground mb-1.5">TeeVents Operations</div>
              <div className="flex flex-wrap gap-2">
                {([
                  ["managed-tournaments", "Managed Tournaments", Trophy],
                  ["sponsorship-pages", "Sponsorship Pages", Target],
                  ["sales-hub", "Outreach / Sales Hub", Target],
                ] as const).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-t-md text-sm font-medium transition-colors ${
                      activeTab === key ? "bg-card border border-b-0 border-border text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground mb-1.5">Other</div>
              <div className="flex flex-wrap gap-2">
                {([
                  ["events", "Marketing Events", Calendar],
                  ["reviews", "Reviews", Star],
                  ["demos", "Demo Events", Trophy],
                  ["promos", "Promo Codes", Tag],
                  ["store", "Store", ShoppingBag],
                  ["analytics", "Analytics", BarChart3],
                  ["flyer-templates", "Flyer Templates", FileText],
                  ["notifications", "Notifications", Bell],
                  ["transactions", "Transactions", DollarSign],
                  ["accounting", "Accounting", DollarSign],
                ] as const).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-t-md text-sm font-medium transition-colors ${
                      activeTab === key ? "bg-card border border-b-0 border-border text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Managed Tournaments Tab — every tournament is managed by TeeVents */}
          {activeTab === "managed-tournaments" && (
            <AdminManagedTournaments
              tournaments={allTournaments}
              onTogglePublicSearch={togglePublicSearch}
            />
          )}

          {/* Sponsorship Pages Tab — every tournament is managed by TeeVents */}
          {activeTab === "sponsorship-pages" && (
            <AdminSponsorshipPages
              tournaments={allTournaments}
            />
          )}

          {/* Events Tab */}
          {activeTab === "events" && (
            <div className="space-y-6">
              {/* Add Event Form */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="font-display font-bold text-lg mb-4">Add New Event</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Title *" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                  <Input placeholder="Description" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                  <Input type="date" placeholder="Start Date" value={newDate} onChange={e => setNewDate(e.target.value)} />
                  <Input type="date" placeholder="End Date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} min={newDate || undefined} />
                  <Input placeholder="Location" value={newLocation} onChange={e => setNewLocation(e.target.value)} />
                  <Input placeholder="Link (URL)" value={newLink} onChange={e => setNewLink(e.target.value)} />
                  <Input placeholder="Gallery URL (Google Photos)" value={newGalleryUrl} onChange={e => setNewGalleryUrl(e.target.value)} />
                  <Input placeholder="Results URL (optional)" value={newResultsUrl} onChange={e => setNewResultsUrl(e.target.value)} />
                  <Input id="event-image-upload" type="file" accept="image/*" onChange={e => setNewImageFile(e.target.files?.[0] || null)} />
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as "current" | "past")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="current">Current</option>
                    <option value="past">Past</option>
                  </select>
                  <Button onClick={addEvent} disabled={uploading}><Plus className="h-4 w-4 mr-1" /> {uploading ? "Uploading..." : "Add Event"}</Button>
                </div>
              </div>

              {/* Events List */}
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="events-list">
                  {(eventsDropProvided) => (
                    <div ref={eventsDropProvided.innerRef} {...eventsDropProvided.droppableProps} className="space-y-4">
                      {[...events].sort((a, b) => ((a as any).sort_order ?? 0) - ((b as any).sort_order ?? 0)).map((event, idx) => {
                        const eventResources = resources.filter(r => r.event_id === event.id);
                        const isExpanded = expandedEvent === event.id;
                        return (
                          <Draggable key={event.id} draggableId={event.id} index={idx}>
                            {(eventDragProvided, eventSnapshot) => (
                              <div ref={eventDragProvided.innerRef} {...eventDragProvided.draggableProps} className={`bg-card rounded-lg border border-border overflow-hidden ${eventSnapshot.isDragging ? "shadow-lg ring-2 ring-primary/30" : ""}`}>
                                <div className="p-4">
                                  {editingEvent === event.id ? (
                                    <div className="space-y-3">
                                      <div className="grid sm:grid-cols-2 gap-3">
                                        <Input placeholder="Title *" value={editEventTitle} onChange={e => setEditEventTitle(e.target.value)} />
                                        <Input type="date" value={editEventDate} onChange={e => setEditEventDate(e.target.value)} />
                                        <Input placeholder="Location" value={editEventLocation} onChange={e => setEditEventLocation(e.target.value)} />
                                        <Input placeholder="Gallery URL (Google Photos)" value={editGalleryUrl} onChange={e => setEditGalleryUrl(e.target.value)} />
                                        <Input placeholder="Results URL (optional)" value={editResultsUrl} onChange={e => setEditResultsUrl(e.target.value)} />
                                        <select value={editEventStatus} onChange={e => setEditEventStatus(e.target.value as "current" | "past")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                          <option value="current">Current</option>
                                          <option value="past">Past</option>
                                        </select>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button size="sm" onClick={() => updateEvent(event.id)}><Save className="h-4 w-4 mr-1" /> Save</Button>
                                        <Button size="sm" variant="outline" onClick={() => setEditingEvent(null)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3 flex-wrap">
                                        <div {...eventDragProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                                          <GripVertical className="h-4 w-4" />
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${event.status === "current" ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>{event.status}</span>
                                        <h3 className="font-display font-semibold">{event.title}</h3>
                                        {event.date && <span className="text-xs text-muted-foreground">{new Date(event.date).toLocaleDateString()}</span>}
                                        {event.location && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location}</span>}
                                        {eventResources.length > 0 && (
                                          <span className="text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">
                                            {eventResources.length} resource{eventResources.length !== 1 ? "s" : ""}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button onClick={() => startEditingEvent(event)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                                        <button onClick={() => setExpandedEvent(isExpanded ? null : event.id)} className="text-muted-foreground hover:text-foreground">
                                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </button>
                                        <button onClick={() => deleteEvent(event.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {isExpanded && (
                                  <div className="border-t border-border p-4 bg-muted/20">
                                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-1">
                                      <FileText className="h-4 w-4" /> Resources ({eventResources.length})
                                    </h4>
                                    {eventResources.length > 0 ? (
                                      <DragDropContext onDragEnd={onDragEnd}>
                                        <Droppable droppableId={event.id}>
                                          {(resProvided) => (
                                            <div ref={resProvided.innerRef} {...resProvided.droppableProps} className="space-y-2 mb-4">
                                              {eventResources.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((res, resIdx) => (
                                                <Draggable key={res.id} draggableId={res.id} index={resIdx}>
                                                  {(resDragProvided, resSnapshot) => (
                                                    <div ref={resDragProvided.innerRef} {...resDragProvided.draggableProps} className={`flex items-center justify-between text-sm bg-card rounded-md border border-border px-3 py-2 ${resSnapshot.isDragging ? "shadow-lg ring-2 ring-primary/30" : ""}`}>
                                                      <div {...resDragProvided.dragHandleProps} className="flex items-center mr-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                                                        <GripVertical className="h-4 w-4" />
                                                      </div>
                                                      <div className="flex-1 min-w-0">
                                                        <span className="font-medium">{res.title}</span>
                                                        {editingResource === res.id ? (
                                                          <div className="flex items-center gap-2 mt-1">
                                                            <Input value={editResLink} onChange={e => setEditResLink(e.target.value)} placeholder="Link (URL)" className="h-7 text-xs flex-1" />
                                                            <Button size="sm" variant="ghost" onClick={() => updateResourceLink(res.id)} className="h-7 px-2 text-green-600 hover:text-green-800"><Save className="h-3.5 w-3.5" /></Button>
                                                            <Button size="sm" variant="ghost" onClick={() => setEditingResource(null)} className="h-7 px-2 text-muted-foreground"><X className="h-3.5 w-3.5" /></Button>
                                                          </div>
                                                        ) : (
                                                          res.link && (
                                                            <a href={res.link} target="_blank" rel="noopener noreferrer" className="ml-2 text-secondary hover:underline text-xs truncate inline-flex items-center gap-1">
                                                              <LinkIcon className="h-3 w-3" /> Link
                                                            </a>
                                                          )
                                                        )}
                                                      </div>
                                                      <div className="flex items-center gap-1 ml-2">
                                                        {editingResource !== res.id && (
                                                          <button onClick={() => { setEditingResource(res.id); setEditResLink(res.link || ""); }} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                                                        )}
                                                        <button onClick={() => deleteResource(res.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                                                      </div>
                                                    </div>
                                                  )}
                                                </Draggable>
                                              ))}
                                              {resProvided.placeholder}
                                            </div>
                                          )}
                                        </Droppable>
                                      </DragDropContext>
                                    ) : (
                                      <p className="text-sm text-muted-foreground mb-4 italic">No resources yet. Add one below.</p>
                                    )}
                                    <div className="flex gap-2">
                                      <Input placeholder="Resource title" className="flex-1" value={newResEventId === event.id ? newResTitle : ""} onFocus={() => setNewResEventId(event.id)} onChange={e => { setNewResEventId(event.id); setNewResTitle(e.target.value); }} />
                                      <Input placeholder="Link (URL)" className="flex-1" value={newResEventId === event.id ? newResLink : ""} onFocus={() => setNewResEventId(event.id)} onChange={e => { setNewResEventId(event.id); setNewResLink(e.target.value); }} />
                                      <Button size="sm" onClick={addResource}><Plus className="h-3.5 w-3.5" /></Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {eventsDropProvided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === "requests" && (
            <div className="space-y-6">
              {/* Grant Access Form */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="font-display font-bold text-lg mb-4">Grant Access</h2>
                <p className="text-sm text-muted-foreground mb-4">Directly grant a member access to an event's resources.</p>
                <div className="flex gap-3 flex-wrap">
                  <select
                    value={grantEventId}
                    onChange={e => setGrantEventId(e.target.value)}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[180px]"
                  >
                    <option value="">Select event</option>
                    {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
                  <Input placeholder="Name" value={grantName} onChange={e => setGrantName(e.target.value)} className="flex-1 min-w-[150px]" />
                  <Input placeholder="Email address" value={grantEmail} onChange={e => setGrantEmail(e.target.value)} className="flex-1 min-w-[200px]" />
                  <Button onClick={grantAccess}><Check className="h-4 w-4 mr-1" /> Grant Access</Button>
                </div>

                {/* Bulk Import */}
                <div className="mt-6 border-t border-border pt-4">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Upload className="h-4 w-4" /> Bulk Import Emails
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Paste one entry per line. Format: <code className="bg-muted px-1 rounded">Name, email@example.com</code> — or just an email per line.
                  </p>
                  <div className="flex gap-3 items-start flex-wrap">
                    <select
                      value={bulkEventId}
                      onChange={e => setBulkEventId(e.target.value)}
                      className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[180px]"
                    >
                      <option value="">Select event</option>
                      {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                    </select>
                    <Textarea
                      placeholder={"John Doe, john@example.com\nJane Smith, jane@example.com\nor just: user@example.com"}
                      value={bulkEmails}
                      onChange={e => setBulkEmails(e.target.value)}
                      className="flex-1 min-w-[300px] min-h-[100px] text-sm"
                    />
                    <Button onClick={bulkGrantAccess} disabled={bulkLoading || !bulkEventId || !bulkEmails.trim()}>
                      {bulkLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                      Import
                    </Button>
                  </div>
                </div>

                {/* Pending Requests inside Grant Access */}
                {requests.filter(r => r.status === "pending").length > 0 && (
                  <div className="mt-6 border-t border-border pt-4">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" /> Pending Requests ({requests.filter(r => r.status === "pending").length})
                    </h3>
                    <div className="space-y-2">
                      {requests.filter(r => r.status === "pending").map(req => (
                        <div key={req.id} className="flex items-center justify-between bg-muted/30 rounded-md px-4 py-3">
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="font-medium text-sm">{req.name}</span>
                            <span className="text-sm text-muted-foreground">{req.email}</span>
                            <span className="text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">{getEventTitle(req.event_id)}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => updateRequestStatus(req.id, "approved")} className="text-green-600 hover:text-green-800">
                              <Check className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => updateRequestStatus(req.id, "denied")} className="text-red-600 hover:text-red-800">
                              <X className="h-4 w-4 mr-1" /> Deny
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

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

              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="font-display font-bold text-lg mb-4">Bulk Import Auto-Approve Emails</h2>
                <p className="text-sm text-muted-foreground mb-4">Paste one email per line to add multiple auto-approve emails at once.</p>
                <div className="flex flex-wrap gap-3 items-start">
                  <select
                    value={bulkApproveEventId}
                    onChange={e => setBulkApproveEventId(e.target.value)}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[180px]"
                  >
                    <option value="">Select event</option>
                    {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
                  <Textarea
                    placeholder={"user1@example.com\nuser2@example.com\nuser3@example.com"}
                    value={bulkApproveEmails}
                    onChange={e => setBulkApproveEmails(e.target.value)}
                    className="flex-1 min-w-[300px] min-h-[100px] text-sm"
                  />
                  <Button onClick={bulkAddApprovedEmails} disabled={bulkApproveLoading || !bulkApproveEventId || !bulkApproveEmails.trim()}>
                    {bulkApproveLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                    Import
                  </Button>
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

          {/* Reviews Tab */}
          {activeTab === "reviews" && (
            <div className="space-y-6">
              {/* Add Review Form */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="font-display font-bold text-lg mb-4">Add New Review</h2>
                <div className="grid gap-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Input placeholder="Author name *" value={newReviewAuthor} onChange={e => setNewReviewAuthor(e.target.value)} />
                    <Input placeholder="Organization (optional)" value={newReviewOrg} onChange={e => setNewReviewOrg(e.target.value)} />
                  </div>
                  <Textarea placeholder="Review text *" value={newReviewText} onChange={e => setNewReviewText(e.target.value)} className="min-h-[100px]" />
                  <Button onClick={addReview} className="w-fit"><Plus className="h-4 w-4 mr-1" /> Add Review</Button>
                </div>
              </div>

              {/* Reviews List with Drag & Drop */}
              <DragDropContext onDragEnd={onReviewDragEnd}>
                <Droppable droppableId="reviews-list">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                      {reviews
                        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                        .map((review, idx) => (
                        <Draggable key={review.id} draggableId={review.id} index={idx}>
                          {(dragProvided, snapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className={`bg-card rounded-lg border border-border p-4 ${snapshot.isDragging ? "shadow-lg ring-2 ring-primary/30" : ""}`}
                            >
                              {editingReview === review.id ? (
                                <div className="space-y-3">
                                  <div className="grid sm:grid-cols-2 gap-3">
                                    <Input placeholder="Author *" value={editReviewAuthor} onChange={e => setEditReviewAuthor(e.target.value)} />
                                    <Input placeholder="Organization" value={editReviewOrg} onChange={e => setEditReviewOrg(e.target.value)} />
                                  </div>
                                  <Textarea placeholder="Review text *" value={editReviewText} onChange={e => setEditReviewText(e.target.value)} className="min-h-[80px]" />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => updateReview(review.id)}><Save className="h-4 w-4 mr-1" /> Save</Button>
                                    <Button size="sm" variant="outline" onClick={() => setEditingReview(null)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-3">
                                  <div {...dragProvided.dragHandleProps} className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Quote className="h-4 w-4 text-secondary/50 flex-shrink-0" />
                                      <span className="font-semibold text-sm">{review.author}</span>
                                      {review.organization && <span className="text-xs text-muted-foreground">— {review.organization}</span>}
                                    </div>
                                    <p className="text-sm text-muted-foreground italic line-clamp-2">"{review.text}"</p>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <button onClick={() => { setEditingReview(review.id); setEditReviewAuthor(review.author); setEditReviewOrg(review.organization || ""); setEditReviewText(review.text); }} className="text-muted-foreground hover:text-foreground">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={() => deleteReview(review.id)} className="text-muted-foreground hover:text-destructive">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {reviews.length === 0 && (
                <p className="text-center text-muted-foreground italic py-8">No reviews yet. Add one above.</p>
              )}
            </div>
          )}

          {/* Promo Codes Tab */}
          {activeTab === "promos" && (
            <div className="space-y-6">
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="font-display font-bold text-lg mb-4">Create Promo Code</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Input placeholder="Code (e.g. GOLF50)" value={newPromoCode} onChange={e => setNewPromoCode(e.target.value)} />
                  <select
                    value={newPromoType}
                    onChange={e => setNewPromoType(e.target.value as "percent" | "fixed")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="percent">Percentage Off</option>
                    <option value="fixed">Fixed Amount Off ($)</option>
                  </select>
                  <Input
                    type="number"
                    placeholder={newPromoType === "percent" ? "Discount %" : "Discount $"}
                    value={newPromoValue}
                    onChange={e => setNewPromoValue(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Max uses (blank = unlimited)"
                    value={newPromoMaxUses}
                    onChange={e => setNewPromoMaxUses(e.target.value)}
                  />
                  <Input
                    type="datetime-local"
                    value={newPromoExpires}
                    onChange={e => setNewPromoExpires(e.target.value)}
                  />
                  <Button onClick={addPromoCode} disabled={promoCreating}>
                    {promoCreating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                    Create
                  </Button>
                </div>
              </div>

              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Code</th>
                      <th className="text-left p-3 font-medium">Discount</th>
                      <th className="text-left p-3 font-medium">Uses</th>
                      <th className="text-left p-3 font-medium">Expires</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promoCodes.map(pc => (
                      <tr key={pc.id} className="border-t border-border">
                        <td className="p-3 font-mono font-semibold">{pc.code}</td>
                        <td className="p-3">
                          {pc.discount_type === "percent" ? (
                            <span className="flex items-center gap-1"><Percent className="h-3 w-3" />{pc.discount_value}%</span>
                          ) : (
                            <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{pc.discount_value}</span>
                          )}
                        </td>
                        <td className="p-3">{pc.current_uses}{pc.max_uses ? ` / ${pc.max_uses}` : " / ∞"}</td>
                        <td className="p-3 text-muted-foreground">
                          {pc.expires_at ? new Date(pc.expires_at).toLocaleDateString() : "Never"}
                        </td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            pc.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          }`}>
                            {pc.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => togglePromoCode(pc.id, pc.is_active)} className="text-muted-foreground hover:text-foreground" title={pc.is_active ? "Deactivate" : "Activate"}>
                              {pc.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            <button onClick={() => deletePromoCode(pc.id)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {promoCodes.length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No promo codes yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Demo Events Tab */}
          {activeTab === "demos" && (
            <>
            <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-5 flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display font-semibold text-foreground">Sample Organizer Dashboard</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Pre-built demo login page for live sales demos — fully populated sample event.
                  <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded font-mono">/sample-organizer</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/sample-organizer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm bg-secondary text-secondary-foreground px-4 py-2 rounded-lg font-semibold hover:bg-secondary/90 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open Demo
                </a>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="font-display font-bold text-lg mb-4">Create Demo Event</h2>
                <p className="text-sm text-muted-foreground mb-4">Create a fully-functional demo tournament that you can manage and show to potential customers.</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Input placeholder="Label (e.g. Sales Demo)" value={newDemoLabel} onChange={e => setNewDemoLabel(e.target.value)} />
                  <Input placeholder="Tournament Name *" value={newDemoTitle} onChange={e => setNewDemoTitle(e.target.value)} />
                  <Button onClick={createDemoEvent} disabled={demoCreating}>
                    {demoCreating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                    Create Demo
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {demoEvents.map(demo => (
                  <div key={demo.id} className="bg-card rounded-lg border border-border p-5 flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-semibold">{demo.label}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {demo.tournaments?.title || "Tournament"}
                        {demo.tournaments?.slug && (
                          <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded font-mono">/t/{demo.tournaments.slug}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {demo.tournaments?.slug && (
                        <a
                          href={`/t/${demo.tournaments.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-secondary hover:text-secondary/80 font-medium"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> View Site
                        </a>
                      )}
                      <a
                        href={`/dashboard/tournaments/${demo.tournament_id}/site-builder`}
                        className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Manage
                      </a>
                      <button onClick={() => deleteDemoEvent(demo.id)} className="text-muted-foreground hover:text-destructive ml-2">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {demoEvents.length === 0 && (
                  <div className="text-center py-12 bg-card rounded-lg border border-border">
                    <Trophy className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground">No demo events yet. Create one above to get started.</p>
                  </div>
                )}
              </div>
            </div>
            </>
          )}

          {/* All User Tournaments Tab */}
          {activeTab === "all-tournaments" && (
            <div className="space-y-6">
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="font-display font-bold text-lg mb-2">All User Tournaments</h2>
                <p className="text-sm text-muted-foreground mb-4">View every tournament created by users across all organizations. Change an organization's plan to control feature access.</p>
                <div className="flex flex-wrap gap-3">
                  <Input
                    placeholder="Search by tournament name, org, or course..."
                    value={tournamentSearch}
                    onChange={e => setTournamentSearch(e.target.value)}
                    className="max-w-sm"
                  />
                  <select
                    value={orgFilter}
                    onChange={e => setOrgFilter(e.target.value)}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm max-w-xs"
                  >
                    <option value="">All Organizations</option>
                    {[...new Map(allTournaments.map(t => [t.organization_id, t.organizations?.name || "Unknown"])).entries()]
                      .sort((a, b) => a[1].localeCompare(b[1]))
                      .map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="bg-card rounded-lg border border-border overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Tournament</th>
                      <th className="text-left p-3 font-medium">Organization</th>
                      <th className="text-center p-3 font-medium">Players</th>
                      <th className="text-left p-3 font-medium">Plan</th>
                      <th className="text-center p-3 font-medium">Published</th>
                      <th className="text-center p-3 font-medium">Reg Open</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTournaments
                      .filter(t => {
                        if (orgFilter && t.organization_id !== orgFilter) return false;
                        if (!tournamentSearch.trim()) return true;
                        const q = tournamentSearch.toLowerCase();
                        return (
                          t.title?.toLowerCase().includes(q) ||
                          t.organizations?.name?.toLowerCase().includes(q) ||
                          t.course_name?.toLowerCase().includes(q) ||
                          t.slug?.toLowerCase().includes(q)
                        );
                      })
                      .map((t: any) => (
                      <tr key={t.id} className="border-t border-border group">
                        <td className="p-3">
                          <div>
                            <span className="font-semibold">{t.title}</span>
                            {t.course_name && <span className="text-xs text-muted-foreground ml-2">@ {t.course_name}</span>}
                          </div>
                          {t.slug && (
                            <a href={`/t/${t.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                              <ExternalLink className="h-3 w-3" />/t/{t.slug}
                            </a>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="font-medium">{t.organizations?.name || "—"}</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {t.organizations?.stripe_account_id && (
                              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Stripe</span>
                            )}
                            {t.organizations?.is_nonprofit && (
                              <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                                Nonprofit{t.organizations?.nonprofit_verified ? " ✓" : ""}
                              </span>
                            )}
                            {t.organizations?.ein && (
                              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                EIN: {t.organizations.ein}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1.5 text-[10px]">
                            <label className="inline-flex items-center gap-1 cursor-pointer" title="Show on /tournaments/search">
                              <input
                                type="checkbox"
                                className="h-3 w-3"
                                checked={!!t.show_in_public_search}
                                onChange={e => togglePublicSearch(t.id, e.target.checked)}
                              />
                              <span className={t.show_in_public_search ? "text-primary font-semibold" : "text-muted-foreground"}>
                                Public search
                              </span>
                            </label>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-semibold">{t.tournament_registrations?.length || 0}</span>
                            {t.max_players && (
                              <span className="text-muted-foreground text-xs">/ {t.max_players}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <select
                              value={t.organizations?.plan || "base"}
                              onChange={e => updateOrgPlan(t.organization_id, e.target.value)}
                              disabled={updatingOrgPlan === t.organization_id}
                              className="flex h-7 rounded-md border border-input bg-background px-2 py-0.5 text-xs"
                            >
                              <option value="free">Free</option>
                              <option value="starter">Starter ($299)</option>
                              <option value="premium">Premium ($999)</option>
                            </select>
                            {updatingOrgPlan === t.organization_id && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => toggleTournamentPublished(t.id, !!t.site_published)}
                            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                              t.site_published
                                ? "bg-primary/15 text-primary hover:bg-primary/25"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                            title={t.site_published ? "Click to unpublish" : "Click to publish"}
                          >
                            {t.site_published ? <Globe className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            {t.site_published ? "Live" : "Draft"}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => toggleTournamentRegistration(t.id, !!t.registration_open)}
                            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                              t.registration_open
                                ? "bg-primary/15 text-primary hover:bg-primary/25"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                            title={t.registration_open ? "Click to close registration" : "Click to open registration"}
                          >
                            {t.registration_open ? <UserCheck className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            {t.registration_open ? "Open" : "Closed"}
                          </button>
                        </td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            t.status === "active" ? "bg-primary/15 text-primary" :
                            t.status === "completed" ? "bg-muted text-muted-foreground" :
                            "bg-secondary/15 text-secondary"
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">
                          {t.date ? new Date(t.date).toLocaleDateString() : "—"}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <a
                              href={`/dashboard?admin_org=${t.organization_id}`}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium whitespace-nowrap"
                            >
                              <Pencil className="h-3 w-3" /> Manage
                            </a>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Reset user password"
                              onClick={() => handleAdminResetPassword(t.organization_id)}
                              disabled={resettingPassword === t.organization_id}
                            >
                              {resettingPassword === t.organization_id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />}
                            </Button>
                            {deletingTournament === t.id && deleteConfirmStep > 0 ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="text-xs h-7 px-2"
                                  onClick={() => handleDeleteTournament(t.id)}
                                  disabled={deleteConfirmStep === 3}
                                >
                                  {deleteConfirmStep === 3 ? <Loader2 className="h-3 w-3 animate-spin" /> :
                                   deleteConfirmStep === 1 ? "Confirm?" : "DELETE FOREVER"}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 px-1" onClick={cancelDelete}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Delete tournament"
                                onClick={() => handleDeleteTournament(t.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedTournament(expandedTournament === t.id ? null : t.id)}
                            >
                              {expandedTournament === t.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {allTournaments.length === 0 && (
                      <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No tournaments found</td></tr>
                    )}
                  </tbody>
                </table>

                {/* Expanded tournament details */}
                {expandedTournament && (() => {
                  const t = allTournaments.find((x: any) => x.id === expandedTournament);
                  if (!t) return null;
                  return (
                    <div className="border-t border-border bg-muted/30 p-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">Location</span>
                          <p className="font-medium">{t.location || "—"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Max Players</span>
                          <p className="font-medium">{t.max_players || "—"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Registration Fee</span>
                          <p className="font-medium">{t.registration_fee_cents ? `$${(t.registration_fee_cents / 100).toFixed(2)}` : "Free"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Registration</span>
                          <p className="font-medium">{t.registration_open ? "Open" : "Closed"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Scoring Format</span>
                          <p className="font-medium capitalize">{(t.scoring_format || "stroke_play").replace(/_/g, " ")}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Course Par</span>
                          <p className="font-medium">{t.course_par || 72}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Template</span>
                          <p className="font-medium capitalize">{t.template || "classic"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Countdown Style</span>
                          <p className="font-medium capitalize">{t.countdown_style || "glass"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Contact Email</span>
                          <p className="font-medium">{t.contact_email || "—"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Donation Goal</span>
                          <p className="font-medium">{t.donation_goal_cents ? `$${(t.donation_goal_cents / 100).toFixed(0)}` : "—"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Printable Font</span>
                          <p className="font-medium capitalize">{t.printable_font || "georgia"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Created</span>
                          <p className="font-medium">{new Date(t.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border flex items-center gap-4">
                        <button
                          onClick={() => togglePassFees(t.id, !!t.pass_fees_to_registrants)}
                          className={`inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                            t.pass_fees_to_registrants
                              ? "bg-primary/15 text-primary hover:bg-primary/25"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          <DollarSign className="h-4 w-4" />
                          {t.pass_fees_to_registrants ? "Fees Passed to Registrants ✓" : "Pass Fees to Registrants"}
                        </button>
                        <span className="text-xs text-muted-foreground">
                          {t.pass_fees_to_registrants
                            ? "Platform + Stripe fees are automatically added to the registration total."
                            : "Organizer absorbs the platform + Stripe fees."}
                        </span>
                      </div>

                      {/* Feature Overrides & Fee Override */}
                      <AdminFeatureToggles
                        organizationId={t.organization_id}
                        orgName={t.organizations?.name || "Organization"}
                        currentPlan={t.organizations?.plan || "base"}
                        currentOverrides={t.organizations?.feature_overrides || null}
                        currentFeeOverride={t.organizations?.fee_override ?? null}
                        callAdminApi={callAdminApi}
                        onRefresh={fetchAll}
                      />
                    </div>
                  );
                })()}
              </div>

              <div className="text-xs text-muted-foreground text-right">
                {allTournaments.length} tournament{allTournaments.length !== 1 ? "s" : ""} total
              </div>
            </div>
          )}


          {/* Sales Hub Tab — All sales tools consolidated */}
          {activeTab === "sales-hub" && (
            <AdminSalesHub
              prospects={adminProspects}
              activities={prospectActivities}
              outreachTemplates={outreachTemplates}
              onRefresh={fetchAll}
              callAdminApi={callAdminApi}
              ProspectsComponent={AdminProspects}
              StatsComponent={AdminProspectStats}
              EmailScriptsComponent={AdminEmailScripts}
              DemoScriptComponent={AdminDemoScript}
            />
          )}

          {/* Store Tab */}
          {activeTab === "store" && (
            <AdminStore products={platformProducts} callAdminApi={callAdminApi} onRefresh={fetchAll} />
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && <AdminAnalytics />}

          {/* College Hub Tab */}
          {activeTab === "college" && <CollegeTournamentHub />}

          {/* Flyer Templates Tab */}
          {activeTab === "flyer-templates" && <AdminFlyerTemplates />}

          {/* Notifications & Requests Tab */}
          {activeTab === "notifications" && <AdminNotifications />}

          {/* Transactions Tab */}
          {activeTab === "transactions" && <AdminTransactions />}

          {/* Accounting Tab */}
          {activeTab === "accounting" && <AdminAccounting />}
        </div>
      </section>
    </Layout>
  );
};

export default AdminDashboard;
