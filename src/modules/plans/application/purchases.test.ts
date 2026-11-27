import { describe, expect, test } from "vitest";
import {
  NoCreditAvailableError,
  PlanAlreadyOpenError,
  PlanNotFoundError,
  PlanPurchaseStatusError,
} from "../domain/errors";
import type { CreditSource, PlanPurchaseStatus } from "../domain/purchase";
import { makeConsumeCredit, makeGetCreditBalance, makeReturnCredits } from "./credits";
import type {
  ChargeReport,
  MercadoPagoGateway,
  PlanRepository,
  PurchasePayments,
  PurchaseRepository,
  StoredPayment,
  TransactionContext,
} from "./ports";
import {
  makeApprovePlanVoucher,
  makeBuyPlan,
  makeSettlePlanPurchaseNotification,
  makeSettlePlanPurchasePayment,
  makeStartPlanMercadoPagoPayment,
  makeSubmitPlanVoucher,
} from "./purchases";

const TX = {} as TransactionContext;
const transactions = { run: <T>(work: (tx: TransactionContext) => Promise<T>) => work(TX) };
const NOW = new Date("2026-12-01T12:00:00Z");
const PLAN = {
  id: "plan-1",
  clubId: "club-1",
  name: "4 fechas",
  priceCents: 5000,
  creditCount: 4,
  validityDays: 30,
  communityIds: ["amateur"],
  isActive: true,
};

interface Row extends CreditSource {
  clubId: string;
  phone: string;
  userId: string;
  uses: string[];
}

function fakePurchases(initial: Partial<Row>[] = []) {
  const rows: Row[] = initial.map((row, index) => ({
    id: `pur-${index + 1}`,
    clubId: "club-1",
    phone: "+51987654321",
    userId: "user-1",
    status: "pending_payment" as PlanPurchaseStatus,
    creditsRemaining: null,
    expiresAt: null,
    communityIds: PLAN.communityIds,
    uses: [],
    ...row,
  }));
  const purchases: PurchaseRepository = {
    create: async ({ clubId, buyer }) => {
      const id = `pur-${rows.length + 1}`;
      rows.push({
        id,
        clubId,
        phone: buyer.phone,
        userId: buyer.userId,
        status: "pending_payment",
        creditsRemaining: null,
        expiresAt: null,
        communityIds: PLAN.communityIds,
        uses: [],
      });
      return { id };
    },
    lock: async (id) => {
      const row = rows.find((candidate) => candidate.id === id);
      if (!row) return null;
      return {
        id: row.id,
        clubId: row.clubId,
        status: row.status,
        priceCents: PLAN.priceCents,
        creditCount: PLAN.creditCount,
        validityDays: PLAN.validityDays,
      };
    },
    setStatus: async (id, status) => {
      rows.find((row) => row.id === id)!.status = status;
    },
    activate: async (id, terms) => {
      Object.assign(
        rows.find((row) => row.id === id)!,
        { status: "active", creditsRemaining: terms.creditsRemaining, expiresAt: terms.expiresAt },
      );
    },
    listOpenForPlayer: async (player) =>
      rows.filter((row) => row.clubId === player.clubId && row.userId === player.userId),
    listForPlayer: async (player) =>
      rows.filter((row) => row.clubId === player.clubId && row.userId === player.userId),
    useCredit: async (id, registrationId) => {
      const row = rows.find((candidate) => candidate.id === id)!;
      if (row.creditsRemaining !== null) row.creditsRemaining -= 1;
      row.uses.push(registrationId);
    },
    returnCredits: async (registrationIds) => {
      for (const row of rows) {
        const returned = row.uses.filter((use) => registrationIds.includes(use));
        row.uses = row.uses.filter((use) => !registrationIds.includes(use));
        if (row.creditsRemaining !== null) row.creditsRemaining += returned.length;
      }
    },
  };
  return { purchases, rows };
}

