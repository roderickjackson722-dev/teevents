import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { shownPrograms, type WebDocument } from "./content";
import { fullServiceTotals, money } from "./pricing";
import { chooseWebProgram } from "./proposalWeb.functions";

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
  const [agreed, setAgreed] = useState(false);
  const [depositState, setDepositState] = useState<"" | "paid" | "cancelled">("");
  const shown = shownPrograms(d);
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

  function pick(p: Program) { setSelected(p); setAgreed(false); setMessage(""); }

  async function confirm() {
    if (!selected) return;
    if (!token) { setMessage("Preview only. No choice recorded, no email sent, and no checkout opened."); return; }
    setBusy(true); setMessage("");
    try {
      const res = await choose({ data: { token, program: selected, origin: window.location.origin } });
      if (res.checkoutUrl) { window.location.href = res.checkoutUrl; return; }
      const signup = SIGNUP[selected];
      if (signup) { window.location.href = signup; return; }
    } catch (e) {
      // Software plans always continue to the regular website sign-up, even if this
      // proposal already has a recorded choice or Rod's notification could not be sent.
      const signup = SIGNUP[selected];
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
      <h2 className="font-display text-3xl font-bold text-primary">Ready to Get Started?</h2>
      <p className="mt-6 text-lg leading-8">Choose how you would like to start. You'll review your choice before anything is submitted, and you can go back or contact us first.</p>
      {depositState === "cancelled" && <p role="status" className="web-controls mt-4">Checkout was cancelled and no payment was taken. You can try again below or contact us.</p>}
      {d.recommended && shown.includes(d.recommended) && <a className="mt-5 inline-block text-sm text-primary underline" href={`#program-${d.recommended.replaceAll(" ", "-")}`}>Your recommended program is {d.recommended}, see its details above</a>}

      {selected ? (
        <div className="web-controls mt-8 rounded-md border border-primary bg-muted p-6">
          <p className="text-sm font-semibold text-primary">Step 2 of 2: Confirm your choice</p>
          <h3 className="mt-2 font-display text-2xl font-semibold">{selected}</h3>
          <p className="mt-3 leading-7">{offers[selected].text}</p>
          <p className="mt-4 font-semibold">What happens next</p>
          <p className="mt-1 leading-7">{offers[selected].next}</p>
          <label className="mt-5 flex items-start gap-3 text-sm leading-6">
            <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-1" aria-label="Confirm program choice" />
            <span>Yes, I want to start with {selected}{d.fields.preparedFor ? ` for ${d.fields.preparedFor}` : ""}.</span>
          </label>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="outline" disabled={busy} onClick={() => setSelected(null)}>Back</Button>
            <Button asChild variant="outline"><a href={CONTACT}>Contact Us First</a></Button>
            <Button disabled={!agreed || busy} onClick={() => void confirm()}>
              {busy ? "Please wait…" : SIGNUP[selected] ? "Confirm and Continue" : "Confirm and Pay by Card"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {shown.filter((p): p is Program => p in offers).map((p) => (
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
      <p className="mt-8 leading-7">This proposal{shown.includes("Full Service Management") ? ", including the Full Service Management price and any discount" : ""}, is valid until {d.fields.validUntil || "[Valid Until date]"}.</p>
    </section>
  );
}
