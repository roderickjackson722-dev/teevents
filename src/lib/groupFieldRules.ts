// Shared config for group (foursome/threesome/twosome) registrations:
// which fields the team captain must fill in vs. the other players.

export type FieldMode = "required" | "optional" | "hidden";

export const GROUP_FIELD_KEYS = [
  "full_name",
  "email",
  "phone",
  "handicap",
  "shirt_size",
  "dietary_restrictions",
  "company",
  "custom_questions",
] as const;

export type GroupFieldKey = (typeof GROUP_FIELD_KEYS)[number];

export const GROUP_FIELD_LABELS: Record<GroupFieldKey, string> = {
  full_name: "Full Name",
  email: "Email",
  phone: "Phone",
  handicap: "Handicap",
  shirt_size: "Shirt Size",
  dietary_restrictions: "Dietary Needs",
  company: "Company / Organization",
  custom_questions: "Custom Questions",
};

export interface GroupFieldRules {
  enabled: boolean;
  captain: Record<GroupFieldKey, FieldMode>;
  member: Record<GroupFieldKey, FieldMode>;
}

export const DEFAULT_GROUP_FIELD_RULES: GroupFieldRules = {
  enabled: false,
  captain: {
    full_name: "required",
    email: "required",
    phone: "required",
    handicap: "optional",
    shirt_size: "optional",
    dietary_restrictions: "optional",
    company: "optional",
    custom_questions: "optional",
  },
  member: {
    full_name: "required",
    email: "hidden",
    phone: "hidden",
    handicap: "optional",
    shirt_size: "hidden",
    dietary_restrictions: "hidden",
    company: "hidden",
    custom_questions: "hidden",
  },
};

const isMode = (v: unknown): v is FieldMode =>
  v === "required" || v === "optional" || v === "hidden";

/** Safely parse the JSON stored on tournaments.group_field_rules. */
export function parseGroupFieldRules(raw: unknown): GroupFieldRules {
  const base: GroupFieldRules = {
    enabled: DEFAULT_GROUP_FIELD_RULES.enabled,
    captain: { ...DEFAULT_GROUP_FIELD_RULES.captain },
    member: { ...DEFAULT_GROUP_FIELD_RULES.member },
  };
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, any>;
  base.enabled = !!obj.enabled;
  (["captain", "member"] as const).forEach((role) => {
    const src = obj[role];
    if (!src || typeof src !== "object") return;
    GROUP_FIELD_KEYS.forEach((key) => {
      if (isMode(src[key])) base[role][key] = src[key];
    });
  });
  // Names are always collected for every player.
  base.captain.full_name = "required";
  base.member.full_name = "required";
  return base;
}
