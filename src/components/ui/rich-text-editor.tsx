import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { useEffect, useRef } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, Heading3,
  List, ListOrdered, Link as LinkIcon, AlignLeft, AlignCenter, AlignRight, Undo, Redo,
  Highlighter, Image as ImageIcon, Eraser,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";

const FONTS = [
  { label: "Default", value: "" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Helvetica", value: "Helvetica, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Lato", value: "Lato, sans-serif" },
  { label: "Montserrat", value: "Montserrat, sans-serif" },
  { label: "Roboto", value: "Roboto, sans-serif" },
  { label: "Open Sans", value: "'Open Sans', sans-serif" },
];

const SIZES = ["12", "14", "16", "18", "20", "24", "32"];

/** Image widths offered when an image is selected (email-safe pixel widths + full width). */
const IMAGE_WIDTHS = [
  { label: "Small (120px)", value: "120" },
  { label: "Medium (240px)", value: "240" },
  { label: "Large (400px)", value: "400" },
  { label: "XL (600px)", value: "600" },
  { label: "Full width (100%)", value: "100%" },
];

/** Image alignments offered when an image is selected. */
const IMAGE_ALIGNMENTS = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
];

/**
 * Image node with a persisted width so organizers can resize inserted images.
 * Width is written as both the `width` attribute and an inline style so email
 * clients (which ignore CSS classes) honour the size.
 */
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => el.getAttribute("width") || (el as HTMLElement).style.width || null,
        renderHTML: (attrs) => {
          if (!attrs.width) return {};
          const w = String(attrs.width).replace("px", "");
          if (w.endsWith("%")) {
            return { width: w, style: `width:${w};max-width:100%;height:auto;` };
          }
          return { width: w, style: `width:${w}px;max-width:100%;height:auto;` };
        },
      },
      align: {
        default: null,
        parseHTML: (el) => el.getAttribute("align") || null,
        renderHTML: (attrs) => {
          if (!attrs.align) return {};
          const margin =
            attrs.align === "center"
              ? "margin:0 auto;"
              : attrs.align === "left"
              ? "margin-right:auto;"
              : "margin-left:auto;";
          return { align: attrs.align, style: `display:block;${margin}` };
        },
      },
    };
  },
});

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  /** Async uploader; should return a public URL to insert as <img>. */
  onImageUpload?: (file: File) => Promise<string>;
}

