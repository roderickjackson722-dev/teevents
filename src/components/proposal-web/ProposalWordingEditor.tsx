import { useId, type ReactNode } from "react";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import ImageUploadButton from "./ImageUploadButton";
import SelectionBoxesEditor from "./SelectionBoxesEditor";
import { defaultScreens, proposalScreens } from "./screens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextarea as Textarea } from "./RichText";
import {
  editableProgramDetail,
  programDetails,
  programSubsections,
  withProgramLayout,
  programNames,
  proposalFaq,
  proposalPageContent,
  proposalPhotoLinksPage,
  proposalReferencesPage,
  sectionShown,
  showValidityLine,
  shownPrograms,
  withProgramDetail,
  type PageContent,
  type ProposalSectionId,
  type WebDocument,
} from "./content";

function InputLine({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  const id = useId();
  return <label htmlFor={id} className="grid gap-2 text-sm font-semibold"><span>{label}</span><Input id={id} type={type} value={value} onChange={event => onChange(event.target.value)} className="bg-background font-normal" /></label>;
}

function EditArea({ label, value, onChange, rows = 6 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  const id = useId();
  return <label htmlFor={id} className="grid gap-2 text-sm font-semibold"><span>{label}</span><Textarea id={id} rows={rows} value={value} onChange={event => onChange(event.target.value)} className="min-h-32 w-full resize-y bg-background text-base font-normal leading-7" /></label>;
}

type FieldDef = { key: keyof PageContent; label: string; rows?: number; type?: string };
const f = (key: keyof PageContent, label: string, rows?: number, type?: string): FieldDef => ({ key, label, rows, type });

function Group({ title, show, onShow, children, open }: { title: string; show?: boolean; onShow?: (v: boolean) => void; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="rounded-lg border border-border bg-muted/30 p-4">
      <summary className="cursor-pointer font-display text-lg font-semibold">{title}{show === false && <span className="ml-2 text-sm font-normal text-muted-foreground">(hidden)</span>}</summary>
      {onShow && <label className="mt-4 flex items-center gap-3 font-semibold"><input type="checkbox" checked={show} onChange={e => onShow(e.target.checked)} />Show this section in the proposal</label>}
      <div className="mt-5 grid gap-5">{children}</div>
    </details>
  );
}

export default function ProposalWordingEditor({ document: d, onChange }: { document: WebDocument; onChange: (document: WebDocument) => void }) {
  const copy = proposalPageContent(d);
  const faqs = proposalFaq(d);
  const references = proposalReferencesPage(d);
  const photos = proposalPhotoLinksPage(d);
  const updateCopy = (key: keyof PageContent, value: string) => onChange({ ...d, pageContent: { ...copy, [key]: value } });
  const updateReferences = (next: typeof references) => onChange({ ...d, referencesPage: next });
  const updatePhotos = (next: typeof photos) => onChange({ ...d, photoLinksPage: next });
  const screens = proposalScreens(d);
  const setScreens = (next: typeof screens) => onChange({ ...d, screens: next });
  const shown = (id: ProposalSectionId) => sectionShown(d, id);
  const setShown = (id: ProposalSectionId, v: boolean) => onChange({ ...d, hiddenSections: v ? (d.hiddenSections ?? []).filter(x => x !== id) : [...(d.hiddenSections ?? []).filter(x => x !== id), id] });
  const fields_ = (list: FieldDef[]) => list.map(field => field.rows === 1 ? (
    <InputLine key={field.key} label={field.label} type={field.type} value={copy[field.key]} onChange={value => updateCopy(field.key, value)} />
  ) : (
    <EditArea key={field.key} label={field.label} value={copy[field.key]} rows={field.rows} onChange={value => updateCopy(field.key, value)} />
  ));

  return (
    <section aria-label="Proposal wording and optional pages" className="rounded-xl border border-border bg-background p-5 shadow-sm sm:p-7">
      <h2 className="font-display text-2xl font-bold text-primary">Proposal wording and optional pages</h2>
      <p className="mt-3 max-w-4xl leading-7 text-muted-foreground">Expand any area below. Every wording box is resizable, so you have room to tailor this proposal for the organization. These controls never appear on the client page or printout.</p>

      <div className="mt-6 space-y-4">
        <p className="text-sm font-semibold">Sections are listed in the same order the client sees them.</p>
        <Group title="1. Cover and contact details">{fields_([f("coverSubtitle","Cover subtitle",1),f("coverPromise","Cover promise",3),f("contactWebsite","Website (clickable)",1),f("contactEmail","Email",1,"email"),f("contactPhone","Phone",1,"tel")])}</Group>
        <Group title="2. About TeeVents" show={shown("about")} onShow={v => setShown("about", v)}>{fields_([f("aboutHeading","Section title",1),f("aboutBody","About TeeVents wording",14),f("aboutIncludes","Every program includes",5)])}</Group>
        <Group title="3. Quick note (intro and reason)" show={shown("intro")} onShow={v => setShown("intro", v)}>{fields_([f("introHeading","Section title",1)])}<p className="text-sm text-muted-foreground">The recommended program, intro and reason boxes are in this section on the proposal below.</p></Group>
        <Group title="4. Programs at a Glance" show={shown("programs")} onShow={v => setShown("programs", v)}>{fields_([f("programsHeading","Section title",1)])}<p className="text-sm text-muted-foreground">Pick which programs to include in this section on the proposal below.</p></Group>
        <Group title="5. Program details and expectations" show={shown("details")} onShow={v => setShown("details", v)}>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Edit the definition, inclusions, scope, group responsibilities, limits and other terms for each selected program. Price wording shown to this client is editable; platform-fee terms stay connected to the program. Show, hide, rename or reorder any part. Full Service price, deposit, payment and cancellation wording is edited in its pricing area below.</p>
          <div className="mt-5 space-y-4">{shownPrograms(d).map(program => (
            <details key={program} className="rounded-lg border border-border bg-background p-4">
              <summary className="cursor-pointer font-semibold text-primary">{program}</summary>
              <p className="mt-4 text-sm text-muted-foreground">Uncheck a part to remove it from the proposal, rename its title, or use the arrows to move it up or down.</p>
              <div className="mt-4 grid gap-5">{(() => { const subs = programSubsections(d, program); const layout = d.programLayout?.[program] || {}; const save = (next: typeof layout) => onChange(withProgramLayout(d, program, { order: subs.map(x => x.label), ...layout, ...next })); const move = (i: number, dir: number) => { const order = subs.map(x => x.label); const j = i + dir; if (j < 0 || j >= order.length) return; [order[i], order[j]] = [order[j], order[i]]; save({ order }); }; return subs.map((x, i) => (
                <div key={x.label} className="space-y-3 rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={x.shown} onChange={e => save({ hidden: e.target.checked ? (layout.hidden || []).filter(h => h !== x.label) : [...(layout.hidden || []), x.label] })} />Show</label>
                    <div className="min-w-[12rem] flex-1"><InputLine label="Title" value={x.title} onChange={title => save({ titles: { ...layout.titles, [x.label]: title } })} /></div>
                    <Button type="button" variant="outline" size="sm" aria-label={`Move ${x.title} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</Button>
                    <Button type="button" variant="outline" size="sm" aria-label={`Move ${x.title} down`} disabled={i === subs.length - 1} onClick={() => move(i, 1)}>↓</Button>
                  </div>
                  {editableProgramDetail(program, x.label) ? <EditArea label="Wording" value={x.text} rows={x.label === "What We Provide" || x.label === "Your Group Handles" || x.label === "Limits" ? 9 : 6} onChange={next => onChange(withProgramDetail(d, program, x.label, next))} /> : <p className="text-sm text-muted-foreground">{x.label === "Platform fee" ? "Platform fee wording is locked, but you can hide or move it." : "Edit this wording in the Full Service pricing area below."}</p>}
                </div>
              )); })()}</div>
            </details>
          ))}</div>
        </Group>
        <Group title="6. Add ons" show={shown("addons")} onShow={v => setShown("addons", v)}>{fields_([f("addonsHeading","Section title",2),f("addonsItems","Add ons, one per line",8),f("addonsNote","Processing note",3)])}</Group>
        <Group title="7. Sample screens and photos" show={shown("screens")} onShow={v => setShown("screens", v)}>
          {fields_([f("screensHeading","Section title",2)])}
          {screens.map((x, index) => (
            <div key={x.id} className="space-y-3 rounded-lg border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-3"><span className="font-semibold">Photo {index + 1}</span><Button type="button" variant="ghost" size="sm" onClick={() => setScreens(screens.filter(s => s.id !== x.id))}><Trash2 />Remove</Button></div>
              <div className="flex flex-wrap items-center gap-3">{x.url && <img src={x.url} alt="" className="h-20 w-32 rounded border border-border object-cover" />}<ImageUploadButton label={x.url ? "Replace photo" : "Upload photo"} onUploaded={url => setScreens(screens.map(s => s.id === x.id ? { ...s, url } : s))} /></div>
              <div className="grid gap-4 md:grid-cols-2"><InputLine label="Title" value={x.title} onChange={title => setScreens(screens.map(s => s.id === x.id ? { ...s, title } : s))} /><InputLine label="Caption" value={x.caption} onChange={caption => setScreens(screens.map(s => s.id === x.id ? { ...s, caption } : s))} /></div>
            </div>
          ))}
          {!screens.length && <p className="text-sm text-muted-foreground">No photos. This section stays hidden until you add one.</p>}
          <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => setScreens([...screens, { id: crypto.randomUUID(), title: "", caption: "", url: "" }])}><Plus />Add photo</Button><Button type="button" variant="ghost" onClick={() => setScreens([])}><Trash2 />Remove all</Button><Button type="button" variant="ghost" onClick={() => setScreens(defaultScreens())}><RotateCcw />Restore sample screens</Button></div>
        </Group>
        <Group title="8. Common Questions" show={shown("questions")} onShow={v => setShown("questions", v)}>{fields_([f("questionsHeading","Section title",1)])}
          <div className="mt-5 space-y-5">{faqs.map((item, index) => (
            <div key={item.id} className="space-y-4 rounded-lg border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-3"><span className="font-semibold">Question {index + 1}</span><Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...d, faqItems: faqs.filter(faq => faq.id !== item.id) })}><Trash2 />Remove</Button></div>
              <InputLine label="Question" value={item.question} onChange={question => onChange({ ...d, faqItems: faqs.map(faq => faq.id === item.id ? { ...faq, question } : faq) })} />
              <EditArea label="Answer" value={item.answer} rows={6} onChange={answer => onChange({ ...d, faqItems: faqs.map(faq => faq.id === item.id ? { ...faq, answer } : faq) })} />
            </div>
          ))}</div>
          <Button type="button" variant="outline" className="mt-5" onClick={() => onChange({ ...d, faqItems: [...faqs, { id: crypto.randomUUID(), question: "", answer: "" }] })}><Plus />Add question</Button>
</Group>
        <Group title="9. Sample event page" show={shown("sample-event")} onShow={v => setShown("sample-event", v)}>{fields_([f("sampleEventHeading","Section title",1),f("sampleEventBody","Sample event wording",5),f("sampleEventButton","Button text",1),f("sampleEventUrl","Button link",1,"url")])}</Group>
        <Group title="10. References">
          <label className="mt-5 flex items-center gap-3 font-semibold"><input type="checkbox" checked={references.enabled} onChange={event => updateReferences({ ...references, enabled: event.target.checked })} />Include a References page in this proposal</label>
          <div className="mt-5 grid gap-5">
            <InputLine label="References page title" value={references.title} onChange={title => updateReferences({ ...references, title })} />
            <EditArea label="References introduction" value={references.introduction} rows={4} onChange={introduction => updateReferences({ ...references, introduction })} />
            {references.entries.map((entry, index) => (
              <div key={entry.id} className="space-y-4 rounded-lg border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3"><span className="font-semibold">Reference {index + 1}</span><Button type="button" variant="ghost" size="sm" onClick={() => updateReferences({ ...references, entries: references.entries.filter(item => item.id !== entry.id) })}><Trash2 />Remove</Button></div>
                <div className="grid gap-4 md:grid-cols-2"><InputLine label="Name" value={entry.name} onChange={name => updateReferences({ ...references, entries: references.entries.map(item => item.id === entry.id ? { ...item, name } : item) })} /><InputLine label="Organization" value={entry.organization} onChange={organization => updateReferences({ ...references, entries: references.entries.map(item => item.id === entry.id ? { ...item, organization } : item) })} /></div>
                <EditArea label="Event or relationship details" value={entry.description} rows={5} onChange={description => updateReferences({ ...references, entries: references.entries.map(item => item.id === entry.id ? { ...item, description } : item) })} />
                <InputLine label="Contact details (optional)" value={entry.contact} onChange={contact => updateReferences({ ...references, entries: references.entries.map(item => item.id === entry.id ? { ...item, contact } : item) })} />
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => updateReferences({ ...references, enabled: true, entries: [...references.entries, { id: crypto.randomUUID(), name: "", organization: "", description: "", contact: "" }] })}><Plus />Add reference</Button>
          </div>
</Group>
        <Group title="11. Event Photo Links">
          <label className="mt-5 flex items-center gap-3 font-semibold"><input type="checkbox" checked={photos.enabled} onChange={event => updatePhotos({ ...photos, enabled: event.target.checked })} />Include an Event Photo Links page in this proposal</label>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Upload a preview photo for each link so clients see a picture. Clicking the picture or link opens the gallery.</p>
          <div className="mt-5 grid gap-5">
            <InputLine label="Photo page title" value={photos.title} onChange={title => updatePhotos({ ...photos, title })} />
            <EditArea label="Photo page introduction" value={photos.introduction} rows={4} onChange={introduction => updatePhotos({ ...photos, introduction })} />
            {photos.links.map((link, index) => (
              <div key={link.id} className="space-y-4 rounded-lg border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3"><span className="font-semibold">Photo link {index + 1}</span><Button type="button" variant="ghost" size="sm" onClick={() => updatePhotos({ ...photos, links: photos.links.filter(item => item.id !== link.id) })}><Trash2 />Remove</Button></div>
                <InputLine label="Event or photo title" value={link.title} onChange={title => updatePhotos({ ...photos, links: photos.links.map(item => item.id === link.id ? { ...item, title } : item) })} />
                <InputLine label="Photo-gallery or image web address" type="url" value={link.url} onChange={url => updatePhotos({ ...photos, links: photos.links.map(item => item.id === link.id ? { ...item, url } : item) })} />
                <div className="flex flex-wrap items-center gap-3">{link.previewUrl && <img src={link.previewUrl} alt="" className="h-20 w-32 rounded border border-border object-cover" />}<ImageUploadButton label={link.previewUrl ? "Replace preview photo" : "Upload preview photo"} onUploaded={previewUrl => updatePhotos({ ...photos, links: photos.links.map(item => item.id === link.id ? { ...item, previewUrl } : item) })} />{link.previewUrl && <Button type="button" variant="ghost" size="sm" onClick={() => updatePhotos({ ...photos, links: photos.links.map(item => item.id === link.id ? { ...item, previewUrl: undefined } : item) })}>Remove preview</Button>}</div>
                <EditArea label="Description (optional)" value={link.description} rows={4} onChange={description => updatePhotos({ ...photos, links: photos.links.map(item => item.id === link.id ? { ...item, description } : item) })} />
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => updatePhotos({ ...photos, enabled: true, links: [...photos.links, { id: crypto.randomUUID(), title: "", url: "", description: "" }] })}><Plus />Add photo link</Button>
          </div>
</Group>
        <Group title="12. Next Steps" show={shown("next")} onShow={v => setShown("next", v)}>{fields_([f("nextStepsHeading","Section title",1),f("nextStepsItems","Next steps, one per line",7),f("nextStepsContact","Contact line",3),f("nextStepsFooter","Proposal note",6)])}<p className="text-sm text-muted-foreground">The Contact TeeVents button emails the address in section 1.</p></Group>
        <Group title="13. Start choice and signature" show={d.closureEnabled !== false} onShow={v => onChange({ ...d, closureEnabled: v })}>{fields_([f("closureHeading","Section title",1),f("closureIntroduction","Start choice introduction",4)])}<SelectionBoxesEditor document={d} onChange={onChange}/><label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={showValidityLine(d)} onChange={e => onChange({ ...d, validityLineEnabled: e.target.checked })} />Show the validity line at the bottom ("This proposal ... is valid until ...")</label><p className="text-sm text-muted-foreground">Clients pick a program here, answer a few questions, and type their name to sign. You get an email when they submit.</p></Group>
        <Group title="14. Private-link notice" show={shown("notice")} onShow={v => setShown("notice", v)}>{fields_([f("noticeText","Private-link notice",4)])}</Group>
      </div>
    </section>
  );
}
