import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";

export interface ImportedPlayer {
  first_name: string;
  last_name: string;
  ghin_number?: string;
  handicap_index?: number | null;
  email?: string;
  team_name?: string;
  starting_hole?: number | null;
  tee_set?: string;
  is_tbd?: boolean;
}

/** Fields organizers can map spreadsheet columns onto. */
const FIELDS: { key: keyof ImportedPlayer; label: string; required?: boolean }[] = [
  { key: "first_name", label: "First Name", required: true },
  { key: "last_name", label: "Last Name", required: true },
  { key: "ghin_number", label: "GHIN Number" },
  { key: "handicap_index", label: "Handicap Index" },
  { key: "email", label: "Email" },
  { key: "team_name", label: "Team Name" },
  { key: "starting_hole", label: "Starting Hole" },
  { key: "tee_set", label: "Tee Set ID" },
];

const NONE = "__none__";

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') { quoted = !quoted; continue; }
    if ((ch === "," || ch === "\t" || ch === ";") && !quoted) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const guess = (header: string[], key: string): string => {
  const aliases: Record<string, string[]> = {
    first_name: ["first name", "firstname", "first", "fname", "given name"],
    last_name: ["last name", "lastname", "last", "lname", "surname"],
    ghin_number: ["ghin", "ghin number", "ghin id", "ghin#"],
    handicap_index: ["handicap", "handicap index", "index", "hcp", "hdcp"],
    email: ["email", "email address", "e-mail"],
    team_name: ["team", "team name", "group"],
    starting_hole: ["starting hole", "start hole", "hole"],
    tee_set: ["tee", "tee set", "tee set id", "tees"],
  };
  const idx = header.findIndex((h) => (aliases[key] || []).includes(h.trim().toLowerCase()));
  return idx === -1 ? NONE : String(idx);
};

interface Props {
  onImport: (players: ImportedPlayer[]) => void;
}

/**
 * CSV / spreadsheet import with column mapping, a five-row preview and
 * blank-line handling (skip them or turn them into TBD players).
 */
export default function SpreadsheetImportPanel({ onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [header, setHeader] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [blankRows, setBlankRows] = useState(0);
  const [map, setMap] = useState<Record<string, string>>({});
  const [blankMode, setBlankMode] = useState<"ignore" | "tbd">("ignore");

  const readFile = async (file: File) => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      toast.error("Save the sheet as CSV first", {
        description: "In Excel or Google Sheets choose File → Download → CSV, then upload that file.",
      });
      return;
    }
    const text = await file.text();
    const lines = text.split(/\r?\n/);
    const dataLines = lines.slice(1);
    const parsed = dataLines.map(splitLine);
    const blanks = parsed.filter((r) => r.every((c) => !c)).length;
    const head = splitLine(lines[0] || "");
    setFileName(file.name);
    setHeader(head);
    setRows(parsed.filter((r) => r.some((c) => c)));
    setBlankRows(blanks);
    const initial: Record<string, string> = {};
    FIELDS.forEach((f) => { initial[f.key] = guess(head, f.key as string); });
    setMap(initial);
  };

  const preview = useMemo(() => rows.slice(0, 5), [rows]);

  const value = (row: string[], key: string): string => {
    const idx = map[key];
    if (!idx || idx === NONE) return "";
    return row[Number(idx)] || "";
  };

  const doImport = () => {
    if (map.first_name === NONE || map.last_name === NONE || !map.first_name || !map.last_name) {
      toast.error("Map First Name and Last Name before importing.");
      return;
    }
    const players: ImportedPlayer[] = rows
      .map((row) => {
        const first = value(row, "first_name");
        const last = value(row, "last_name");
        if (!first && !last) return null;
        const hcp = value(row, "handicap_index");
        const hole = value(row, "starting_hole");
        return {
          first_name: first || "TBD",
          last_name: last,
          ghin_number: value(row, "ghin_number") || undefined,
          handicap_index: hcp ? Number(hcp) : null,
          email: value(row, "email") || undefined,
          team_name: value(row, "team_name") || undefined,
          starting_hole: hole ? Number(hole) : null,
          tee_set: value(row, "tee_set") || undefined,
        } as ImportedPlayer;
      })
      .filter(Boolean) as ImportedPlayer[];

    if (blankMode === "tbd" && blankRows > 0) {
      for (let i = 0; i < blankRows; i++) {
        players.push({ first_name: "TBD", last_name: `Player ${i + 1}`, is_tbd: true });
      }
    }

    if (!players.length) {
      toast.error("No players found in that file.");
      return;
    }
    onImport(players);
    toast.success(`${players.length} players ready to add.`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-4 w-4 text-primary" /> Import from Spreadsheet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv,.tsv,.txt,.xlsx,.xls"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1.5 h-4 w-4" /> Upload CSV file
          </Button>
          {fileName && <span className="text-sm text-muted-foreground">{fileName} · {rows.length} rows</span>}
        </div>

        {header.length > 0 && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key as string}>
                  <Label className="text-xs">
                    {f.label} {f.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Select
                    value={map[f.key as string] || NONE}
                    onValueChange={(v) => setMap((m) => ({ ...m, [f.key as string]: v }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Not mapped" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not mapped</SelectItem>
                      {header.map((h, i) => (
                        <SelectItem key={`${h}-${i}`} value={String(i)}>{h || `Column ${i + 1}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">Preview (first 5 rows)</p>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      {FIELDS.map((f) => (
                        <th key={f.key as string} className="px-2 py-1.5 text-left font-semibold">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        {FIELDS.map((f) => (
                          <td key={f.key as string} className="px-2 py-1.5">{value(row, f.key as string) || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-sm font-semibold text-foreground">
                Blank lines in the file {blankRows > 0 ? `(${blankRows} found)` : ""}
              </p>
              <RadioGroup value={blankMode} onValueChange={(v) => setBlankMode(v as "ignore" | "tbd")} className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="ignore" /> Ignore blank lines
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="tbd" /> Add a TBD player for each blank line
                </label>
              </RadioGroup>
            </div>

            <Button onClick={doImport} className="bg-secondary text-primary hover:bg-secondary/90">
              Import Data
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
