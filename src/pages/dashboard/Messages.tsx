import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, Send, Users, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Messages() {
  const { org, loading: orgLoading } = useOrgContext();
  const queryClient = useQueryClient();
  const [selectedTournament, setSelectedTournament] = useState<string>("");
  const [message, setMessage] = useState("");

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
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: { tournament_id: selectedTournament, message },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Messages sent!",
        description: `Successfully sent to ${data.sent} player${data.sent !== 1 ? "s" : ""}.${data.failed ? ` ${data.failed} failed.` : ""}`,
      });
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["tournament-messages"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (orgLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground">Send SMS updates to registered players.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Compose */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> Compose Message
            </CardTitle>
            <CardDescription>Send a text message to all registered players with phone numbers.</CardDescription>
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
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
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

            <div className="flex items-center justify-between">
              {selectedTournament && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {recipientCount ?? "..."} recipient{recipientCount !== 1 ? "s" : ""} with phone numbers
                </div>
              )}
              <Button
                onClick={() => sendMutation.mutate()}
                disabled={!selectedTournament || !message.trim() || sendMutation.isPending || recipientCount === 0}
                className="ml-auto"
              >
                <Send className="mr-2 h-4 w-4" />
                {sendMutation.isPending ? "Sending..." : "Send Now"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
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
                <p className="text-xs text-muted-foreground">Messages sent</p>
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

      {/* History */}
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
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messageHistory.map((msg) => (
                  <TableRow key={msg.id}>
                    <TableCell className="max-w-xs truncate">{msg.body}</TableCell>
                    <TableCell>{msg.recipient_count}</TableCell>
                    <TableCell>
                      <Badge variant={msg.status === "sent" ? "default" : "secondary"}>
                        {msg.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(msg.sent_at), "MMM d, h:mm a")}
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
