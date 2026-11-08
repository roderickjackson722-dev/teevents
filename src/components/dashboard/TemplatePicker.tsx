import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LayoutTemplate } from "lucide-react";

export interface TemplatePickerOption {
  id: string;
  label: string;
  /** Short hint shown after the label (e.g. a price). */
  detail?: string;
  apply: () => void;
}

interface TemplatePickerProps {
  /** Templates offered in the menu, in display order. */
  options: TemplatePickerOption[];
  /** True when the target field(s) already contain organizer-typed content. */
  hasContent: boolean;
  /** Clears the target field(s). */
  onBlank: () => void;
  className?: string;
}

/**
 * Secondary "Use a template" button for Event Details and Content sections.
 * Opens a small menu of text templates plus a "Start blank" option. Choosing
 * one only fills the field it belongs to — it never saves, sends, or publishes
 * anything. If the organizer already typed something, a "Replace what you
 * typed?" confirmation appears first; nothing is ever auto-filled.
 */
export function TemplatePicker({ options, hasContent, onBlank, className }: TemplatePickerProps) {
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const choose = (action: () => void) => {
    if (hasContent) setPendingAction(() => action);
    else action();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className={className}>
            <LayoutTemplate className="h-3.5 w-3.5 mr-1.5" />
            Use a template
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {options.map((opt) => (
            <DropdownMenuItem key={opt.id} onSelect={() => choose(opt.apply)}>
              <span className="flex-1">{opt.label}</span>
              {opt.detail && <span className="ml-2 text-xs text-muted-foreground">{opt.detail}</span>}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => choose(onBlank)}>Start blank</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!pendingAction} onOpenChange={(open) => { if (!open) setPendingAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace what you typed?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the text already in this section. You can still edit every word afterward.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                pendingAction?.();
                setPendingAction(null);
              }}
            >
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
