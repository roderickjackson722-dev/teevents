import { Fmt } from "./RichText";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { safeExternalUrl, type PhotoLinksPage, type WebDocument } from "./content";

function EventPhotoLink({ link }: { link: PhotoLinksPage["links"][number] }) {
  const url = safeExternalUrl(link.url);
  const preview = safeExternalUrl(link.previewUrl ?? "") ?? url;
  const [previewFailed, setPreviewFailed] = useState(false);
  useEffect(() => setPreviewFailed(false), [preview]);
  if (!url) return null;
  const title = link.title.trim() || "Event photo link";
  return (
    <article className="photo-link-entry overflow-hidden rounded-lg border border-border bg-background">
      {!previewFailed ? (
        <a href={url ?? undefined} target="_blank" rel="noopener noreferrer"><img
          src={preview ?? undefined}
          alt={title}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="max-h-96 w-full bg-muted object-contain"
          onError={() => setPreviewFailed(true)}
        /></a>
      ) : (
        <p className="border-b border-border bg-muted px-5 py-4 text-sm text-muted-foreground">Image preview unavailable. Use the clickable link below.</p>
      )}
      <div className="space-y-3 p-5">
        <h3 className="font-display text-xl font-semibold">{title}</h3>
        {link.description && <p className="whitespace-pre-wrap leading-7"><Fmt text={link.description}/></p>}
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-start gap-2 break-all text-primary underline">
          <ExternalLink className="mt-1 size-4 shrink-0" aria-hidden="true" />
          <span>{url}</span>
        </a>
      </div>
    </article>
  );
}

/** Optional per-proposal pages. Disabled or absent pages render nothing on historical copies. */
export function ReferencesSection({ document: d }: { document: WebDocument }) {
  const references = d.referencesPage;
  if (!references?.enabled) return null;
  return (
    <section id="references" data-track className="proposal-extra-page border-b border-border py-12">
      <h2 className="font-display text-3xl font-bold text-primary">{references.title || "References"}</h2>
      {references.introduction && <p className="mt-6 whitespace-pre-wrap text-lg leading-8"><Fmt text={references.introduction}/></p>}
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {references.entries.filter(entry => entry.name || entry.organization || entry.description || entry.contact).map(entry => (
          <article key={entry.id} className="reference-entry rounded-lg border border-border bg-background p-5">
            {entry.name && <h3 className="font-display text-xl font-semibold">{entry.name}</h3>}
            {entry.organization && <p className="mt-1 font-semibold text-primary">{entry.organization}</p>}
            {entry.description && <p className="mt-4 whitespace-pre-wrap leading-7"><Fmt text={entry.description}/></p>}
            {entry.contact && <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground"><strong>Contact:</strong> {entry.contact}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

export function PhotosSection({ document: d }: { document: WebDocument }) {
  const photos = d.photoLinksPage;
  if (!photos?.enabled) return null;
  return (
    <section id="event-photos" data-track className="proposal-extra-page border-b border-border py-12">
      <h2 className="font-display text-3xl font-bold text-primary">{photos.title || "Event Photo Links"}</h2>
      {photos.introduction && <p className="mt-6 whitespace-pre-wrap text-lg leading-8"><Fmt text={photos.introduction}/></p>}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {photos.links.map(link => <EventPhotoLink key={link.id} link={link} />)}
      </div>
    </section>
  );
}
