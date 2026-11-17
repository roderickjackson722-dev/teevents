import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  editableProgramDetail,
  programDetails,
  programNames,
  proposalFaq,
  proposalPageContent,
  proposalPhotoLinksPage,
  proposalReferencesPage,
  shownPrograms,
  withProgramDetail,
  type PageContent,
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

const contentGroups: Array<{ title: string; fields: Array<{ key: keyof PageContent; label: string; rows?: number }> }> = [
  { title: "Cover, About and program overview", fields: [
    { key: "coverSubtitle", label: "Cover subtitle", rows: 1 },
    { key: "coverPromise", label: "Cover promise", rows: 3 },
    { key: "aboutHeading", label: "About heading", rows: 1 },
    { key: "aboutBody", label: "About TeeVents wording", rows: 14 },
    { key: "aboutIncludes", label: "Every program includes", rows: 5 },
    { key: "programsHeading", label: "Programs overview heading", rows: 1 },
  ] },
  { title: "Add ons, sample screens and questions", fields: [
    { key: "addonsHeading", label: "Add ons heading", rows: 2 },
    { key: "addonsItems", label: "Add ons, one per line", rows: 8 },
    { key: "addonsNote", label: "Processing note", rows: 3 },
    { key: "screensHeading", label: "Sample screens heading", rows: 2 },
    { key: "questionsHeading", label: "Common Questions heading", rows: 1 },
  ] },
  { title: "Sample event, next steps and closing", fields: [
    { key: "sampleEventHeading", label: "Sample event heading", rows: 1 },
    { key: "sampleEventBody", label: "Sample event wording", rows: 5 },
    { key: "sampleEventButton", label: "Sample event button", rows: 1 },
    { key: "nextStepsHeading", label: "Next Steps heading", rows: 1 },
    { key: "nextStepsItems", label: "Next steps, one per line", rows: 7 },
    { key: "nextStepsContact", label: "Contact line", rows: 3 },
    { key: "nextStepsFooter", label: "Proposal note", rows: 6 },
    { key: "closureHeading", label: "Start choice heading", rows: 1 },
    { key: "closureIntroduction", label: "Start choice introduction", rows: 4 },
    { key: "noticeText", label: "Private-link notice", rows: 4 },
  ] },
];

