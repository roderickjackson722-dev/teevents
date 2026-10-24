// Check remains readable on historical registrations, but is not an entry option.
export const manualRegistrationPaymentMethods = ["online", "cash"] as const;

export function canMarkCashReceived(method: string | null | undefined) {
  return method === "cash";
}