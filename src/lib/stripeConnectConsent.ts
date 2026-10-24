export const stripeConnectionAcknowledgments = [
  "I understand my bank and card details are entered on Stripe's secure pages, not on TeeVents.",
  "I understand TeeVents never sees or stores my full bank account or card numbers.",
  "I understand TeeVents cannot withdraw money from my account or move my funds.",
  "I understand registration payments go directly into my Stripe account, and Stripe deposits them to my bank.",
  "I understand TeeVents never holds my event's money.",
] as const;

export function hasStripeConnectionConsent(acknowledgments: readonly boolean[]) {
  return acknowledgments.length === 5 && acknowledgments.every(value => value === true);
}