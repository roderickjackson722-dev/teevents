import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listFullServiceInquiries } from "@/lib/fullServiceQuote.functions";
import { quoteAnswersSchema, quoteAnswerLines } from "@/lib/fullServiceQuote.schema";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function AdminFullServiceInquiries() {
  const list = useServerFn(listFullServiceInquiries);
  const query = useQuery({ queryKey: ["full-service-inquiries"], queryFn: () => list() });
  return <div className="space-y-6"><div className="flex items-start justify-between gap-4"><h2 className="font-display text-2xl font-bold">Full Service Management inquiries</h2><Button variant="outline" size="icon" aria-label="Refresh quote inquiries" title="Refresh quote inquiries" onClick={() => void query.refetch()}><RefreshCw /></Button></div>
    {query.isPending ? <p>Loading inquiries…</p> : query.error ? <p role="alert">{query.error.message}</p> : !query.data?.length ? <p className="text-muted-foreground">No quote inquiries yet.</p> : <div className="divide-y divide-border">{query.data.map(row => {
      const parsed = quoteAnswersSchema.safeParse(row.answers);
      if (!parsed.success) return <p key={row.id}>Inquiry {row.id}: answers could not be displayed.</p>;
      return <details key={row.id} className="py-5"><summary className="cursor-pointer"><span className="font-semibold">{parsed.data.organization} · {parsed.data.eventName}</span><span className="mt-1 block text-sm text-muted-foreground">{new Date(row.submitted_at).toLocaleString()} · {row.email_sent_at ? "Email accepted" : "Email not confirmed"}</span></summary><div className="mt-4 space-y-2">{quoteAnswerLines(parsed.data).map(line => <p key={line} className="whitespace-pre-wrap break-words text-sm leading-relaxed">{line}</p>)}</div></details>;
    })}</div>}
  </div>;
}