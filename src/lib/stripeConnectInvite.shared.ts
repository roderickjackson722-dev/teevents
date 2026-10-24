export function stripeConnectInviteContent(tournamentName: string, firstName: string, loginLink: string) {
  return {
    subject: `Connect your Stripe account for ${tournamentName}`,
    text: `Hi ${firstName}, your event page for ${tournamentName} is built and ready. One step is yours to finish: connecting your Stripe account, so registration money goes straight to you. Log in to your portal and connect Stripe here: ${loginLink}. It takes about 5 to 10 minutes. Your bank and card details are entered on Stripe's secure pages, not on TeeVents, and TeeVents never sees or stores your full account numbers. If you get stuck, reply to this email or call me at (602) 413-1338. Rod, TeeVents`,
  };
}

export function resolveInviteOwner(owners: readonly { user_id: string; name: string | null }[]) {
  if (owners.length !== 1) throw new Error("This tournament must have exactly one organizer owner on file before an invite can be sent.");
  return owners[0];
}