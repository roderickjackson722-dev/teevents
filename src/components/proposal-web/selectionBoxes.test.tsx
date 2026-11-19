import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { documentSchema, emptyDocument, type WebDocument } from "./content";
import { defaultSelectionBoxes, duplicateSelectionBox, resolveSelectionBox, selectionBoxes } from "./selectionBoxes";
import { choiceNotification } from "./choiceNotification";
import SelectionBoxesEditor from "./SelectionBoxesEditor";
import ProposalClosure from "./ProposalClosure";
vi.mock("@tanstack/react-start",()=>({useServerFn:()=>vi.fn()}));
vi.mock("./proposalWeb.functions",()=>({chooseWebProgram:vi.fn()}));
afterEach(cleanup);
it("duplicates a package and lets each option keep independent editable payment terms",()=>{
 const d=emptyDocument();const first=defaultSelectionBoxes(d).find(b=>b.program==="Full Service Management");
 if(!first)throw new Error("missing management offer");
 const second={...duplicateSelectionBox(first,"alternate"),title:"Alternate package",text:"Pay by invoice after confirmation"};
 d.selectionBoxes=[first,second];
 expect(documentSchema.parse(d).selectionBoxes?.[1].text).toBe("Pay by invoice after confirmation");
 expect(first.text).toContain("50% deposit");expect(second.id).not.toBe(first.id);
});
it("hidden, blank and unoffered choices cannot be accepted",()=>{
 const d=emptyDocument();const base=defaultSelectionBoxes(d)[0];
 d.selectionBoxes=[{...base,enabled:false},{...base,id:"blank",title:""},{...base,id:"enterprise",program:"Enterprise"}];
 expect(selectionBoxes(d)).toEqual([]);
 expect(()=>resolveSelectionBox(d,base.id,base.program)).toThrow();
});
it("custom notification contains the selected package and payment wording, not an automatic deposit",()=>{
 const d=emptyDocument();d.selectionBoxes=[{id:"invoice",program:"Full Service Management",enabled:true,title:"Championship package",text:"$6,000; invoice in two installments",button:"Choose invoice",next:"Rod will confirm"}];
 const msg=choiceNotification(d,"Full Service Management","2026-11-19",undefined,"invoice");
 expect(msg.to).toEqual(["info@teevents.golf"]);expect(msg.text).toContain("$6,000; invoice in two installments");
 expect(msg.text).not.toContain("Deposit due at agreement:");
 expect(()=>choiceNotification(d,"Per Event","2026-11-19",undefined,"invoice")).toThrow();
});
it("legacy documents keep custom options absent",()=>{
 expect(documentSchema.parse(emptyDocument()).selectionBoxes).toBeUndefined();
});
it("editor duplication produces independently editable client choices",()=>{
 const initial=emptyDocument();initial.packages=["Full Service Management"];
 function Harness(){const [d,set]=useState<WebDocument>(initial);return <><SelectionBoxesEditor document={d} onChange={set}/><ProposalClosure document={d}/></>;}
 render(<Harness/>);
 fireEvent.click(screen.getByLabelText("Use editable customer selection boxes"));
 fireEvent.click(screen.getByRole("button",{name:"Duplicate box"}));
 fireEvent.change(screen.getAllByLabelText("Box heading")[1],{target:{value:"Alternate package"}});
 fireEvent.change(screen.getAllByRole("textbox",{name:"Package, price and payment wording"})[1],{target:{value:"Invoice after approval"}});
 fireEvent.change(screen.getAllByLabelText("Button text")[1],{target:{value:"Choose alternate"}});
 fireEvent.click(screen.getByRole("button",{name:"Choose alternate"}));
 expect(screen.getByRole("heading",{name:"Alternate package"})).toBeTruthy();
 expect(screen.getByRole("heading",{name:"Alternate package"}).parentElement).toHaveTextContent("Invoice after approval");
 expect(screen.getByRole("button",{name:"Sign and Submit"})).toBeDisabled();
 expect(screen.queryByRole("button",{name:"Sign, Submit and Pay by Card"})).toBeNull();
});