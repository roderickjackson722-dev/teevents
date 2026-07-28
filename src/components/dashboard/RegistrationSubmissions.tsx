import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface RegField {
  id: string;
  label: string;
  field_type: string;
  is_default: boolean;
  is_enabled: boolean;
  sort_order: number;
}

interface CustomAnswer {
  field_id: string;
  label: string;
  field_type: string;
  answer: unknown;
}

interface SubmissionRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  handicap: number | null;
  shirt_size: string | null;
  dietary_restrictions: string | null;
  notes: string | null;
  payment_status: string;
  created_at: string;
  custom_answers: CustomAnswer[] | null;
}

interface Props {
  tournamentId: string;
  fields: RegField[];
}

const DEFAULT_KEY_MAP: Record<string, keyof SubmissionRow> = {
  "phone": "phone",
  "handicap": "handicap",
  "shirt size": "shirt_size",
  "dietary restrictions": "dietary_restrictions",
};

const formatAnswer = (val: unknown): string => {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (Array.isArray(val)) return val.join(", ");
  return String(val);
};

const RegistrationSubmissions = ({ tournamentId, fields }: Props) => {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("tournament_registrations")
      .select("id, first_name, last_name, email, phone, handicap, shirt_size, dietary_restrictions, notes, payment_status, created_at, custom_answers")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setRows((data as unknown as SubmissionRow[]) || []);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tournamentId]);

  // Build the ordered list of question columns: enabled default fields + enabled custom fields
  const questionCols = useMemo(() => {
    return fields
      .filter((f) => f.is_enabled)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [fields]);

  const getCellValue = (row: SubmissionRow, field: RegField): unknown => {
    if (field.is_default) {
      const key = DEFAULT_KEY_MAP[field.label.toLowerCase()];
      if (key) return (row as any)[key];
      return "";
    }
    const match = (row.custom_answers || []).find((a) => a.field_id === field.id);
    return match?.answer ?? "";
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;
    if (q) {
      list = list.filter((r) => {
        const hay = [
          r.first_name, r.last_name, r.email, r.phone || "",
          ...(r.custom_answers || []).map((a) => formatAnswer(a.answer)),
        ].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    const dir = sortDir === "asc" ? 1 : -1;
    const cmp = (a: SubmissionRow, b: SubmissionRow) => {
      let av: any, bv: any;
      if (sortKey === "name") { av = `${a.first_name} ${a.last_name}`; bv = `${b.first_name} ${b.last_name}`; }
      else if (sortKey === "created_at") { av = a.created_at; bv = b.created_at; }
      else if (sortKey === "email") { av = a.email; bv = b.email; }
      else if (sortKey === "payment_status") { av = a.payment_status; bv = b.payment_status; }
      else {
        const field = questionCols.find((f) => f.id === sortKey);
        if (!field) return 0;
        av = getCellValue(a, field);
        bv = getCellValue(b, field);
      }
      av = av ?? ""; bv = bv ?? "";
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
    };
    return [...list].sort(cmp);
  }, [rows, search, sortKey, sortDir, questionCols]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ k }: { k: string }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 inline ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 inline ml-1" />
      : <ArrowDown className="h-3 w-3 inline ml-1" />;
  };

  const exportCsv = () => {
    const headers = ["Submitted", "Name", "Email", "Payment", ...questionCols.map((f) => f.label)];
    const escape = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
    const lines = [headers.map(escape).join(",")];
    filtered.forEach((r) => {
      const row = [
        new Date(r.created_at).toISOString(),
        `${r.first_name} ${r.last_name}`,
        r.email,
        r.payment_status,
        ...questionCols.map((f) => formatAnswer(getCellValue(r, f))),
      ];
      lines.push(row.map((v) => escape(String(v))).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `submissions-${tournamentId}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-secondary/30 bg-secondary/10 p-4 text-sm text-foreground">
        <p className="font-semibold mb-1">All registration submissions</p>
        <p className="text-muted-foreground">
          Every answer submitted through your registration form is captured here — including custom questions
          you've added like age, city, or company. Historical registrations created before this feature was
          released will show blank answers for custom questions (they weren't stored at the time). All new
          submissions capture the full response.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, or any answer…"
            className="pl-9 w-full sm:w-[320px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {rows.filter((r) => (r.payment_status || "").toLowerCase() === "paid").length} paid
            </span>
            {" · "}
            {rows.filter((r) => (r.payment_status || "").toLowerCase() !== "paid").length} pending
            {" · "}{filtered.length} of {rows.length} shown
          </span>

          <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-lg border border-border">
          <p className="text-muted-foreground">No registration submissions yet.</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left font-semibold px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort("created_at")}>
                    Submitted<SortIcon k="created_at" />
                  </th>
                  <th className="text-left font-semibold px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    Name<SortIcon k="name" />
                  </th>
                  <th className="text-left font-semibold px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort("email")}>
                    Email<SortIcon k="email" />
                  </th>
                  <th className="text-left font-semibold px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort("payment_status")}>
                    Payment<SortIcon k="payment_status" />
                  </th>
                  {questionCols.map((f) => (
                    <th
                      key={f.id}
                      className="text-left font-semibold px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                      onClick={() => toggleSort(f.id)}
                      title={f.label}
                    >
                      {f.label}<SortIcon k={f.id} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20 align-top">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString(undefined, {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                      {r.first_name} {r.last_name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full capitalize bg-muted text-foreground">
                        {r.payment_status}
                      </span>
                    </td>
                    {questionCols.map((f) => (
                      <td key={f.id} className="px-4 py-3 text-muted-foreground max-w-[240px] break-words">
                        {formatAnswer(getCellValue(r, f))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationSubmissions;
