import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { proposalPageContent, shownPrograms, showValidityLine, type WebDocument } from "./content";
import { fullServiceTotals, money } from "./pricing";
import { chooseWebProgram } from "./proposalWeb.functions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { acceptanceSchema } from "./choiceNotification";
import { Fmt } from "./RichText";
import { selectionBoxes } from "./selectionBoxes";

type Program = "No Cost to Start" | "Per Event" | "Per League" | "Enterprise" | "Full Service Management";
/** Software programs continue through the regular website sign-up and checkout for that plan. */
const SIGNUP: Partial<Record<Program, string>> = {
  "No Cost to Start": "/signup?plan=no-cost",
  "Per Event": "/signup?plan=per-event",
  "Per League": "/signup?plan=per-league",
};
const CONTACT = "mailto:info@teevents.golf?subject=Question%20about%20my%20TeeVents%20proposal";

export default function ProposalClosure({ document: d, token }: { document: WebDocument; token?: string }) {
  const choose = useServerFn(chooseWebProgram);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Program | null>(null);
  const [boxId,setBoxId]=useState<string>();
  const [agreed, setAgreed] = useState(false);
  const blank = { signature: "", title: "", email: "", phone: "", golfers: "", eventDate: "", notes: "" };
  const [form, setForm] = useState(blank);
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const parsed = acceptanceSchema.safeParse({ ...form, agreed });
  const [depositState, setDepositState] = useState<"" | "paid" | "cancelled">("");
  const shown = shownPrograms(d);
  const copy = proposalPageContent(d);
  const boxes=selectionBoxes(d);
  const custom=d.selectionBoxes!==undefined;
  const selectedBox=boxes.find(b=>b.id===boxId);
  const selectedTitle=selectedBox?.title||selected;
  const t = d.fullService ? fullServiceTotals(d.fullService) : null;

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("deposit");
    if (v === "paid" || v === "cancelled") setDepositState(v);
  }, []);

  const offers: Record<Program, { text: string; button: string; next: string }> = {
    "No Cost to Start": { text: "$0 to start, 5% platform fee, paid by players at checkout", button: "Start With No Cost to Start", next: "You'll create your TeeVents account, then continue to the No Cost to Start setup, the same as signing up on our website." },
    "Per Event": { text: "$399 per event, 0% TeeVents platform fee, Live Leaderboard and Mobile Scoring included", button: "Start With Per Event, $399", next: "You'll create your TeeVents account, then continue to the regular Per Event checkout for $399." },
    "Per League": { text: "$599 per league", button: "Start With Per League, $599", next: "You'll create your TeeVents account, then continue to the regular Per League checkout for $599." },
    "Enterprise": { text: "$2,999 per year, for 10 or more events, 0% TeeVents platform fee", button: "Start With Enterprise, $2,999", next: "You'll pay the $2,999 annual Enterprise fee by card on a secure checkout page. After payment, you'll set up your TeeVents account and Rod will reach out to get started." },
    "Full Service Management": { text: `${money(t?.final || 0)} per event, 50% deposit due at agreement (${money(t?.deposit || 0)})`, button: "Start With Full Service Management", next: `You'll pay your 50% deposit of ${money(t?.deposit || 0)} by card on a secure checkout page. The balance of ${money(t?.balance || 0)} is due ${d.fullService?.balanceDueDate || "before event day"}. After payment, you'll set up your TeeVents account and Rod will reach out to get started.` },
  };

  function pick(p: Program,id?:string) { setSelected(p); setBoxId(id); setAgreed(false); setForm(blank); setMessage(""); }

  async function confirm() {
    if (!selected) return;
    if (!parsed.success) { setMessage("Please answer every question, type your full name to sign, and check the approval box."); return; }
    if (!token) { setMessage("Preview only. No choice recorded, no email sent, and no checkout opened."); return; }
    setBusy(true); setMessage("");
    try {
      const res = await choose({ data: { token, program: selected, selectionBoxId:boxId, origin: window.location.origin, acceptance: parsed.data } });
      if(custom){setMessage("Your signed choice was submitted to TeeVents. Rod will follow up to confirm the package and payment arrangements.");setSelected(null);setBusy(false);return;}
      if (res.checkoutUrl) { window.location.href = res.checkoutUrl; return; }
      const signup = custom?undefined:SIGNUP[selected];
      if (signup) { window.location.href = signup; return; }
    } catch (e) {
      // Software plans always continue to the regular website sign-up, even if this
      // proposal already has a recorded choice or Rod's notification could not be sent.
      const signup = custom?undefined:SIGNUP[selected];
      if (signup) { window.location.href = signup; return; }
      setMessage(e instanceof Error ? e.message : "Could not record your choice. Please try again.");
    }
    setBusy(false);
  }

  if (depositState === "paid") {
    return (
      <section id="closure" className="border-b border-border py-12">
        <h2 className="font-display text-3xl font-bold text-primary">Thank You, Your Payment Was Received</h2>
        <p className="mt-6 text-lg leading-8">Rod has been notified and will reach out shortly. Next, set up your TeeVents account so we can start building your event.</p>
        <div className="web-controls mt-6 flex flex-wrap gap-3">
          <Button asChild><a href="/signup">Set Up My Account</a></Button>
          <Button asChild variant="outline"><a href={CONTACT}>Contact Us</a></Button>
        </div>
      </section>
    );
  }

  return (
    <section id="closure" data-track className="border-b border-border py-12">
      <h2 className="font-display text-3xl font-bold text-primary">{copy.closureHeading}</h2>
      <p className="mt-6 text-lg leading-8">{copy.closureIntroduction}</p>
      {depositState === "cancelled" && <p role="status" className="web-controls mt-4">Checkout was cancelled and no payment was taken. You can try again below or contact us.</p>}
      {d.recommended && shown.includes(d.recommended) && <a className="mt-5 inline-block text-sm text-primary underline" href={`#program-${d.recommended.replaceAll(" ", "-")}`}>Your recommended program is {d.recommended}, see its details above</a>}

      {selected ? (
        <div className="web-controls mt-8 rounded-md border border-primary bg-muted p-6">
          <p className="text-sm font-semibold text-primary">Step 2 of 2: Confirm your choice</p>
          <h3 className="mt-2 font-display text-2xl font-semibold"><Fmt text={selectedTitle||""}/></h3>
          <p className="mt-3 whitespace-pre-wrap leading-7"><Fmt text={selectedBox?.text??offers[selected].text}/></p>
          <p className="mt-4 font-semibold">What happens next</p>
          <p className="mt-1 whitespace-pre-wrap leading-7"><Fmt text={selectedBox?.next??offers[selected].next}/></p>
          <p className="mt-6 font-semibold">A few quick questions</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">Your title or role<Input className="mt-1" value={form.title} onChange={set("title")} maxLength={120} /></label>
            <label className="text-sm">Email<Input className="mt-1" type="email" value={form.email} onChange={set("email")} maxLength={320} /></label>
            <label className="text-sm">Phone<Input className="mt-1" type="tel" value={form.phone} onChange={set("phone")} maxLength={40} /></label>
            <label className="text-sm">Expected number of golfers<Input className="mt-1" value={form.golfers} onChange={set("golfers")} maxLength={40} /></label>
            <label className="text-sm sm:col-span-2">Planned event date<Input className="mt-1" value={form.eventDate} onChange={set("eventDate")} maxLength={60} placeholder="e.g. May 15, 2027" /></label>
            <label className="text-sm sm:col-span-2">Anything else we should know? (optional)<Textarea className="mt-1" value={form.notes} onChange={set("notes")} maxLength={1000} /></label>
          </div>
          <p className="mt-6 font-semibold">Sign below</p>
          <label className="mt-2 block text-sm">Type your full name as your electronic signature
            <Input className="mt-1" value={form.signature} onChange={set("signature")} maxLength={120} aria-label="Electronic signature" />
          </label>
          {form.signature.trim() && <p className="mt-3 border-b border-foreground pb-1 text-3xl" style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive" }}>{form.signature}</p>}
          <p className="mt-1 text-xs">Signed {new Date().toLocaleDateString()}</p>
          <label className="mt-5 flex items-start gap-3 text-sm leading-6">
            <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-1" aria-label="Approve proposal" />
            <span>I approve this proposal and want to start with {selectedTitle}{d.fields.preparedFor ? ` for ${d.fields.preparedFor}` : ""}. Typing my name above is my electronic signature.</span>
          </label>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="outline" disabled={busy} onClick={() => setSelected(null)}>Back</Button>
            <Button asChild variant="outline"><a href={CONTACT}>Contact Us First</a></Button>
            <Button disabled={!parsed.success || busy} onClick={() => void confirm()}>
              {busy ? "Please wait…" : custom||SIGNUP[selected] ? "Sign and Submit" : "Sign, Submit and Pay by Card"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {custom?boxes.map(box=><div key={box.id} className={`closure-option rounded-md border p-5 ${d.recommended===box.program?"border-primary bg-muted":"border-border"}`}>
            <h3 className="font-display text-xl font-semibold whitespace-pre-wrap"><Fmt text={box.title}/></h3>
            {box.text.trim()&&<p className="mt-3 whitespace-pre-wrap leading-7"><Fmt text={box.text}/></p>}
            <Button className="web-controls mt-5 h-auto min-h-10 w-full whitespace-normal" onClick={()=>pick(box.program,box.id)}>{box.button.trim()||"Select this option"}</Button>
            <a className="web-controls mt-3 block text-center text-sm text-primary underline" href={CONTACT}>Have a question? Contact us first</a>
          </div>):shown.filter((p): p is Program => p in offers).map((p) => (
            <div key={p} className={`closure-option rounded-md border p-5 ${d.recommended === p ? "border-primary bg-muted" : "border-border"}`}>
              <h3 className="font-display text-xl font-semibold">Start with {p}</h3>
              {p === "Full Service Management" && t && t.discount > 0 && <p className="mt-3"><s>{money(t.base)} per event</s><br />Discount: -{money(t.discount)}{d.fullService?.discountReason ? `, ${d.fullService.discountReason}` : ""}</p>}
              <p className="mt-3 leading-7">{offers[p].text}</p>
              <Button className="web-controls mt-5 w-full" onClick={() => pick(p)}>{offers[p].button}</Button>
              <a className="web-controls mt-3 block text-center text-sm text-primary underline" href={CONTACT}>Have a question? Contact us first</a>
            </div>
          ))}
        </div>
      )}
      {message && <p role="status" className="web-controls mt-6">{message}</p>}
      {showValidityLine(d) && <p className="mt-8 leading-7">This proposal{shown.includes("Full Service Management") ? ", including the Full Service Management price and any discount" : ""}, is valid until {d.fields.validUntil || "[Valid Until date]"}.</p>}
    </section>
  );
}
