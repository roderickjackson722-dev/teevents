import { useState } from "react";
import SampleWizard from "./SampleWizard";
import ClientSampleTracking from "@/pages/admin/DemoConverter";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (result: { tournament_id: string; organization_id: string }) => void;
}

const SCORING_FORMATS = [
  "Scramble", "Best Ball", "Stroke Play", "Stableford", "Modified Stableford",
  "Match Play", "Skins", "Shamble",
];

export default function AdminCreateTournamentDialog({ open, onOpenChange, onCreated }: Props) {
  const [sampleReload, setSampleReload] = useState(0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Tournament for Client</DialogTitle>
          <DialogDescription>Sample • No payments or public registration</DialogDescription>
        </DialogHeader>
        <SampleWizard onCreated={() => setSampleReload(n => n + 1)} onCancel={() => onOpenChange(false)} />
        <ClientSampleTracking embedded reloadKey={sampleReload} />
      </DialogContent>
    </Dialog>
  );
}
