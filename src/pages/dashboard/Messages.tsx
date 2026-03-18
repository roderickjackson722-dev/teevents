import { useState } from "react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageSquare, Send, Users, Clock, CalendarIcon, Timer } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Messages() {
  const { org, loading: orgLoading } = useOrgContext();
  const { demoGuard } = useDemoMode();
  const queryClient = useQueryClient();
  const [selectedTournament, setSelectedTournament] = useState<string>("");
  const [message, setMessage] = useState("");
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
  const [scheduleDate, setScheduleDate] = useState<Date>();
  const [scheduleTime, setScheduleTime] = useState("09:00");

  const { data: tournaments } = useQuery({
    queryKey: ["tournaments", org?.orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, title, date")
        .eq("organization_id", org!.orgId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!org,
  });

  const { data: recipientCount } = useQuery({
    queryKey: ["sms-recipients", selectedTournament],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("tournament_registrations")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", selectedTournament)
        .not("phone", "is", null)
        .neq("phone", "");
      if (error) throw error;
      return count || 0;
    },
    enabled: !!selectedTournament,
  });

  const { data: messageHistory } = useQuery({
    queryKey: ["tournament-messages", selectedTournament],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_messages")
        .select("*")
        .eq("tournament_id", selectedTournament)
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTournament,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (demoGuard()) throw new Error("Demo mode");
      let scheduled_for: string | undefined;
      if (sendMode === "schedule" && scheduleDate) {
        const [hours, minutes] = scheduleTime.split(":").map(Number);
        const dt = new Date(scheduleDate);
        dt.setHours(hours, minutes, 0, 0);
        scheduled_for = dt.toISOString();
      }

      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: { tournament_id: selectedTournament, message, scheduled_for },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      if (data.scheduled) {
        toast({
          title: "Message scheduled!",
          description: `SMS will be sent at ${format(new Date(data.scheduled_for), "MMM d, h:mm a")}.`,
        });
      } else {
        toast({
          title: "Messages sent!",
          description: `Successfully sent to ${data.sent} player${data.sent !== 1 ? "s" : ""}.${data.failed ? ` ${data.failed} failed.` : ""}`,
        });
      }
      setMessage("");
      setSendMode("now");
      setScheduleDate(undefined);
      queryClient.invalidateQueries({ queryKey: ["tournament-messages"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("tournament_messages")
        .update({ status: "cancelled" })
        .eq("id", messageId)
        .eq("status", "scheduled");
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Message cancelled", description: "The scheduled message has been cancelled." });
      queryClient.invalidateQueries({ queryKey: ["tournament-messages"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to cancel", description: error.message, variant: "destructive" });
    },
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "sent": return "default" as const;
      case "scheduled": return "outline" as const;
      case "cancelled": return "destructive" as const;
      case "processing": return "secondary" as const;
      default: return "secondary" as const;
    }
  };

  if (orgLoading) return <div className="p-6">Loading...</div>;

  const canSend =
    selectedTournament &&
    message.trim() &&
    !sendMutation.isPending &&
    recipientCount !== 0 &&
    (sendMode === "now" || (sendMode === "schedule" && scheduleDate));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground">Send SMS updates to registered players.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> Compose Message
            </CardTitle>
            <CardDescription>Send or schedule a text message to all registered players with phone numbers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tournament</label>
              <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tournament" />
                </SelectTrigger>
                <SelectContent>
                  {tournaments?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                placeholder="Type your message to golfers..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={1600}
              />
              <p className="text-xs text-muted-foreground">{message.length}/1600 characters</p>
            </div>

            {/* Send mode toggle */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Delivery</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={sendMode === "now" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSendMode("now")}
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" /> Send Now
                </Button>
                <Button
                  type="button"
                  variant={sendMode === "schedule" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSendMode("schedule")}
                >
                  <Timer className="mr-1.5 h-3.5 w-3.5" /> Schedule
                </Button>
              </div>

              {sendMode === "schedule" && (
                <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3 bg-muted/30">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[200px] justify-start text-left font-normal",
                            !scheduleDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {scheduleDate ? format(scheduleDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={scheduleDate}
                          onSelect={setScheduleDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Time</label>
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-[140px]"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              {selectedTournament && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {recipientCount ?? "..."} recipient{recipientCount !== 1 ? "s" : ""} with phone numbers
                </div>
              )}
              <Button
                onClick={() => sendMutation.mutate()}
                disabled={!canSend}
                className="ml-auto"
              >
                {sendMode === "schedule" ? (
                  <><Timer className="mr-2 h-4 w-4" />{sendMutation.isPending ? "Scheduling..." : "Schedule Message"}</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" />{sendMutation.isPending ? "Sending..." : "Send Now"}</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{messageHistory?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total messages</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Timer className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {messageHistory?.filter((m) => m.status === "scheduled").length ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Scheduled</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {messageHistory?.reduce((sum, m) => sum + (m.recipient_count || 0), 0) ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Total SMS delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedTournament && messageHistory && messageHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" /> Message History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Message</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent / Scheduled</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messageHistory.map((msg) => (
                  <TableRow key={msg.id}>
                    <TableCell className="max-w-xs truncate">{msg.body}</TableCell>
                    <TableCell>{msg.recipient_count}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(msg.status)}>{msg.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {msg.status === "scheduled" && msg.scheduled_for
                        ? format(new Date(msg.scheduled_for), "MMM d, h:mm a")
                        : format(new Date(msg.sent_at), "MMM d, h:mm a")}
                    </TableCell>
                    <TableCell>
                      {msg.status === "scheduled" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelMutation.mutate(msg.id)}
                          disabled={cancelMutation.isPending}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="mr-1 h-3.5 w-3.5" /> Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
