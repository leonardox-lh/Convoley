export type InvalidPlanReason = "name" | "price" | "terms" | "communities";

export class InvalidPlanError extends Error {
  constructor(readonly reason: InvalidPlanReason) {
    super(`Invalid plan: ${reason}`);
    this.name = "InvalidPlanError";
  }
}

export class PlanNotFoundError extends Error {
  constructor(readonly planId: string) {
    super(`Plan ${planId} not found`);
    this.name = "PlanNotFoundError";
  }
}

export class PlanPurchaseNotFoundError extends Error {
  constructor(readonly purchaseId: string) {
    super(`Plan purchase ${purchaseId} not found`);
    this.name = "PlanPurchaseNotFoundError";
  }
}

/** The purchase isn't in the status this action needs (e.g. paying one already active). */
export class PlanPurchaseStatusError extends Error {
  constructor(
    readonly purchaseId: string,
    readonly status: string,
  ) {
    super(`Plan purchase ${purchaseId} is ${status}`);
    this.name = "PlanPurchaseStatusError";
  }
}

export class NoCreditAvailableError extends Error {
  constructor() {
    super("No active plan with credits for this event");
    this.name = "NoCreditAvailableError";
  }
}

export class MercadoPagoUnavailableError extends Error {
  constructor(readonly clubId: string) {
    super(`Club ${clubId} doesn't take Mercado Pago payments`);
    this.name = "MercadoPagoUnavailableError";
  }
}

export class NothingToReviewError extends Error {
  constructor(readonly purchaseId: string) {
    super(`Plan purchase ${purchaseId} has no voucher to review`);
    this.name = "NothingToReviewError";
  }
}

/** HU-30: the player's balance in the club doesn't cover the price. */
export class NoBalanceAvailableError extends Error {
  constructor() {
    super("Not enough balance in favor for this sign-up");
    this.name = "NoBalanceAvailableError";
  }
}