function fakePayments(initial: (StoredPayment & { providerPaymentId?: string })[] = []) {
  const rows = [...initial] as (StoredPayment & { providerPaymentId?: string; method?: string })[];
  const payments: PurchasePayments = {
    recordMercadoPago: async (payment) => {
      const id = `pay-${rows.length + 1}`;
      rows.push({
        id,
        clubId: payment.clubId,
        planPurchaseId: payment.planPurchaseId,
        amountCents: payment.amountCents,
        status: "pending",
      });
      return { id };
    },
    attachProviderId: async (id, providerPaymentId) => {
      rows.find((row) => row.id === id)!.providerPaymentId = providerPaymentId;
    },
    find: async (where) =>
      rows.find((row) =>
        "id" in where ? row.id === where.id : row.providerPaymentId === where.providerPaymentId,
      ) ?? null,
    setStatus: async ({ paymentId, status }) => {
      rows.find((row) => row.id === paymentId)!.status = status;
    },
    storeVoucherImage: async () => "voucher-key",
    recordVoucher: async (payment) => {
      rows.push({
        id: `pay-${rows.length + 1}`,
        clubId: payment.clubId,
        planPurchaseId: payment.planPurchaseId,
        amountCents: payment.amountCents,
        status: "in_review",
        method: "voucher",
      });
    },
    findVoucherInReview: async (id) =>
      rows.find((row) => row.planPurchaseId === id && row.status === "in_review") ?? null,
    approveVoucher: async ({ paymentId }) => {
      rows.find((row) => row.id === paymentId)!.status = "approved";
    },
    rejectVoucher: async ({ paymentId }) => {
      rows.find((row) => row.id === paymentId)!.status = "rejected";
    },
  };
  return { payments, rows };
}

function fakeGateway(answer: Partial<ChargeReport> = {}) {
  const refunded: string[] = [];
  const report = (overrides: Partial<ChargeReport>): ChargeReport => ({
    providerPaymentId: "mp-1",
    result: "approved",
    statusDetail: "accredited",
    amountCents: 5000,
    currency: "PEN",
    externalReference: null,
    ...overrides,
  });
  const gateway: MercadoPagoGateway = {
    isEnabled: async () => true,
    charge: async (_club, charge) =>
      report({
        amountCents: charge.amountCents,
        externalReference: charge.externalReference,
        ...answer,
      }),
    find: async (_club, providerPaymentId) => report({ providerPaymentId, ...answer }),
    refund: async (_club, providerPaymentId) => {
      refunded.push(providerPaymentId);
    },
    clubIdForAccount: async () => "club-1",
  };
  return { gateway, refunded };
}

const plans: PlanRepository = {
  create: async () => ({ id: "x" }),
  find: async (id) =>
    id === PLAN.id ? PLAN : id === "off" ? { ...PLAN, id: "off", isActive: false } : null,
  setActive: async () => {},
};
const buyer = { firstName: "Ana", lastName: "Pérez", phone: "+51987654321", userId: "user-1" };

function setupPayments(
  purchaseRows: Partial<Row>[] = [{}],
  paymentRows: Parameters<typeof fakePayments>[0] = [],
) {
  const { purchases, rows } = fakePurchases(purchaseRows);
  const { payments, rows: paid } = fakePayments(paymentRows);
  const { gateway, refunded } = fakeGateway();
  const deps = { purchases, payments, gateway, transactions, now: () => NOW };
  const settle = makeSettlePlanPurchasePayment(deps);
  return {
    start: makeStartPlanMercadoPagoPayment(
      { ...deps, serviceFees: { forCharge: async () => 0 } },
      settle,
    ),
    notify: makeSettlePlanPurchaseNotification(deps, settle),
    submitVoucher: makeSubmitPlanVoucher(deps),
    approve: makeApprovePlanVoucher(deps),
    rows,
    paid,
    refunded,
  };
}

