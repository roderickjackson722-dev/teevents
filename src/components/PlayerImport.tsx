import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PlayerImportProps {
  tournamentId: string;
  onImported: () => void;
}

interface ParsedPlayer {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  handicap?: number;
  shirt_size?: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; continue; }
    if ((char === "," || char === "\t") && !inQuotes) { result.push(current.trim()); current = ""; continue; }
    current += char;
  }
  result.push(current.trim());
  return result;
}

function parsePlayers(text: string): { players: ParsedPlayer[]; errors: string[] } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { players: [], errors: ["Need at least a header row and one data row."] };

  const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z_]/g, ""));
  const colMap: Record<string, number> = {};
  const aliases: Record<string, string[]> = {
    first_name: ["first_name", "firstname", "first", "fname"],
    last_name: ["last_name", "lastname", "last", "lname"],
    email: ["email", "emailaddress", "email_address"],
    phone: ["phone", "phonenumber", "phone_number", "mobile"],
    handicap: ["handicap", "hcp", "hdcp"],
    shirt_size: ["shirt_size", "shirtsize", "shirt", "size"],
  };

  for (const [field, names] of Object.entries(aliases)) {
    const idx = header.findIndex((h) => names.includes(h));
    if (idx !== -1) colMap[field] = idx;
  }

  if (colMap.first_name === undefined || colMap.last_name === undefined || colMap.email === undefined) {
    return { players: [], errors: ["CSV must have columns: First Name, Last Name, Email"] };
  }

  const players: ParsedPlayer[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const first = cols[colMap.first_name] || "";
    const last = cols[colMap.last_name] || "";
    const email = cols[colMap.email] || "";
    if (!first || !last || !email) { errors.push(`Row ${i + 1}: Missing required field`); continue; }
    if (!email.includes("@")) { errors.push(`Row ${i + 1}: Invalid email "${email}"`); continue; }

    players.push({
      first_name: first,
      last_name: last,
      email: email.toLowerCase(),
      phone: colMap.phone !== undefined ? cols[colMap.phone] || undefined : undefined,
      handicap: colMap.handicap !== undefined ? (parseInt(cols[colMap.handicap]) || undefined) : undefined,
      shirt_size: colMap.shirt_size !== undefined ? cols[colMap.shirt_size] || undefined : undefined,
    });
  }

  return { players, errors };
}

export default function PlayerImport({ tournamentId, onImported }: PlayerImportProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [preview, setPreview] = useState<ParsedPlayer[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleParse = (text: string) => {
    const { players, errors } = parsePlayers(text);
    setPreview(players);
    setParseErrors(errors);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setPasteText(text);
      handleParse(text);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    const rows = preview.map((p) => ({
      tournament_id: tournamentId,
      first_name: p.first_name,
      last_name: p.last_name,
      email: p.email,
      phone: p.phone || null,
      handicap: p.handicap ?? null,
      shirt_size: p.shirt_size || null,
      payment_status: "pending",
    }));

    const { error } = await supabase.from("tournament_registrations").insert(rows);
    setImporting(false);

    if (error) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Players imported!", description: `${rows.length} players added.` });
      setPreview([]);
      setPasteText("");
      setParseErrors([]);
      setOpen(false);
      onImported();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-1.5" />
          Import Players
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Players</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="paste">
          <TabsList className="w-full">
            <TabsTrigger value="paste" className="flex-1">Paste from Spreadsheet</TabsTrigger>
            <TabsTrigger value="csv" className="flex-1">Upload CSV</TabsTrigger>
          </TabsList>
          <TabsContent value="paste" className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground">
              Copy rows from Excel/Google Sheets. First row must be headers: First Name, Last Name, Email (+ optional: Phone, Handicap, Shirt Size).
            </p>
            <Textarea
              rows={8}
              placeholder={"First Name\tLast Name\tEmail\tHandicap\nJohn\tSmith\tjohn@email.com\t12\nJane\tDoe\tjane@email.com\t8"}
              value={pasteText}
              onChange={(e) => { setPasteText(e.target.value); handleParse(e.target.value); }}
              className="font-mono text-xs"
            />
          </TabsContent>
          <TabsContent value="csv" className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground">
              Upload a CSV file with headers: First Name, Last Name, Email (+ optional: Phone, Handicap, Shirt Size).
            </p>
            <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFile} className="hidden" />
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Choose CSV File
            </Button>
          </TabsContent>
        </Tabs>

        {parseErrors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 space-y-1">
            <p className="text-xs font-semibold text-destructive flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> Parse Warnings
            </p>
            {parseErrors.slice(0, 5).map((e, i) => (
              <p key={i} className="text-xs text-destructive/80">{e}</p>
            ))}
            {parseErrors.length > 5 && <p className="text-xs text-destructive/60">...and {parseErrors.length - 5} more</p>}
          </div>
        )}

        {preview.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">{preview.length} players ready to import</p>
            <div className="max-h-48 overflow-y-auto border rounded-md">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Handicap</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((p, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{p.first_name} {p.last_name}</td>
                      <td className="p-2">{p.email}</td>
                      <td className="p-2">{p.handicap ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button onClick={handleImport} disabled={importing} className="w-full">
              {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Import {preview.length} Players
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
