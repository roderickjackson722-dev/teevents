import { forwardRef, useRef, type ComponentProps, type ReactNode } from "react";
import { Bold, Italic } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

/** Renders **bold** and _italic_ markers typed in proposal editor boxes. */
export function formatInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g).map((part, i) =>
    /^\*\*[^*]+\*\*$/.test(part) ? <strong key={i} className="font-extrabold">{part.slice(2, -2)}</strong>
    : /^__[^_]+__$/.test(part) ? <em key={i}>{part.slice(2, -2)}</em> : part);
}
export const Fmt = ({ text }: { text: unknown }) => <>{typeof text === "string" ? formatInline(text) : (text as ReactNode)}</>;
export const stripFormatting = (t: string) => t.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/__([^_]+)__/g, "$1");

type Props = ComponentProps<typeof Textarea>;
/** Textarea with a small format bar; wraps the selected words in markers and fires onChange. */
export const RichTextarea = forwardRef<HTMLTextAreaElement, Props>(function RichTextarea(props, _ref) {
  const el = useRef<HTMLTextAreaElement>(null);
  const wrap = (mark: string) => {
    const t = el.current; if (!t) return;
    const v = t.value, a = t.selectionStart, b = t.selectionEnd;
    const sel = v.slice(a, b) || "text";
    const next = v.slice(0, a) + mark + sel + mark + v.slice(b);
    props.onChange?.({ target: { ...t, value: next }, currentTarget: { ...t, value: next } } as never);
    requestAnimationFrame(() => { t.focus(); t.setSelectionRange(a + mark.length, a + mark.length + sel.length); });
  };
  return <div className="space-y-1">
    <div className="web-controls flex gap-1" role="toolbar" aria-label="Formatting">
      <button type="button" title="Bold" aria-label="Bold" onMouseDown={e => e.preventDefault()} onClick={() => wrap("**")} className="rounded border border-input bg-background p-1 hover:bg-muted"><Bold className="h-4 w-4" /></button>
      <button type="button" title="Italic" aria-label="Italic" onMouseDown={e => e.preventDefault()} onClick={() => wrap("__")} className="rounded border border-input bg-background p-1 hover:bg-muted"><Italic className="h-4 w-4" /></button>
    </div>
    <Textarea {...props} ref={el} />
  </div>;
});
