import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, Heading3,
  List, ListOrdered, Link as LinkIcon, AlignLeft, AlignCenter, AlignRight, Undo, Redo,
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
];

const SIZES = ["12", "14", "16", "18", "20", "24", "32"];

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      FontFamily.configure({ types: ["textStyle"] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[180px] px-3 py-2 focus:outline-none",
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
      <Toolbar editor={editor} />
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
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
      <input
        type="color" title="Text color"
        className="h-8 w-8 rounded border border-input cursor-pointer bg-background"
        onChange={(e) => setColor(e.target.value)}
      />
      <div className="w-px h-6 bg-border mx-1" />
      <Btn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Btn>
      <Btn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></Btn>
      <div className="w-px h-6 bg-border mx-1" />
      <Btn title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft className="h-4 w-4" /></Btn>
      <Btn title="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter className="h-4 w-4" /></Btn>
      <Btn title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight className="h-4 w-4" /></Btn>
      <div className="w-px h-6 bg-border mx-1" />
      <Btn title="Insert link" active={editor.isActive("link")} onClick={insertLink}><LinkIcon className="h-4 w-4" /></Btn>
      <div className="ml-auto flex gap-1">
        <Btn title="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo className="h-4 w-4" /></Btn>
        <Btn title="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo className="h-4 w-4" /></Btn>
      </div>
    </div>
  );
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "u", "strong", "em", "h1", "h2", "h3", "h4", "p", "br", "ul", "ol", "li", "a", "span", "div", "blockquote", "code", "pre"],
    ALLOWED_ATTR: ["href", "target", "rel", "style", "class"],
  });
}
