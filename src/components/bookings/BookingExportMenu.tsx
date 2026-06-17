import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, Calendar as CalIcon } from "lucide-react";
import { fetchAllReservations } from "@/hooks/useBookings";
import { openPrintWindow } from "@/components/printables/printUtils";

interface Props { context: string }

function download(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(v: any) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function icsEscape(v: string) {
  return String(v || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function toIcsDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
}

export function BookingExportMenu({ context }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  const get = async () => fetchAllReservations(context);

  const exportCsv = async () => {
    setLoading("csv");
    const rows = await get();
    const header = ["Date", "Start", "End", "Title", "Coach", "Team", "Email", "Phone", "Status", "Reference"];
    const body = rows.map((r: any) => [
      new Date(r.slot.start_time).toLocaleDateString(),
      new Date(r.slot.start_time).toLocaleTimeString(),
      new Date(r.slot.end_time).toLocaleTimeString(),
      r.slot.title, r.coach_name, r.team_name || "", r.coach_email, r.coach_phone || "", r.status, r.booking_reference || "",
    ].map(csvEscape).join(","));
    download(`bookings-${Date.now()}.csv`, [header.join(","), ...body].join("\n"), "text/csv");
    setLoading(null);
  };

  const exportPdf = async () => {
    setLoading("pdf");
    const rows = await get();
    const html = `
      <h1 style="font-family:Arial,sans-serif;">Booking Schedule</h1>
      <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;">
        <thead><tr style="background:#1a5c38;color:white;">
          ${["Date/Time", "Session", "Coach", "Team", "Email", "Status", "Ref"].map((h) => `<th style="padding:8px;text-align:left;">${h}</th>`).join("")}
        </tr></thead>
        <tbody>
        ${rows.map((r: any) => `<tr style="border-bottom:1px solid #ddd;">
          <td style="padding:8px;">${new Date(r.slot.start_time).toLocaleString()}</td>
          <td style="padding:8px;">${r.slot.title}</td>
          <td style="padding:8px;">${r.coach_name}</td>
          <td style="padding:8px;">${r.team_name || ""}</td>
          <td style="padding:8px;">${r.coach_email}</td>
          <td style="padding:8px;">${r.status}</td>
          <td style="padding:8px;font-family:monospace;">${r.booking_reference || ""}</td>
        </tr>`).join("")}
        </tbody>
      </table>`;
    openPrintWindow("Booking Schedule", html);
    setLoading(null);
  };

  const exportIcs = async () => {
    setLoading("ics");
    const rows = await get();
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TeeVents//Bookings//EN"];
    for (const r of rows as any[]) {
      lines.push(
        "BEGIN:VEVENT",
        `UID:${r.id}@teevents.golf`,
        `DTSTAMP:${toIcsDate(r.created_at)}`,
        `DTSTART:${toIcsDate(r.slot.start_time)}`,
        `DTEND:${toIcsDate(r.slot.end_time)}`,
        `SUMMARY:${icsEscape(r.slot.title + " — " + r.coach_name)}`,
        `LOCATION:${icsEscape(r.slot.location || "")}`,
        `DESCRIPTION:${icsEscape(`Coach: ${r.coach_name} (${r.coach_email})${r.team_name ? " Team: " + r.team_name : ""} Ref: ${r.booking_reference}`)}`,
        "END:VEVENT",
      );
    }
    lines.push("END:VCALENDAR");
    download(`bookings-${Date.now()}.ics`, lines.join("\r\n"), "text/calendar");
    setLoading(null);
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <Button variant="outline" onClick={exportCsv} disabled={loading !== null}><Download className="w-4 h-4 mr-2" />CSV</Button>
      <Button variant="outline" onClick={exportPdf} disabled={loading !== null}><FileText className="w-4 h-4 mr-2" />PDF</Button>
      <Button variant="outline" onClick={exportIcs} disabled={loading !== null}><CalIcon className="w-4 h-4 mr-2" />Calendar (ICS)</Button>
    </div>
  );
}
