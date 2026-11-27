import {
  MercadoPagoUnavailableError,
  NothingToReviewError,
  PlanAlreadyOpenError,
  PlanNotFoundError,
  PlanPurchaseNotFoundError,
  PlanPurchaseStatusError,
} from "../domain/errors";
import {
  activation,
  blocksNewPurchase,
  purchaseSettlement,
  type PurchaseSettlement,
} from "../domain/purchase";
import type {
  Buyer,
  ChargeReport,
  LockedPurchase,
  MercadoPagoGateway,
  PlanRepository,
  PurchasePayments,
  PurchaseRepository,
  ServiceFees,
  TransactionContext,
  TransactionRunner,
} from "./ports";

const PERUVIAN_SOLES = "PEN";
const SETTLEMENTS_THAT_REFUND: PurchaseSettlement[] = ["refund", "retry_refund"];

/** HU-27: the player picks an active plan of the club; it waits for payment. */
export function makeBuyPlan(deps: {
  plans: PlanRepository;
  purchases: PurchaseRepository;
  now: () => Date;
}) {
  return async function buyPlan(input: { clubId: string; planId: string; buyer: Buyer }) {
    const plan = await deps.plans.find(input.planId);
    if (!plan || plan.clubId !== input.clubId || !plan.isActive) {
      throw new PlanNotFoundError(input.planId);
    }
    const open = await deps.purchases.listOpenForPlayer({
      clubId: input.clubId,
      userId: input.buyer.userId,
    });
    if (open.some((purchase) => blocksNewPurchase(purchase, deps.now())))
      throw new PlanAlreadyOpenError();
    return deps.purchases.create({ clubId: plan.clubId, planId: plan.id, buyer: input.buyer });
  };
}

async function lockPurchase(purchases: PurchaseRepository, id: string, tx: TransactionContext) {
  const purchase = await purchases.lock(id, tx);
  if (!purchase) throw new PlanPurchaseNotFoundError(id);
  return purchase;
}

function assertPendingPayment(purchase: LockedPurchase) {
  if (purchase.status !== "pending_payment") {
    throw new PlanPurchaseStatusError(purchase.id, purchase.status);
  }
}

interface PaymentDeps {
  purchases: PurchaseRepository;
  gateway: MercadoPagoGateway;
  payments: PurchasePayments;
  transactions: TransactionRunner;
  now: () => Date;
}

export type SettlePurchaseResult = PurchaseSettlement | "unknown_payment" | "mismatch";

/** HU-27: Mercado Pago's answer for a plan purchase, from the charge or the webhook. */
export function makeSettlePlanPurchasePayment(deps: PaymentDeps) {
  return async function settlePlanPurchasePayment(input: {
    clubId: string;
    report: ChargeReport;
  }): Promise<SettlePurchaseResult> {
    const { report } = input;
    const payment =
      (await deps.payments.find({ providerPaymentId: report.providerPaymentId })) ??
      (report.externalReference
        ? await deps.payments.find({ id: report.externalReference })
        : null);
    if (!payment?.planPurchaseId) return "unknown_payment";
    const matches =
      payment.clubId === input.clubId &&
      payment.amountCents === report.amountCents &&
      report.currency === PERUVIAN_SOLES;
    if (!matches) return "mismatch";
    const purchaseId = payment.planPurchaseId;

    const decision = await deps.transactions.run(async (tx) => {
      const purchase = await lockPurchase(deps.purchases, purchaseId, tx);
      const current = await deps.payments.find({ id: payment.id }, tx);
      if (!current) return "ignore" as const;
      const settlement = purchaseSettlement({
        charge: report.result,
        paymentStatus: current.status,
        purchaseStatus: purchase.status,
      });
      const setPayment = (status: "pending" | "approved" | "rejected" | "refund_pending") =>
        deps.payments.setStatus(
          {
            paymentId: payment.id,
            status,
            statusDetail: report.statusDetail,
            providerPaymentId: report.providerPaymentId,
          },
          tx,
        );
      switch (settlement) {
        case "keep_pending":
          await setPayment("pending");
          break;
        case "mark_rejected":
          await setPayment("rejected");
          break;
        case "activate":
          await setPayment("approved");
          await deps.purchases.activate(purchase.id, activation(purchase, deps.now()), tx);
          break;
        case "refund":
          await setPayment("refund_pending");
          break;
      }
      return settlement;
    });

    if (SETTLEMENTS_THAT_REFUND.includes(decision)) {
      // Outside the transaction; if it fails, Mercado Pago's retry tries again.
      await deps.gateway.refund(input.clubId, report.providerPaymentId, `refund-${payment.id}`);
      await deps.payments.setStatus({
        paymentId: payment.id,
        status: "refunded",
        statusDetail: report.statusDetail,
      });
    }
    return decision;
  };
}

export function makeSettlePlanPurchaseNotification(
  deps: PaymentDeps,
  settle: ReturnType<typeof makeSettlePlanPurchasePayment>,
) {
  return async function settlePlanPurchaseNotification(input: {
    providerPaymentId: string;
    mpUserId: string | null;
  }): Promise<SettlePurchaseResult> {
    const stored = await deps.payments.find({ providerPaymentId: input.providerPaymentId });
    const clubId =
      stored?.clubId ??
      (input.mpUserId ? await deps.gateway.clubIdForAccount(input.mpUserId) : null);
    if (!clubId) return "unknown_payment";
    return settle({ clubId, report: await deps.gateway.find(clubId, input.providerPaymentId) });
  };
}

