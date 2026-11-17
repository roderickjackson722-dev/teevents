export type SponsorDisplayMode = "single" | "multiple" | "none";

export function parseSponsorDisplayMode(value: unknown): SponsorDisplayMode | null {
  return value === "single" || value === "multiple" || value === "none" ? value : null;
}

/** Existing events keep their current sponsor layout until an organizer saves an explicit choice. */
export function fallbackSponsorDisplayMode(showSingle: boolean, multipleEnabled: boolean): SponsorDisplayMode {
  if (showSingle) return "single";
  return multipleEnabled ? "multiple" : "none";
}

export function sponsorPartsForMode(mode: SponsorDisplayMode) {
  return {
    headline: mode === "single",
    rotating: mode === "multiple",
    otherPlacements: mode === "multiple",
  } as const;
}
