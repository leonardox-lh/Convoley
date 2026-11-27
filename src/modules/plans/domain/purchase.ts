export type PlanPurchaseStatus = "pending_payment" | "in_review" | "active";

const MS_PER_DAY = 86_400_000;

/** HU-27: once paid, a plan has its credits and, if it has a validity, an end date. */
export function activation(
  plan: { creditCount: number | null; validityDays: number | null },
  paidAt: Date,
) {
  return {
    paidAt,
    creditsRemaining: plan.creditCount,
    expiresAt:
      plan.validityDays === null
        ? null
        : new Date(paidAt.getTime() + plan.validityDays * MS_PER_DAY),
  };
}

export interface CreditSource {
  id: string;
  status: PlanPurchaseStatus;
  /** null = unlimited. */
  creditsRemaining: number | null;
  expiresAt: Date | null;
  communityIds: string[];
}

/**
 * HU-27: the purchase that pays a registration: active, valid for the event's community, still
 * valid on the event's date and with credits left. The one that ends first goes first, so no
 * credit is wasted.
 */
export function pickPurchaseForCredit<T extends CreditSource>(
  purchases: T[],
  event: { communityId: string; startsAt: Date },
): T | null {
  const usable = purchases.filter(
    (purchase) =>
      purchase.status === "active" &&
      purchase.communityIds.includes(event.communityId) &&
      (purchase.expiresAt === null || event.startsAt < purchase.expiresAt) &&
      (purchase.creditsRemaining === null || purchase.creditsRemaining > 0),
  );
  const endsAt = (purchase: T) => purchase.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY;
  return usable.sort((a, b) => endsAt(a) - endsAt(b))[0] ?? null;
}

/**
 * One plan at a time: a purchase in review, or an active one not expired and with dates left,
 * stops the player from buying another in the same club.
 */
export function blocksNewPurchase(
  purchase: Pick<CreditSource, "status" | "creditsRemaining" | "expiresAt">,
  now: Date,
): boolean {
  if (purchase.status === "in_review") return true;
  return (
    purchase.status === "active" &&
    (purchase.expiresAt === null || purchase.expiresAt > now) &&
    (purchase.creditsRemaining === null || purchase.creditsRemaining > 0)
  );
}

/** Credits the player can use for an event; null = unlimited, 0 = none. */
export function availableCredits(
  purchases: CreditSource[],
  event: { communityId: string; startsAt: Date },
) {
  const usable = purchases.filter((purchase) => pickPurchaseForCredit([purchase], event));
  if (usable.some((purchase) => purchase.creditsRemaining === null)) return null;
  return usable.reduce((total, purchase) => total + purchase.creditsRemaining!, 0);
}

export type ChargeResult = "approved" | "rejected" | "pending";
export type StoredPaymentStatus =
  "pending" | "in_review" | "approved" | "rejected" | "refund_pending" | "refunded";
export type PurchaseSettlement =
  "ignore" | "keep_pending" | "mark_rejected" | "activate" | "refund" | "retry_refund";

const FINAL_PAYMENT_STATUSES: StoredPaymentStatus[] = ["approved", "rejected", "refunded"];

/** Mercado Pago's answer for a plan purchase; idempotent, and a second payment goes back. */
export function purchaseSettlement(input: {
  charge: ChargeResult;
  paymentStatus: StoredPaymentStatus;
  purchaseStatus: PlanPurchaseStatus;
}): PurchaseSettlement {
  if (FINAL_PAYMENT_STATUSES.includes(input.paymentStatus)) return "ignore";
  if (input.paymentStatus === "refund_pending") return "retry_refund";
  if (input.charge === "pending") return "keep_pending";
  if (input.charge === "rejected") return "mark_rejected";
  return input.purchaseStatus === "active" ? "refund" : "activate";
}
