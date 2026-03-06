import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Phone, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dashboard-chat`;

async function streamChat({
  messages,
  onDelta,
  onDone,
}: {
  messages: Msg[];
  onDelta: (t: string) => void;
  onDone: () => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  if (!resp.body) throw new Error("No response body");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;

  while (!done) {
    const { done: d, value } = await reader.read();
    if (d) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (c) onDelta(c);
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }
  onDone();
}

export function DashboardChatAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCallForm, setShowCallForm] = useState(false);
  const [callName, setCallName] = useState("");
  const [callPhone, setCallPhone] = useState("");
  const [callSubmitted, setCallSubmitted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showCallForm]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    let soFar = "";
    const upsert = (chunk: string) => {
      soFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: soFar } : m));
        }
        return [...prev, { role: "assistant", content: soFar }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: upsert,
        onDone: () => setLoading(false),
      });
    } catch (e: any) {
      setLoading(false);
      toast({ variant: "destructive", title: "Chat Error", description: e.message });
    }
  }, [input, loading, messages]);

  const handleCallRequest = () => {
    if (!callName.trim() || !callPhone.trim()) {
      toast({ variant: "destructive", title: "Please fill in all fields" });
      return;
    }
    // In production this would hit an API — for now we show confirmation
    setCallSubmitted(true);
    toast({ title: "Call Requested!", description: "A TeeVents team member will call you shortly." });
  };

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 flex items-center justify-center transition-colors"
          >
            <MessageCircle className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-h-[560px] flex flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                <div>
                  <p className="text-sm font-semibold">TeeVents Assistant</p>
                  <p className="text-xs text-primary-foreground/70">Ask me anything about your tournament</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="hover:bg-primary-foreground/10 rounded p-1 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px] max-h-[380px]">
              {messages.length === 0 && !showCallForm && (
                <div className="text-center py-8">
                  <Bot className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">Hi there! 👋</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    I can help with tournament setup, player management, scoring, and more.
                  </p>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && (
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>
                  {m.role === "user" && (
                    <div className="h-6 w-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="h-3.5 w-3.5 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {loading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}

              {/* Request a Call form */}
              {showCallForm && !callSubmitted && (
                <div className="bg-muted rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Phone className="h-4 w-4 text-primary" />
                    Request a Call from TeeVents
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Our team will reach out to help you directly.
                  </p>
                  <Input
                    placeholder="Your name"
                    value={callName}
                    onChange={(e) => setCallName(e.target.value)}
                    className="text-sm h-9"
                  />
                  <Input
                    placeholder="Phone number"
                    value={callPhone}
                    onChange={(e) => setCallPhone(e.target.value)}
                    className="text-sm h-9"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCallRequest} className="flex-1">
                      <Phone className="h-3 w-3 mr-1" /> Request Call
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowCallForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {callSubmitted && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
                  <p className="text-sm font-medium text-primary">✅ Call Requested</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    A TeeVents team member will call {callName} at {callPhone} shortly.
                  </p>
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="border-t border-border p-3 space-y-2">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                  }}
                  placeholder="Ask about your tournament..."
                  className="min-h-[40px] max-h-[80px] text-sm resize-none"
                  rows={1}
                />
                <Button size="icon" onClick={send} disabled={loading || !input.trim()} className="h-10 w-10 flex-shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <button
                onClick={() => { setShowCallForm(true); setCallSubmitted(false); }}
                className="flex items-center justify-center gap-1.5 w-full text-xs text-muted-foreground hover:text-primary transition-colors py-1"
              >
                <Phone className="h-3 w-3" />
                Need more help? Request a call from TeeVents
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
