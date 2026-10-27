import { z } from "zod";

export const enterpriseApprovalSchema = z.object({
  organizationId: z.string().uuid(),
  ownerUserId: z.string().uuid(),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
});

export function assertEnterpriseApprovalOwner(
  expectedEmail: string,
  user: { email?: string; email_confirmed_at?: string | null } | null,
) {
  if (!user?.email_confirmed_at || user.email?.trim().toLowerCase() !== expectedEmail) {
    throw new Error("The selected owner must have this verified account email.");
  }
}