/** Display-only retirement: never use this to price checkout or resolve entitlements. */
export function showAddonSaleOption(key: string, alreadyOwned: boolean): boolean {
  return key !== "custom_event_page" || alreadyOwned;
}