export interface StartPlanPaymentInput {
  purchaseId: string;
  token: string;
  paymentMethodId: string;
  installments: number;
  issuerId: string | null;
  payerEmail: string;
}

/** HU-27: pay the plan with Yape or card on the organizer's Mercado Pago account. */
export function makeStartPlanMercadoPagoPayment(
  deps: PaymentDeps & { serviceFees: ServiceFees },
  settle: ReturnType<typeof makeSettlePlanPurchasePayment>,
) {
  return async function startPlanMercadoPagoPayment(input: StartPlanPaymentInput) {
    const pending = await deps.transactions.run(async (tx) => {
      const purchase = await lockPurchase(deps.purchases, input.purchaseId, tx);
      assertPendingPayment(purchase);
      if (!(await deps.gateway.isEnabled(purchase.clubId))) {
        throw new MercadoPagoUnavailableError(purchase.clubId);
      }
      const serviceFeeCents = await deps.serviceFees.forCharge(
        purchase.clubId,
        purchase.priceCents,
      );
      const amountCents = purchase.priceCents + serviceFeeCents;
      const { id } = await deps.payments.recordMercadoPago(
        { clubId: purchase.clubId, planPurchaseId: purchase.id, amountCents, serviceFeeCents },
        tx,
      );
      return { paymentId: id, clubId: purchase.clubId, amountCents };
    });

    const report = await deps.gateway.charge(pending.clubId, {
      amountCents: pending.amountCents,
      token: input.token,
      paymentMethodId: input.paymentMethodId,
      installments: input.installments,
      issuerId: input.issuerId,
      payerEmail: input.payerEmail,
      description: "Plan en Convoley",
      externalReference: pending.paymentId,
      idempotencyKey: pending.paymentId,
    });
    await deps.payments.attachProviderId(pending.paymentId, report.providerPaymentId);
    const settlement = await settle({ clubId: pending.clubId, report });
    return { result: report.result, statusDetail: report.statusDetail, settlement };
  };
}

type VoucherDeps = Pick<PaymentDeps, "purchases" | "payments" | "transactions" | "now">;

/** HU-27: the player paid by Yape/Plin and uploads the screenshot. */
export function makeSubmitPlanVoucher(deps: VoucherDeps) {
  return async function submitPlanVoucher(input: {
    purchaseId: string;
    image: { bytes: Uint8Array; contentType: string };
    yapeSecurityCode: string | null;
    /** Optional message for the organizer: the Yape name, "I'm paying for two"… */
    payerNote?: string | null;
  }) {
    // Checked before uploading, so a double submit leaves no files behind.
    await deps.transactions.run(async (tx) =>
      assertPendingPayment(await lockPurchase(deps.purchases, input.purchaseId, tx)),
    );
    const proofFileKey = await deps.payments.storeVoucherImage(input.image);
    await deps.transactions.run(async (tx) => {
      const purchase = await lockPurchase(deps.purchases, input.purchaseId, tx);
      assertPendingPayment(purchase);
      await deps.payments.recordVoucher(
        {
          clubId: purchase.clubId,
          planPurchaseId: purchase.id,
          amountCents: purchase.priceCents,
          proofFileKey,
          yapeSecurityCode: input.yapeSecurityCode,
          payerNote: input.payerNote ?? null,
        },
        tx,
      );
      await deps.purchases.setStatus(purchase.id, "in_review", tx);
    });
  };
}

export interface ReviewPlanVoucherInput {
  clubId: string;
  purchaseId: string;
  reviewedByUserId: string;
}

async function voucherToReview(
  deps: VoucherDeps,
  input: ReviewPlanVoucherInput,
  tx: TransactionContext,
) {
  const purchase = await deps.purchases.lock(input.purchaseId, tx);
  if (!purchase || purchase.clubId !== input.clubId) {
    throw new PlanPurchaseNotFoundError(input.purchaseId);
  }
  const voucher =
    purchase.status === "in_review"
      ? await deps.payments.findVoucherInReview(purchase.id, tx)
      : null;
  if (!voucher) throw new NothingToReviewError(purchase.id);
  return { purchase, voucher };
}

/** HU-27: the organizer approves the voucher and the plan's credits start counting. */
export function makeApprovePlanVoucher(deps: VoucherDeps) {
  return async function approvePlanVoucher(input: ReviewPlanVoucherInput) {
    await deps.transactions.run(async (tx) => {
      const { purchase, voucher } = await voucherToReview(deps, input, tx);
      const now = deps.now();
      await deps.payments.approveVoucher(
        { paymentId: voucher.id, reviewedByUserId: input.reviewedByUserId, at: now },
        tx,
      );
      await deps.purchases.activate(purchase.id, activation(purchase, now), tx);
    });
  };
}

/** Rejected with a reason the player sees (validated by the caller); it waits for a new payment. */
export function makeRejectPlanVoucher(deps: VoucherDeps) {
  return async function rejectPlanVoucher(input: ReviewPlanVoucherInput & { reason: string }) {
    await deps.transactions.run(async (tx) => {
      const { purchase, voucher } = await voucherToReview(deps, input, tx);
      await deps.payments.rejectVoucher(
        {
          paymentId: voucher.id,
          reason: input.reason,
          reviewedByUserId: input.reviewedByUserId,
          at: deps.now(),
        },
        tx,
      );
      await deps.purchases.setStatus(purchase.id, "pending_payment", tx);
    });
  };
}
