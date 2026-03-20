import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, RotateCcw, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RefundRequest {
  id: string;
  registration_id: string;
  amount_cents: number;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  registration?: {
    first_name: string;
    last_name: string;
    email: string;
    payment_status: string;
  };
}

interface RefundManagementProps {
  tournamentId: string;
  demoGuard: () => boolean;
}

export default function RefundManagement({ tournamentId, demoGuard }: RefundManagementProps) {
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const fetchRequests = useCallback(async () => {
    const { data } = await supabase
      .from("tournament_refund_requests")
      .select("*, tournament_registrations(first_name, last_name, email, payment_status)")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: false }) as any;

    setRequests(
      (data || []).map((r: any) => ({
        ...r,
        registration: r.tournament_registrations,
      }))
    );
    setLoading(false);
  }, [tournamentId]);

  useEffect(() => {
    if (tournamentId) fetchRequests();
  }, [tournamentId, fetchRequests]);

  const handleAction = async (requestId: string, action: "approved" | "denied") => {
    if (demoGuard()) return;
    setProcessingId(requestId);

    try {
      if (action === "approved") {
        // Call the refund edge function
        const { data, error } = await supabase.functions.invoke("process-refund", {
          body: { refund_request_id: requestId, admin_notes: adminNotes[requestId] || "" },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast.success("Refund processed successfully!");
      } else {
        // Just update the status to denied
        const { error } = await supabase
          .from("tournament_refund_requests")
          .update({
            status: "denied",
            admin_notes: adminNotes[requestId] || null,
            resolved_at: new Date().toISOString(),
          } as any)
          .eq("id", requestId);
        if (error) throw error;
        toast.success("Refund request denied.");
      }
      await fetchRequests();
    } catch (err: any) {
      toast.error(err.message || "Failed to process refund");
    }
    setProcessingId(null);
  };

  const handleDirectRefund = async (registrationId: string) => {
    if (demoGuard()) return;
    setProcessingId(registrationId);
    try {
      const { data, error } = await supabase.functions.invoke("process-refund", {
        body: { registration_id: registrationId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Refund processed successfully!");
      await fetchRequests();
    } catch (err: any) {
      toast.error(err.message || "Failed to process refund");
    }
    setProcessingId(null);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved": return <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50"><CheckCircle className="h-3 w-3 mr-1" />Refunded</Badge>;
      case "denied": return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50"><XCircle className="h-3 w-3 mr-1" />Denied</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RotateCcw className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-display font-bold text-foreground">Refund Requests</h2>
          {pendingCount > 0 && (
            <Badge className="bg-amber-500 text-white">{pendingCount} pending</Badge>
          )}
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-8 bg-muted/20 rounded-lg border border-border">
          <RotateCcw className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No refund requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="bg-card rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-foreground">
                    {req.registration?.first_name} {req.registration?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{req.registration?.email}</p>
                  <p className="text-sm font-medium text-foreground mt-1">
                    Refund amount: ${(req.amount_cents / 100).toFixed(2)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {statusBadge(req.status)}
                  <span className="text-xs text-muted-foreground">
                    {new Date(req.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="bg-muted/30 rounded p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Reason:</p>
                <p className="text-sm text-foreground">{req.reason}</p>
              </div>

              {req.admin_notes && (
                <div className="bg-primary/5 rounded p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Admin Notes:</p>
                  <p className="text-sm text-foreground">{req.admin_notes}</p>
                </div>
              )}

              {req.status === "pending" && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Textarea
                    placeholder="Add notes (optional)..."
                    value={adminNotes[req.id] || ""}
                    onChange={(e) => setAdminNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          disabled={processingId === req.id}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          {processingId === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                          Approve & Refund
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirm Refund</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to approve a ${(req.amount_cents / 100).toFixed(2)} refund for{" "}
                            <span className="font-semibold">{req.registration?.first_name} {req.registration?.last_name}</span>?
                            This will process the refund through Stripe and cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleAction(req.id, "approved")}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            Yes, Process Refund
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={processingId === req.id}
                          className="text-destructive border-destructive/20 hover:bg-destructive/10"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Deny
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Deny Refund Request</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to deny the refund request from{" "}
                            <span className="font-semibold">{req.registration?.first_name} {req.registration?.last_name}</span>?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleAction(req.id, "denied")}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Yes, Deny Request
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
