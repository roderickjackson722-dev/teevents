import { useState } from "react";
import SampleWizard from "./SampleWizard";
import ClientSampleTracking from "@/pages/admin/DemoConverter";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (result: { tournament_id: string; organization_id: string }) => void;
}

export default function AdminCreateTournamentDialog({ open, onOpenChange }: Props) {
  const [sampleReload, setSampleReload] = useState(0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="client-sample-flow w-[calc(100%-2rem)] max-w-6xl max-h-[90vh] overflow-y-auto">
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
