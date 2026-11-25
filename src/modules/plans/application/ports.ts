import type { PlanInput } from "../domain/plan";
import type {
  ChargeResult,
  CreditSource,
  PlanPurchaseStatus,
  StoredPaymentStatus,
} from "../domain/purchase";

declare const transactionBrand: unique symbol;
/** Handle of a running database transaction; only infrastructure looks inside it. */
export type TransactionContext = { readonly [transactionBrand]: true };

export interface TransactionRunner {
  run<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

export interface StoredPlan extends PlanInput {
  id: string;
  clubId: string;
  isActive: boolean;
}

export interface PlanRepository {
  create(clubId: string, plan: PlanInput): Promise<{ id: string }>;
  find(planId: string): Promise<StoredPlan | null>;
  setActive(planId: string, isActive: boolean): Promise<void>;
}

/** The club's communities (owned by `clubs`). */
export interface ClubCommunities {
  idsOf(clubSlug: string): Promise<string[]>;
}

// ─── Purchases and credits (HU-27) ───

export interface Buyer {
  firstName: string;
  lastName: string;
  /** Normalized +519XXXXXXXX. */
  phone: string;
  userId: string | null;
}

/** The player whose credits are looked up: same phone, or same Google account. */
export interface PlayerKey {
  clubId: string;
  phone: string;
  userId: string | null;
}

export interface LockedPurchase {
  id: string;
  clubId: string;
  status: PlanPurchaseStatus;
  priceCents: number;
  creditCount: number | null;
  validityDays: number | null;
}

export interface PurchaseRepository {
  create(purchase: { clubId: string; planId: string; buyer: Buyer }): Promise<{ id: string }>;
  /** Reads the purchase with its plan's terms and locks its row until the transaction ends. */
  lock(purchaseId: string, tx: TransactionContext): Promise<LockedPurchase | null>;
  setStatus(purchaseId: string, status: PlanPurchaseStatus, tx: TransactionContext): Promise<void>;
  activate(
    purchaseId: string,
    terms: { paidAt: Date; creditsRemaining: number | null; expiresAt: Date | null },
    tx: TransactionContext,
  ): Promise<void>;
  /** The player's purchases in the club; with `tx`, their rows stay locked. */
  listForPlayer(player: PlayerKey, tx?: TransactionContext): Promise<CreditSource[]>;
  /** Spends one credit (none to count when unlimited) and records which registration used it. */
  useCredit(purchaseId: string, registrationId: string, tx: TransactionContext): Promise<void>;
  /** Gives back the credits these registrations used, if any. */
  returnCredits(registrationIds: string[], tx: TransactionContext): Promise<void>;
}

export interface ChargeReport {
  providerPaymentId: string;
  result: ChargeResult;
  statusDetail: string | null;
  amountCents: number;
  currency: string;
  externalReference: string | null;
}

/** Mercado Pago on the organizer's account (owned by `payments`). */
export interface MercadoPagoGateway {
  isEnabled(clubId: string): Promise<boolean>;
  charge(
    clubId: string,
    charge: {
      amountCents: number;
      token: string;
      paymentMethodId: string;
      installments: number;
      issuerId: string | null;
      payerEmail: string;
      description: string;
      externalReference: string;
      idempotencyKey: string;
    },
  ): Promise<ChargeReport>;
  find(clubId: string, providerPaymentId: string): Promise<ChargeReport>;
  refund(clubId: string, providerPaymentId: string, idempotencyKey: string): Promise<void>;
  clubIdForAccount(mpUserId: string): Promise<string | null>;
}

export interface ServiceFees {
  forCharge(clubId: string, priceCents: number): Promise<number>;
}

export interface StoredPayment {
  id: string;
  clubId: string;
  planPurchaseId: string | null;
  amountCents: number;
  status: StoredPaymentStatus;
}

/** Payment rows of plan purchases (owned by `payments`). */
export interface PurchasePayments {
  recordMercadoPago(
    payment: {
      clubId: string;
      planPurchaseId: string;
      amountCents: number;
      serviceFeeCents: number;
    },
    tx: TransactionContext,
  ): Promise<{ id: string }>;
  attachProviderId(paymentId: string, providerPaymentId: string): Promise<void>;
  find(
    where: { id: string } | { providerPaymentId: string },
    tx?: TransactionContext,
  ): Promise<StoredPayment | null>;
  setStatus(
    input: {
      paymentId: string;
      status: Exclude<StoredPaymentStatus, "in_review">;
      statusDetail: string | null;
      providerPaymentId?: string;
    },
    tx?: TransactionContext,
  ): Promise<void>;
  storeVoucherImage(image: { bytes: Uint8Array; contentType: string }): Promise<string>;
  recordVoucher(
    payment: {
      clubId: string;
      planPurchaseId: string;
      amountCents: number;
      proofFileKey: string;
      yapeSecurityCode: string | null;
    },
    tx: TransactionContext,
  ): Promise<void>;
  findVoucherInReview(purchaseId: string, tx: TransactionContext): Promise<{ id: string } | null>;
  approveVoucher(
    input: { paymentId: string; reviewedByUserId: string; at: Date },
    tx: TransactionContext,
  ): Promise<void>;
  rejectVoucher(
    input: { paymentId: string; reason: string; reviewedByUserId: string; at: Date },
    tx: TransactionContext,
  ): Promise<void>;
}

// ─── Balance in favor (HU-30) ───

export interface BalanceKey {
  clubId: string;
  /** Normalized +519XXXXXXXX. */
  phone: string;
}

export interface BalanceRepository {
  /** 0 when the player never had balance in the club. */
  find(key: BalanceKey): Promise<number>;
  add(key: BalanceKey, amountCents: number, tx: TransactionContext): Promise<void>;
  /** Takes the amount only if it is covered (one conditional UPDATE); false otherwise. */
  spend(
    key: BalanceKey,
    use: { amountCents: number; registrationId: string },
    tx: TransactionContext,
  ): Promise<boolean>;
  /** Deletes these registrations' uses and puts their amounts back. */
  returnUses(registrationIds: string[], tx: TransactionContext): Promise<void>;
  /** How the registration was paid without money: plan credit, balance or neither. */
  paidWithoutMoney(
    registrationId: string,
    tx: TransactionContext,
  ): Promise<"plan_credit" | "balance" | null>;
}
