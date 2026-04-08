import { useState, useEffect, useCallback } from "react";
import {
  Bell, CheckCircle2, XCircle, Eye, EyeOff, Loader2, Send,
  MessageSquare, Shield, Clock, AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ChangeRequest {
  id: string;
  organization_id: string;
  requested_by: string;
  change_type: string;
  old_value: string | null;
  new_value: string | null;
  account_holder_name: string | null;
  new_routing_last4: string | null;
  new_account_last4: string | null;
  admin_toggle_granted: boolean;
  status: string;
  review_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface OrgMessage {
  id: string;
  organization_id: string;
  sender_user_id: string | null;
  subject: string;
  message: string;
  direction: string;
  status: string;
  parent_message_id: string | null;
  read_at: string | null;
  created_at: string;
}

interface AuditEntry {
  id: string;
  action: string;
  details: any;
  created_at: string;
  user_id: string;
  organization_id: string;
}

// Helper to fetch org name by ID
const orgNameCache: Record<string, string> = {};

export default function AdminNotifications() {
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [messages, setMessages] = useState<OrgMessage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgNames, setOrgNames] = useState<Record<string, string>>({});

  // Modal state
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // Message reply state
  const [replyingTo, setReplyingTo] = useState<OrgMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // Thread state
  const [expandedThread, setExpandedThread] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<OrgMessage[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [crRes, msgRes, auditRes] = await Promise.all([
      supabase
        .from("payout_change_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("organizer_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("payout_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const crs = (crRes.data || []) as unknown as ChangeRequest[];
    const msgs = (msgRes.data || []) as unknown as OrgMessage[];
    const audits = (auditRes.data || []) as unknown as AuditEntry[];

    setChangeRequests(crs);
    setMessages(msgs);
    setAuditLogs(audits);

    // Fetch org names for all unique org IDs
    const orgIds = [...new Set([
      ...crs.map(c => c.organization_id),
      ...msgs.map(m => m.organization_id),
    ])].filter(id => !orgNameCache[id]);

    if (orgIds.length > 0) {
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", orgIds);
      if (orgs) {
        const newNames: Record<string, string> = { ...orgNameCache };
        orgs.forEach((o: any) => {
          newNames[o.id] = o.name;
          orgNameCache[o.id] = o.name;
        });
        setOrgNames(prev => ({ ...prev, ...newNames }));
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getOrgName = (orgId: string) => orgNames[orgId] || orgNameCache[orgId] || "Unknown Org";

  const handleApprove = async (req: ChangeRequest) => {
    setProcessing(true);
    const { error } = await supabase
      .from("payout_change_requests")
      .update({
        status: "approved",
        admin_toggle_granted: true,
        reviewed_at: new Date().toISOString(),
        review_notes: "Approved — organizer may now update via Stripe Connect.",
      } as any)
      .eq("id", req.id);

    if (!error) {
      // Log the action
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("payout_audit_log").insert({
        organization_id: req.organization_id,
        user_id: user?.id || "",
        action: "approved_bank_change",
        details: { request_id: req.id, summary: `Approved bank change for ${getOrgName(req.organization_id)}` },
      } as any);

      // Send email notification to organizer
      try {
        await supabase.functions.invoke("notify-admin-action", {
          body: {
            type: "bank_change_approved",
            organization_id: req.organization_id,
          },
        });
      } catch { /* non-critical */ }

      toast.success("Request approved. Organizer has been notified.");
      fetchAll();
    } else {
      toast.error("Failed to approve request.");
    }
    setProcessing(false);
    setSelectedRequest(null);
  };

  const handleDeny = async (req: ChangeRequest) => {
    if (!denyReason.trim()) {
      toast.error("Please provide a reason for denial.");
      return;
    }
    setProcessing(true);
    const { error } = await supabase
      .from("payout_change_requests")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        review_notes: denyReason,
      } as any)
      .eq("id", req.id);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("payout_audit_log").insert({
        organization_id: req.organization_id,
        user_id: user?.id || "",
        action: "denied_bank_change",
        details: { request_id: req.id, reason: denyReason, summary: `Denied bank change for ${getOrgName(req.organization_id)}` },
      } as any);

      try {
        await supabase.functions.invoke("notify-admin-action", {
          body: {
            type: "bank_change_denied",
            organization_id: req.organization_id,
            reason: denyReason,
          },
        });
      } catch { /* non-critical */ }

      toast.success("Request denied. Organizer has been notified.");
      setDenyReason("");
      fetchAll();
    } else {
      toast.error("Failed to deny request.");
    }
    setProcessing(false);
    setSelectedRequest(null);
  };

  const handleReply = async () => {
    if (!replyingTo || !replyText.trim()) return;
    setSendingReply(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("organizer_messages").insert({
      organization_id: replyingTo.organization_id,
      sender_user_id: user?.id || null,
      subject: `Re: ${replyingTo.subject}`,
      message: replyText,
      direction: "outgoing",
      status: "resolved",
      parent_message_id: replyingTo.parent_message_id || replyingTo.id,
    } as any);

    if (!error) {
      // Mark original as in_progress or resolved
      await supabase
        .from("organizer_messages")
        .update({ status: "in_progress" } as any)
        .eq("id", replyingTo.id);

      // Send email notification
      try {
        await supabase.functions.invoke("notify-admin-action", {
          body: {
            type: "admin_reply",
            organization_id: replyingTo.organization_id,
            subject: replyingTo.subject,
            reply: replyText,
          },
        });
      } catch { /* non-critical */ }

      toast.success("Reply sent and organizer notified.");
      setReplyText("");
      setReplyingTo(null);
      fetchAll();
    } else {
      toast.error("Failed to send reply.");
    }
    setSendingReply(false);
  };

  const markResolved = async (msg: OrgMessage) => {
    await supabase
      .from("organizer_messages")
      .update({ status: "resolved" } as any)
      .eq("id", msg.id);
    toast.success("Marked as resolved.");
    fetchAll();
  };

  const loadThread = async (msgId: string) => {
    if (expandedThread === msgId) {
      setExpandedThread(null);
      return;
    }
    const { data } = await supabase
      .from("organizer_messages")
      .select("*")
      .or(`id.eq.${msgId},parent_message_id.eq.${msgId}`)
      .order("created_at", { ascending: true });
    setThreadMessages((data || []) as unknown as OrgMessage[]);
    setExpandedThread(msgId);
  };

  const pendingRequests = changeRequests.filter(r => r.status === "pending").length;
  const unreadMessages = messages.filter(m => m.status === "unread" && m.direction === "incoming").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary badges */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2">
          <Shield className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium">{pendingRequests} pending bank change request{pendingRequests !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-2">
          <MessageSquare className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium">{unreadMessages} unread message{unreadMessages !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <Tabs defaultValue="bank-requests">
        <TabsList>
          <TabsTrigger value="bank-requests">
            Bank Change Requests {pendingRequests > 0 && <Badge className="ml-2 bg-amber-500 text-white">{pendingRequests}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="messages">
            Organizer Messages {unreadMessages > 0 && <Badge className="ml-2 bg-blue-500 text-white">{unreadMessages}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="audit-log">Audit Log</TabsTrigger>
        </TabsList>

        {/* TAB 1: Bank Change Requests */}
        <TabsContent value="bank-requests">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bank Account Change Requests</CardTitle>
              <CardDescription>Review and approve/deny organizer bank account changes. Full account numbers are never stored—only last 4 digits.</CardDescription>
            </CardHeader>
            <CardContent>
              {changeRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No change requests yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organizer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Holder Name</TableHead>
                      <TableHead>Routing ····</TableHead>
                      <TableHead>Account ····</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changeRequests.map(req => (
                      <TableRow key={req.id}>
                        <TableCell className="text-sm font-medium">{getOrgName(req.organization_id)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(req.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs capitalize">{req.change_type.replace(/_/g, " ")}</TableCell>
                        <TableCell className="text-sm">{req.account_holder_name || "—"}</TableCell>
                        <TableCell className="text-sm font-mono">
                          {req.new_routing_last4 ? `···· ${req.new_routing_last4}` : "—"}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {req.new_account_last4 ? `···· ${req.new_account_last4}` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              req.status === "approved"
                                ? "text-emerald-600 border-emerald-500/30"
                                : req.status === "rejected"
                                ? "text-destructive border-destructive/30"
                                : "text-amber-600 border-amber-500/30"
                            }
                          >
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {req.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-50"
                                onClick={() => handleApprove(req)}
                                disabled={processing}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/30 hover:bg-destructive/5"
                                onClick={() => { setSelectedRequest(req); setDenyReason(""); }}
                                disabled={processing}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Deny
                              </Button>
                            </div>
                          )}
                          {req.status !== "pending" && (
                            <span className="text-xs text-muted-foreground">{req.review_notes || "—"}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Organizer Messages */}
        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organizer Messages</CardTitle>
              <CardDescription>View and respond to organizer support messages</CardDescription>
            </CardHeader>
            <CardContent>
              {messages.filter(m => m.direction === "incoming" && !m.parent_message_id).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No messages yet.</p>
              ) : (
                <div className="space-y-3">
                  {messages
                    .filter(m => m.direction === "incoming" && !m.parent_message_id)
                    .map(msg => (
                      <div key={msg.id} className="border border-border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{getOrgName(msg.organization_id)}</p>
                            <p className="text-sm font-semibold text-foreground">{msg.subject}</p>
                            <p className="text-sm text-muted-foreground mt-1">{msg.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(msg.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={
                                msg.status === "unread"
                                  ? "text-blue-600 border-blue-500/30"
                                  : msg.status === "in_progress"
                                  ? "text-amber-600 border-amber-500/30"
                                  : "text-emerald-600 border-emerald-500/30"
                              }
                            >
                              {msg.status.replace(/_/g, " ")}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setReplyingTo(msg); setReplyText(""); }}
                          >
                            <Send className="h-3.5 w-3.5 mr-1" /> Reply
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadThread(msg.id)}
                          >
                            {expandedThread === msg.id ? (
                              <><ChevronUp className="h-3.5 w-3.5 mr-1" /> Hide Thread</>
                            ) : (
                              <><ChevronDown className="h-3.5 w-3.5 mr-1" /> View Thread</>
                            )}
                          </Button>
                          {msg.status !== "resolved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600"
                              onClick={() => markResolved(msg)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolve
                            </Button>
                          )}
                        </div>

                        {/* Thread expansion */}
                        {expandedThread === msg.id && threadMessages.length > 0 && (
                          <div className="mt-3 pl-4 border-l-2 border-primary/20 space-y-3">
                            {threadMessages.map(tm => (
                              <div
                                key={tm.id}
                                className={`p-3 rounded-lg text-sm ${
                                  tm.direction === "outgoing"
                                    ? "bg-primary/5 border border-primary/10"
                                    : "bg-muted/50"
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {tm.direction === "outgoing" ? "Admin" : "Organizer"}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(tm.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-foreground">{tm.message}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Audit Log */}
        <TabsContent value="audit-log">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Security Audit Log</CardTitle>
              <CardDescription>All admin actions logged for compliance review</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No audit entries yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs">{new Date(log.created_at).toLocaleString()}</TableCell>
                        <TableCell className="text-xs capitalize">{log.action.replace(/_/g, " ")}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {typeof log.details === "object" && log.details?.summary
                            ? log.details.summary
                            : JSON.stringify(log.details) || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Deny Reason Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Change Request</DialogTitle>
            <DialogDescription>
              Provide a reason for denying this bank change request from {selectedRequest ? getOrgName(selectedRequest.organization_id) : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason for Denial</Label>
              <Textarea
                placeholder="e.g. Could not verify account ownership via phone..."
                value={denyReason}
                onChange={e => setDenyReason(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={() => selectedRequest && handleDeny(selectedRequest)}
                disabled={processing || !denyReason.trim()}
                className="flex-1"
              >
                {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Deny Request
              </Button>
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={!!replyingTo} onOpenChange={() => setReplyingTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to {replyingTo ? getOrgName(replyingTo.organization_id) : ""}</DialogTitle>
            <DialogDescription>
              Re: {replyingTo?.subject}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Original message:</p>
              <p className="text-sm">{replyingTo?.message}</p>
            </div>
            <div>
              <Label>Your Reply</Label>
              <Textarea
                placeholder="Type your response..."
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                className="mt-1.5"
                rows={4}
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleReply}
                disabled={sendingReply || !replyText.trim()}
                className="flex-1"
              >
                {sendingReply && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Send className="h-4 w-4 mr-2" /> Send Reply
              </Button>
              <Button variant="outline" onClick={() => setReplyingTo(null)}>Cancel</Button>
            </div>
            <p className="text-xs text-muted-foreground">This reply will also be emailed to the organizer.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