export default function ProposalWordingEditor({ document: d, onChange }: { document: WebDocument; onChange: (document: WebDocument) => void }) {
  const copy = proposalPageContent(d);
  const faqs = proposalFaq(d);
  const references = proposalReferencesPage(d);
  const photos = proposalPhotoLinksPage(d);
  const updateCopy = (key: keyof PageContent, value: string) => onChange({ ...d, pageContent: { ...copy, [key]: value } });
  const updateReferences = (next: typeof references) => onChange({ ...d, referencesPage: next });
  const updatePhotos = (next: typeof photos) => onChange({ ...d, photoLinksPage: next });

  return (
    <section aria-label="Proposal wording and optional pages" className="rounded-xl border border-border bg-background p-5 shadow-sm sm:p-7">
      <h2 className="font-display text-2xl font-bold text-primary">Proposal wording and optional pages</h2>
      <p className="mt-3 max-w-4xl leading-7 text-muted-foreground">Expand any area below. Every wording box is resizable, so you have room to tailor this proposal for the organization. These controls never appear on the client page or printout.</p>

      <div className="mt-6 space-y-4">
        {contentGroups.map(group => (
          <details key={group.title} className="rounded-lg border border-border bg-muted/30 p-4">
            <summary className="cursor-pointer font-display text-lg font-semibold">{group.title}</summary>
            <div className="mt-5 grid gap-5">{group.fields.map(field => field.rows === 1 ? (
              <InputLine key={field.key} label={field.label} value={copy[field.key]} onChange={value => updateCopy(field.key, value)} />
            ) : (
              <EditArea key={field.key} label={field.label} value={copy[field.key]} rows={field.rows} onChange={value => updateCopy(field.key, value)} />
            ))}</div>
          </details>
        ))}

        <details className="rounded-lg border border-border bg-muted/30 p-4">
          <summary className="cursor-pointer font-display text-lg font-semibold">Program wording and expectations</summary>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Edit the definition, inclusions, scope, group responsibilities, limits and other terms for each selected program. Prices and platform-fee terms stay connected to the existing program choice. Full Service price, deposit, payment and cancellation remain editable in its pricing area below.</p>
          <div className="mt-5 space-y-4">{shownPrograms(d).map(program => (
            <details key={program} className="rounded-lg border border-border bg-background p-4">
              <summary className="cursor-pointer font-semibold text-primary">{program}</summary>
              <div className="mt-5 grid gap-5">{Object.entries(programDetails(d, program)).filter(([label]) => editableProgramDetail(program, label)).map(([label, value]) => (
                <EditArea key={label} label={label} value={value} rows={label === "What We Provide" || label === "Your Group Handles" || label === "Limits" ? 9 : 6} onChange={next => onChange(withProgramDetail(d, program, label, next))} />
              ))}</div>
            </details>
          ))}</div>
        </details>

        <details className="rounded-lg border border-border bg-muted/30 p-4">
          <summary className="cursor-pointer font-display text-lg font-semibold">Common Questions</summary>
          <div className="mt-5 space-y-5">{faqs.map((item, index) => (
            <div key={item.id} className="space-y-4 rounded-lg border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-3"><span className="font-semibold">Question {index + 1}</span><Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...d, faqItems: faqs.filter(faq => faq.id !== item.id) })}><Trash2 />Remove</Button></div>
              <InputLine label="Question" value={item.question} onChange={question => onChange({ ...d, faqItems: faqs.map(faq => faq.id === item.id ? { ...faq, question } : faq) })} />
              <EditArea label="Answer" value={item.answer} rows={6} onChange={answer => onChange({ ...d, faqItems: faqs.map(faq => faq.id === item.id ? { ...faq, answer } : faq) })} />
            </div>
          ))}</div>
          <Button type="button" variant="outline" className="mt-5" onClick={() => onChange({ ...d, faqItems: [...faqs, { id: crypto.randomUUID(), question: "", answer: "" }] })}><Plus />Add question</Button>
        </details>

        <details open className="rounded-lg border border-border bg-muted/30 p-4">
          <summary className="cursor-pointer font-display text-lg font-semibold">Optional References page</summary>
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
        </details>

        <details open className="rounded-lg border border-border bg-muted/30 p-4">
          <summary className="cursor-pointer font-display text-lg font-semibold">Optional Event Photo Links page</summary>
          <label className="mt-5 flex items-center gap-3 font-semibold"><input type="checkbox" checked={photos.enabled} onChange={event => updatePhotos({ ...photos, enabled: event.target.checked })} />Include an Event Photo Links page in this proposal</label>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Use a direct image web address to show a preview. Every entry also keeps a clickable link; if the image cannot load, the link remains available.</p>
          <div className="mt-5 grid gap-5">
            <InputLine label="Photo page title" value={photos.title} onChange={title => updatePhotos({ ...photos, title })} />
            <EditArea label="Photo page introduction" value={photos.introduction} rows={4} onChange={introduction => updatePhotos({ ...photos, introduction })} />
            {photos.links.map((link, index) => (
              <div key={link.id} className="space-y-4 rounded-lg border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3"><span className="font-semibold">Photo link {index + 1}</span><Button type="button" variant="ghost" size="sm" onClick={() => updatePhotos({ ...photos, links: photos.links.filter(item => item.id !== link.id) })}><Trash2 />Remove</Button></div>
                <InputLine label="Event or photo title" value={link.title} onChange={title => updatePhotos({ ...photos, links: photos.links.map(item => item.id === link.id ? { ...item, title } : item) })} />
                <InputLine label="Image or photo-gallery web address" type="url" value={link.url} onChange={url => updatePhotos({ ...photos, links: photos.links.map(item => item.id === link.id ? { ...item, url } : item) })} />
                <EditArea label="Description (optional)" value={link.description} rows={4} onChange={description => updatePhotos({ ...photos, links: photos.links.map(item => item.id === link.id ? { ...item, description } : item) })} />
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => updatePhotos({ ...photos, enabled: true, links: [...photos.links, { id: crypto.randomUUID(), title: "", url: "", description: "" }] })}><Plus />Add photo link</Button>
          </div>
        </details>
      </div>
    </section>
  );
}
