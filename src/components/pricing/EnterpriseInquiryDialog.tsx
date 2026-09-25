import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const EnterpriseInquiryDialog = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [f, setF] = useState({ name: "", email: "", organization: "", phone: "", tournamentsPerYear: "", notes: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const { error } = await supabase.functions.invoke("send-enterprise-inquiry", {
      body: { ...f, notes: `Requesting Enterprise plan ($2,500/year).\n${f.notes}` },
    });
    setSending(false);
    if (error) {
      toast.error("Could not send. Please email info@teevents.golf.");
      return;
    }
    toast.success("Thanks! Our team will contact you shortly.");
    setOpen(false);
    setF({ name: "", email: "", organization: "", phone: "", tournamentsPerYear: "", notes: "" });
  };

  const input = "w-full rounded-md border border-border bg-background p-2 text-sm";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Request the Enterprise plan</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="Your name *" className={input} value={f.name} onChange={set("name")} />
          <input required type="email" placeholder="Email *" className={input} value={f.email} onChange={set("email")} />
          <input required placeholder="Golf course / organization *" className={input} value={f.organization} onChange={set("organization")} />
          <input placeholder="Phone" className={input} value={f.phone} onChange={set("phone")} />
          <input placeholder="Tournaments & leagues per year" className={input} value={f.tournamentsPerYear} onChange={set("tournamentsPerYear")} />
          <textarea placeholder="Anything else we should know?" rows={3} className={input} value={f.notes} onChange={set("notes")} />
          <button disabled={sending} className="w-full rounded-md bg-secondary py-3 text-sm font-semibold text-secondary-foreground disabled:opacity-60">
            {sending ? "Sending..." : "Request Enterprise"}
          </button>
          <p className="text-xs text-center text-muted-foreground">Or email info@teevents.golf</p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EnterpriseInquiryDialog;
