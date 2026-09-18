import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EnterpriseEventLite } from "./useEnterpriseEvent";

interface Props {
  events: EnterpriseEventLite[];
  eventId?: string;
  onChange: (id: string) => void;
}

/** Small event switcher shown on every enterprise settings screen. */
export default function EnterpriseEventPicker({ events, eventId, onChange }: Props) {
  if (events.length === 0) return null;
  return (
    <Select value={eventId} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-full sm:w-64">
        <SelectValue placeholder="Choose an event" />
      </SelectTrigger>
      <SelectContent>
        {events.map((e) => (
          <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
