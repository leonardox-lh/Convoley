import type { ProductInput } from "../domain/product";
import type {
  ChargeReport,
  MercadoPagoGateway,
  OrderPayments,
  OrderRepository,
  SellableVariant,
  StoredOrder,
  StoredPayment,
  ProductImages,
  ProductRepository,
  StoredProduct,
  TransactionContext,
  TransactionRunner,
} from "./ports";

// In-memory fakes with the same contract as the real ports, shared by the application tests.
export const FAKE_TX = { fake: true } as unknown as TransactionContext;
export const fakeTransactions: TransactionRunner = { run: (work) => work(FAKE_TX) };

export function storedProduct(overrides: Partial<StoredProduct> = {}): StoredProduct {
  return {
    id: "prod-1",
    clubId: "club-1",
    name: "Polo",
    description: null,
    priceCents: 4500,
    imageKeys: [],
    isActive: true,
    variants: [
      { id: "var-s", size: "S", stock: 3 },
      { id: "var-m", size: "M", stock: 1 },
    ],
    ...overrides,
  };
}

export function fakeProductRepository(initial: StoredProduct[] = []) {
  const rows = [...initial];
  const find = (id: string) => rows.find((row) => row.id === id)!;
  const variantsOf = (product: ProductInput, previous: StoredProduct["variants"] = []) => {
    const updated = product.variants.map((variant, index) => ({
      id: previous.find((old) => old.size === variant.size)?.id ?? `var-${rows.length}-${index}`,
      ...variant,
    }));
    const dropped = previous
      .filter((old) => !product.variants.some((variant) => variant.size === old.size))
      .map((old) => ({ ...old, stock: 0 }));
    return [...updated, ...dropped];
  };
  const products: ProductRepository = {
    create: async (clubId, product) => {
      const id = `prod-${rows.length + 1}`;
      rows.push({
        id,
        clubId,
        imageKeys: [],
        isActive: true,
        ...product,
        variants: variantsOf(product),
      });
      return { id };
    },
    find: async (clubId, id) => rows.find((row) => row.id === id && row.clubId === clubId) ?? null,
    update: async (id, product) => {
      const row = find(id);
      Object.assign(row, product, { variants: variantsOf(product, row.variants) });
    },
    appendImageKey: async (id, key, max) => {
      const row = find(id);
      if (row.imageKeys.length >= max) return false;
      row.imageKeys.push(key);
      return true;
    },
    removeImageKey: async (id, key) => {
      const row = find(id);
      row.imageKeys = row.imageKeys.filter((existing) => existing !== key);
    },
    setActive: async (id, isActive) => {
      find(id).isActive = isActive;
    },
  };
  return { products, rows };
}

export function fakeProductImages() {
  const saved: string[] = [];
  const images: ProductImages = {
    save: async (clubSlug) => {
      const key = `${clubSlug}-${saved.length + 1}.jpg`;
      saved.push(key);
      return key;
    },
  };
  return { images, saved };
}

export function storedOrder(overrides: Partial<StoredOrder> = {}): StoredOrder {
  return {
    id: "ord-1",
    clubId: "club-1",
    status: "pending_payment",
    totalCents: 9000,
    items: [{ variantId: "var-s", quantity: 2, unitPriceCents: 4500 }],
    ...overrides,
  };
}

export function fakeOrderRepository(
  options: { orders?: StoredOrder[]; variants?: SellableVariant[] } = {},
) {
  const orders = [...(options.orders ?? [])];
  const variants = [...(options.variants ?? [{ variantId: "var-s", priceCents: 4500, stock: 3 }])];
  const created: Parameters<OrderRepository["create"]>[0][] = [];
  const repository: OrderRepository = {
    sellableVariants: async (_clubId, ids) => variants.filter((v) => ids.includes(v.variantId)),
    create: async (order) => {
      created.push(order);
      const id = `ord-${orders.length + 1}`;
      orders.push({
        id,
        clubId: order.clubId,
        status: "pending_payment",
        totalCents: order.totalCents,
        items: order.items,
      });
      return { id };
    },
    lock: async (id) => orders.find((order) => order.id === id) ?? null,
    setStatus: async (id, status) => {
      orders.find((order) => order.id === id)!.status = status;
    },
    lockStock: async (ids) =>
      new Map(variants.filter((v) => ids.includes(v.variantId)).map((v) => [v.variantId, v.stock])),
    takeStock: async (items) => {
      for (const item of items)
        variants.find((v) => v.variantId === item.variantId)!.stock -= item.quantity;
    },
  };
  return { repository, orders, variants, created };
}

export function fakeGateway(options: { enabled?: boolean; answer?: Partial<ChargeReport> } = {}) {
  const calls = { charged: [] as { amountCents: number }[], refunded: [] as string[] };
  const report = (overrides: Partial<ChargeReport>): ChargeReport => ({
    providerPaymentId: "mp-1",
    result: "approved",
    statusDetail: "accredited",
    amountCents: 9000,
    currency: "PEN",
    externalReference: null,
    ...overrides,
  });
  const gateway: MercadoPagoGateway = {
    isEnabled: async () => options.enabled ?? true,
    charge: async (_clubId, charge) => {
      calls.charged.push(charge);
      return report({
        amountCents: charge.amountCents,
        externalReference: charge.externalReference,
        ...options.answer,
      });
    },
    find: async (_clubId, providerPaymentId) => report({ providerPaymentId, ...options.answer }),
    refund: async (_clubId, providerPaymentId) => {
      calls.refunded.push(providerPaymentId);
    },
    clubIdForAccount: async (mpUserId) => (mpUserId === "seller-1" ? "club-1" : null),
  };
  return { gateway, calls };
}

export function fakeOrderPayments(initial: StoredPayment[] = []) {
  const rows: (StoredPayment & { providerPaymentId?: string; method?: string })[] = [...initial];
  const payments: OrderPayments = {
    recordMercadoPago: async (payment) => {
      const id = `pay-${rows.length + 1}`;
      rows.push({
        id,
        clubId: payment.clubId,
        orderId: payment.orderId,
        amountCents: payment.amountCents,
        status: "pending",
        method: "mercado_pago",
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
    setStatus: async ({ paymentId, status, providerPaymentId }) => {
      const row = rows.find((candidate) => candidate.id === paymentId)!;
      row.status = status;
      if (providerPaymentId) row.providerPaymentId = providerPaymentId;
    },
    storeVoucherImage: async () => "voucher-key",
    recordVoucher: async (payment) => {
      rows.push({
        id: `pay-${rows.length + 1}`,
        clubId: payment.clubId,
        orderId: payment.orderId,
        amountCents: payment.amountCents,
        status: "in_review",
        method: "voucher",
      });
    },
    findVoucherInReview: async (orderId) =>
      rows.find(
        (row) => row.orderId === orderId && row.method === "voucher" && row.status === "in_review",
      ) ?? null,
    approveVoucher: async ({ paymentId }) => {
      rows.find((row) => row.id === paymentId)!.status = "approved";
    },
    rejectVoucher: async ({ paymentId }) => {
      rows.find((row) => row.id === paymentId)!.status = "rejected";
    },
  };
  return { payments, rows };
}
