// Allowed registration group sizes, mirroring the public RegistrationForm.
// Used server-side so a checkout request can never bypass the organizer's
// team-size rule (e.g. "teams of 2 only").
export function allowedRegistrationGroupSizes(t: {
  max_group_size?: number | null;
  foursome_registration?: boolean | null;
  allowed_group_sizes?: number[] | null;
}): number[] {
  const max = Math.max(1, Number(t.max_group_size) || (t.foursome_registration ? 4 : 1));
  const all = Array.from({ length: max }, (_, i) => i + 1);
  const list = Array.isArray(t.allowed_group_sizes) ? t.allowed_group_sizes.map(Number) : [];
  const filtered = list.length > 0 ? all.filter((n) => list.includes(n)) : all;
  return filtered.length > 0 ? filtered : all;
}

export function isAllowedRegistrationGroupSize(
  t: Parameters<typeof allowedRegistrationGroupSizes>[0],
  count: number,
): boolean {
  return allowedRegistrationGroupSizes(t).includes(count);
}
