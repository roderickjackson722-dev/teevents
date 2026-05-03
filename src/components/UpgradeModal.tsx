import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  currentPlan?: string;
}

export function UpgradeModal({ isOpen, onClose, title, description, currentPlan = "Base" }: UpgradeModalProps) {
  const handleUpgrade = (plan: "Starter" | "Premium") => {
    window.location.href = `/plans`;
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
            <br /><br />
            All plans include our transparent 5% platform fee passed to participants by default, so you keep 100% of the advertised price.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <Button
            onClick={() => handleUpgrade("Starter")}
            className="w-full"
            size="lg"
          >
            Upgrade to Starter — $299 per tournament
          </Button>
          <Button
            onClick={() => handleUpgrade("Premium")}
            variant="default"
            className="w-full bg-foreground text-background hover:bg-foreground/90"
            size="lg"
          >
            Upgrade to Premium — $999 per tournament (includes white-glove)
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="w-full">
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