export function RichTextEditor({ value, onChange, placeholder, className, onImageUpload }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      FontFamily.configure({ types: ["textStyle"] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      ResizableImage.configure({ HTMLAttributes: { class: "max-w-full rounded-md my-2" } }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[180px] px-3 py-2 focus:outline-none",
      },
      // Clicking an image selects the image node so the size/alignment controls appear.
      handleClickOn: (view, pos, node, nodePos, event) => {
        const target = event.target as HTMLElement | null;
        if (node.type.name === "image" || target?.tagName === "IMG") {
          const imagePos = node.type.name === "image" ? nodePos : pos;
          try {
            const tr = view.state.tr.setSelection(NodeSelection.create(view.state.doc, imagePos));
            view.dispatch(tr);
            view.focus();
            return true;
          } catch {
            return false;
          }
        }
        return false;
      },
    },

    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={cn("border border-input rounded-md bg-background", className)}>
      <Toolbar editor={editor} onImageUpload={onImageUpload} />
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
}

function Toolbar({ editor, onImageUpload }: { editor: Editor; onImageUpload?: (file: File) => Promise<string> }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setFont = (v: string) => {
    if (!v) editor.chain().focus().unsetFontFamily().run();
    else editor.chain().focus().setFontFamily(v).run();
  };
  const setSize = (v: string) => {
    editor.chain().focus().setMark("textStyle", { fontSize: `${v}px` } as any).run();
  };
  const setColor = (v: string) => editor.chain().focus().setColor(v).run();
  const insertLink = () => {
    const url = prompt("Enter URL");
    if (!url) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };
  const clearFormatting = () => {
    editor.chain().focus().unsetAllMarks().clearNodes().run();
  };
  const handleImage = async (file: File) => {
    if (!onImageUpload) {
      const reader = new FileReader();
      reader.onload = () => editor.chain().focus().setImage({ src: reader.result as string, width: "400" } as any).run();
      reader.readAsDataURL(file);
      return;
    }
    try {
      const url = await onImageUpload(file);
      editor.chain().focus().setImage({ src: url, width: "400" } as any).run();
    } catch (e) {
      console.error("image upload failed", e);
    }
  };

  const Btn = ({ onClick, active, children, title }: any) => (
    <Button
      type="button" size="sm" variant={active ? "secondary" : "ghost"}
      className="h-8 w-8 p-0" onClick={onClick} title={title}
    >{children}</Button>
  );

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-input p-1.5 bg-muted/30">
      <Btn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Btn>
      <Btn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Btn>
      <Btn title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></Btn>
      <div className="w-px h-6 bg-border mx-1" />
      <Btn title="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4" /></Btn>
      <Btn title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Btn>
      <Btn title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></Btn>
      <div className="w-px h-6 bg-border mx-1" />
      <Select onValueChange={setFont}>
        <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Font" /></SelectTrigger>
        <SelectContent>
          {FONTS.map((f) => (
            <SelectItem key={f.label} value={f.value || "default"}>
              <span style={{ fontFamily: f.value || undefined }}>{f.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select onValueChange={setSize}>
        <SelectTrigger className="h-8 w-[80px] text-xs"><SelectValue placeholder="Size" /></SelectTrigger>
        <SelectContent>
          {SIZES.map((s) => <SelectItem key={s} value={s}>{s}px</SelectItem>)}
        </SelectContent>
      </Select>
      <label className="relative inline-flex items-center" title="Text color">
        <span className="h-8 w-8 rounded border border-input flex items-center justify-center bg-background cursor-pointer text-xs font-bold">A</span>
        <input
          type="color"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={(e) => setColor(e.target.value)}
        />
      </label>
      <Btn
        title="Highlight"
        active={editor.isActive("highlight")}
        onClick={() => editor.chain().focus().toggleHighlight({ color: "#FFF59D" }).run()}
      ><Highlighter className="h-4 w-4" /></Btn>
      <label className="relative inline-flex items-center" title="Highlight color">
        <span
          className="h-8 w-8 rounded border border-input flex items-center justify-center cursor-pointer text-xs"
          style={{ background: "linear-gradient(135deg, #FFF59D 50%, #fff 50%)" }}
        >H</span>
        <input
          type="color"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
        />
      </label>
      <div className="w-px h-6 bg-border mx-1" />
      <Btn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Btn>
      <Btn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></Btn>
      <div className="w-px h-6 bg-border mx-1" />
      <Btn title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft className="h-4 w-4" /></Btn>
      <Btn title="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter className="h-4 w-4" /></Btn>
      <Btn title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight className="h-4 w-4" /></Btn>
      <div className="w-px h-6 bg-border mx-1" />
      <Btn title="Insert link" active={editor.isActive("link")} onClick={insertLink}><LinkIcon className="h-4 w-4" /></Btn>
      <Btn title="Insert image" onClick={() => fileInputRef.current?.click()}><ImageIcon className="h-4 w-4" /></Btn>
      {editor.isActive("image") && (
        <>
          <Select
            value={String(editor.getAttributes("image").width || "")}
            onValueChange={(v) => editor.chain().focus().updateAttributes("image", { width: v }).run()}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs" title="Image size"><SelectValue placeholder="Image size" /></SelectTrigger>
            <SelectContent>
              {IMAGE_WIDTHS.map((w) => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="w-px h-6 bg-border mx-1" />
          <Select
            value={String(editor.getAttributes("image").align || "")}
            onValueChange={(v) => editor.chain().focus().updateAttributes("image", { align: v || null }).run()}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs" title="Image alignment"><SelectValue placeholder="Image align" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Inline (default)</SelectItem>
              {IMAGE_ALIGNMENTS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImage(file);
          e.target.value = "";
        }}
      />
      <Btn title="Clear formatting" onClick={clearFormatting}><Eraser className="h-4 w-4" /></Btn>
      <div className="ml-auto flex gap-1">
        <Btn title="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo className="h-4 w-4" /></Btn>
        <Btn title="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo className="h-4 w-4" /></Btn>
      </div>
    </div>
  );
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "u", "strong", "em", "mark", "h1", "h2", "h3", "h4", "p", "br", "ul", "ol", "li", "a", "span", "div", "blockquote", "code", "pre", "img"],
    ALLOWED_ATTR: ["href", "target", "rel", "style", "class", "data-color", "src", "alt", "title", "width", "height", "align"],
  });
}
