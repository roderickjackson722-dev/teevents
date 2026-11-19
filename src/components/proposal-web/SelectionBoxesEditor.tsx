import { Copy, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextarea } from "./RichText";
import { currentProgramNames, shownPrograms, type WebDocument, type SelectionBox } from "./content";
import { defaultSelectionBoxes, duplicateSelectionBox } from "./selectionBoxes";

export default function SelectionBoxesEditor({document:d,onChange}:{document:WebDocument;onChange:(d:WebDocument)=>void}){
 const boxes=d.selectionBoxes??[];
 const save=(next:SelectionBox[])=>onChange({...d,selectionBoxes:next});
 const update=(id:string,patch:Partial<SelectionBox>)=>save(boxes.map(b=>b.id===id?{...b,...patch}:b));
 const programs=currentProgramNames.filter(p=>shownPrograms(d).includes(p));
 const add=()=>{const program=programs[0];if(program)save([...boxes,{id:crypto.randomUUID(),program,enabled:true,title:"",text:"",button:"Select this option",next:"Your signed choice will be sent to TeeVents for confirmation. No payment is taken when you submit this choice."}]);};
 const move=(index:number,offset:number)=>{const next=[...boxes];const target=index+offset;if(target<0||target>=next.length)return;[next[index],next[target]]=[next[target],next[index]];save(next);};
 return <div className="space-y-4">
  <label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={d.selectionBoxes!==undefined} onChange={e=>onChange({...d,selectionBoxes:e.target.checked?defaultSelectionBoxes(d):undefined})}/>Use editable customer selection boxes</label>
  <p className="text-sm text-muted-foreground">Edit packages and payment arrangements here. Each box selects one of the included programs. Custom choices are signed and emailed for your confirmation, with no automatic checkout or charge. Turning this off restores the original program choices.</p>
  {d.selectionBoxes!==undefined&&<>
   {boxes.map((box,index)=><fieldset key={box.id} className="space-y-4 border border-border rounded-md p-4"><legend className="px-1 font-semibold">Selection box {index+1}</legend>
    <div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2"><input type="checkbox" checked={box.enabled} onChange={e=>update(box.id,{enabled:e.target.checked})}/>Show</label>
     <Button variant="outline" size="sm" disabled={boxes.length>=20} onClick={()=>save([...boxes.slice(0,index+1),duplicateSelectionBox(box,crypto.randomUUID()),...boxes.slice(index+1)])}><Copy/>Duplicate box</Button>
     <Button variant="ghost" size="icon" aria-label={`Move selection box ${index+1} up`} disabled={index===0} onClick={()=>move(index,-1)}><ArrowUp/></Button>
     <Button variant="ghost" size="icon" aria-label={`Move selection box ${index+1} down`} disabled={index===boxes.length-1} onClick={()=>move(index,1)}><ArrowDown/></Button>
     <Button variant="ghost" size="sm" onClick={()=>save(boxes.filter(b=>b.id!==box.id))}><Trash2/>Remove box</Button>
    </div>
    <label className="grid gap-2 text-sm font-semibold">Program<select className="w-full rounded-md border border-input bg-background p-3" value={box.program} onChange={e=>{const program=currentProgramNames.find(p=>p===e.target.value);if(program)update(box.id,{program});}}>{programs.map(p=><option key={p}>{p}</option>)}</select></label>
    {!programs.includes(box.program)&&<p role="alert" className="text-sm text-destructive">This program is not included above, so this box is hidden from clients.</p>}
    <label className="grid gap-2 text-sm font-semibold">Box heading<Input value={box.title} maxLength={300} onChange={e=>update(box.id,{title:e.target.value})}/></label>
    <label className="grid gap-2 text-sm font-semibold">Package, price and payment wording<RichTextarea aria-label="Package, price and payment wording" rows={5} value={box.text} onChange={e=>update(box.id,{text:e.target.value})}/></label>
    <label className="grid gap-2 text-sm font-semibold">Button text<Input value={box.button} maxLength={300} onChange={e=>update(box.id,{button:e.target.value})}/></label>
    <label className="grid gap-2 text-sm font-semibold">After-selection wording<RichTextarea aria-label="After-selection wording" rows={4} value={box.next} onChange={e=>update(box.id,{next:e.target.value})}/></label>
   </fieldset>)}
   <Button variant="outline" disabled={!programs.length||boxes.length>=20} onClick={add}><Plus/>Add selection box</Button>
  </>}
 </div>;
}