describe("HU-27: comprar un plan", () => {
  test("solo planes activos del club; guarda celular y cuenta de Google", async () => {
    const { purchases, rows } = fakePurchases();
    const buy = makeBuyPlan({ plans, purchases, now: () => NOW });
    await expect(buy({ clubId: "club-1", planId: "off", buyer })).rejects.toBeInstanceOf(
      PlanNotFoundError,
    );
    await expect(buy({ clubId: "otro", planId: "plan-1", buyer })).rejects.toBeInstanceOf(
      PlanNotFoundError,
    );
    await buy({ clubId: "club-1", planId: "plan-1", buyer });
    expect(rows[0]).toMatchObject({
      phone: "+51987654321",
      userId: "user-1",
      status: "pending_payment",
    });
  });

  test("un plan a la vez: no compra otro si tiene uno en revisión o vigente con fechas", async () => {
    const buyWith = (row: Partial<Row>) =>
      makeBuyPlan({ plans, purchases: fakePurchases([row]).purchases, now: () => NOW })({
        clubId: "club-1",
        planId: "plan-1",
        buyer,
      });
    const later = new Date("2026-12-20T00:00:00Z");
    const earlier = new Date("2026-11-20T00:00:00Z");
    await expect(buyWith({ status: "in_review" })).rejects.toBeInstanceOf(PlanAlreadyOpenError);
    await expect(
      buyWith({ status: "active", creditsRemaining: 2, expiresAt: later }),
    ).rejects.toBeInstanceOf(PlanAlreadyOpenError);
    // Used up or expired plans, and unpaid ones, don't stop a new purchase.
    await expect(
      buyWith({ status: "active", creditsRemaining: 0, expiresAt: later }),
    ).resolves.toBeTruthy();
    await expect(
      buyWith({ status: "active", creditsRemaining: 2, expiresAt: earlier }),
    ).resolves.toBeTruthy();
    await expect(buyWith({ status: "pending_payment" })).resolves.toBeTruthy();
  });

  test("con Mercado Pago el plan se activa con sus 4 fechas y vence a los 30 días", async () => {
    const { start, rows } = setupPayments();
    const outcome = await start({
      purchaseId: "pur-1",
      token: "t",
      paymentMethodId: "yape",
      installments: 1,
      issuerId: null,
      payerEmail: "a@b.pe",
    });
    expect(outcome.settlement).toBe("activate");
    expect(rows[0]).toMatchObject({
      status: "active",
      creditsRemaining: 4,
      expiresAt: new Date("2026-12-31T12:00:00Z"),
    });
  });

  test("un segundo pago del mismo plan se devuelve automáticamente", async () => {
    const { notify, refunded } = setupPayments(
      [{ status: "active", creditsRemaining: 4 }],
      [
        {
          id: "pay-9",
          clubId: "club-1",
          planPurchaseId: "pur-1",
          amountCents: 5000,
          status: "pending",
          providerPaymentId: "mp-1",
        },
      ],
    );
    expect(await notify({ providerPaymentId: "mp-1", mpUserId: null })).toBe("refund");
    expect(refunded).toEqual(["mp-1"]);
  });

  test("con voucher: en revisión hasta que el organizador lo aprueba", async () => {
    const { submitVoucher, approve, rows } = setupPayments();
    await submitVoucher({
      purchaseId: "pur-1",
      image: { bytes: new Uint8Array(), contentType: "image/png" },
      yapeSecurityCode: null,
    });
    expect(rows[0]!.status).toBe("in_review");
    await expect(
      submitVoucher({
        purchaseId: "pur-1",
        image: { bytes: new Uint8Array(), contentType: "image/png" },
        yapeSecurityCode: null,
      }),
    ).rejects.toBeInstanceOf(PlanPurchaseStatusError);
    await approve({ clubId: "club-1", purchaseId: "pur-1", reviewedByUserId: "org" });
    expect(rows[0]).toMatchObject({ status: "active", creditsRemaining: 4 });
  });
});

const event = { communityId: "amateur", startsAt: new Date("2026-12-10T00:00:00Z") };

describe("HU-27: el plan es de la cuenta de Google, no del celular", () => {
  test("solo la cuenta que lo compró ve sus créditos, aunque otro use el mismo celular", async () => {
    const { purchases } = fakePurchases([
      { status: "active", creditsRemaining: 2, phone: "+51911111111", userId: "user-1" },
    ]);
    const balance = makeGetCreditBalance({ purchases });
    expect(await balance({ player: { clubId: "club-1", userId: "user-1" }, event })).toBe(2);
    expect(await balance({ player: { clubId: "club-1", userId: "user-2" }, event })).toBe(0);
  });
});

describe("HU-27: usar créditos al inscribirse", () => {
  const player = { clubId: "club-1", userId: "user-1" };

  test("descuenta un crédito y lo devuelve si la inscripción se quita", async () => {
    const { purchases, rows } = fakePurchases([{ status: "active", creditsRemaining: 1 }]);
    const consume = makeConsumeCredit({ purchases });
    await consume({ player, event, registrationId: "reg-1" }, TX);
    expect(rows[0]!.creditsRemaining).toBe(0);
    await expect(consume({ player, event, registrationId: "reg-2" }, TX)).rejects.toBeInstanceOf(
      NoCreditAvailableError,
    );
    await makeReturnCredits({ purchases })(["reg-1"], TX);
    expect(rows[0]!.creditsRemaining).toBe(1);
  });

  test("un plan de otra comunidad no sirve", async () => {
    const { purchases } = fakePurchases([
      { status: "active", creditsRemaining: 3, communityIds: ["general"] },
    ]);
    await expect(
      makeConsumeCredit({ purchases })({ player, event, registrationId: "reg-1" }, TX),
    ).rejects.toBeInstanceOf(NoCreditAvailableError);
  });
});
