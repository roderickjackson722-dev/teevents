export interface CollegeRosterField {
  id: string;
  label: string;
  type: "text" | "number" | "textarea" | "select";
  required: boolean;
  editable: boolean;
  visible: boolean;
  options?: string[];
}

export const DEFAULT_COLLEGE_ROSTER_FIELDS: CollegeRosterField[] = [
  { id: "first_name", label: "First Name", type: "text", required: true, editable: false, visible: true },
  { id: "last_name", label: "Last Name", type: "text", required: true, editable: false, visible: true },
  { id: "year", label: "Year", type: "select", required: false, editable: true, visible: true, options: ["Freshman", "Sophomore", "Junior", "Senior", "Graduate"] },
  { id: "position", label: "Position", type: "select", required: false, editable: true, visible: true, options: ["1", "2", "3", "4", "5", "Alternate"] },
  { id: "shirt_size", label: "Shirt Size", type: "select", required: false, editable: true, visible: true, options: ["XS", "S", "M", "L", "XL", "2XL", "3XL"] },
];

export const CORE_COLLEGE_ROSTER_IDS = new Set(["first_name", "last_name"]);
export const STANDARD_COLLEGE_ROSTER_IDS = new Set(["first_name", "last_name", "year", "position", "shirt_size"]);

export function parseCollegeRosterFields(raw: unknown): CollegeRosterField[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_COLLEGE_ROSTER_FIELDS.map((field) => ({ ...field, options: field.options ? [...field.options] : undefined }));
  const parsed = raw.filter((field): field is CollegeRosterField => {
    if (!field || typeof field !== "object") return false;
    const item = field as Record<string, unknown>;
    return typeof item.id === "string" && typeof item.label === "string" && ["text", "number", "textarea", "select"].includes(String(item.type));
  }).map((field) => ({
    ...field,
    required: CORE_COLLEGE_ROSTER_IDS.has(field.id) ? true : Boolean(field.required),
    editable: !CORE_COLLEGE_ROSTER_IDS.has(field.id),
    visible: CORE_COLLEGE_ROSTER_IDS.has(field.id) ? true : field.visible !== false,
    options: field.type === "select" && Array.isArray(field.options) ? field.options.filter(Boolean) : undefined,
  }));
  const ids = new Set(parsed.map((field) => field.id));
  const missingCore = DEFAULT_COLLEGE_ROSTER_FIELDS.filter((field) => CORE_COLLEGE_ROSTER_IDS.has(field.id) && !ids.has(field.id));
  return [...missingCore, ...parsed];
}

export function getCollegeRosterAnswer(player: Record<string, unknown>, fieldId: string): string {
  if (STANDARD_COLLEGE_ROSTER_IDS.has(fieldId)) return String(player[fieldId] ?? "");
  const answers = player.custom_answers;
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return "";
  return String((answers as Record<string, unknown>)[fieldId] ?? "");
}