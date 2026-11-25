import type { ChargeResult, OrderStatus, StoredPaymentStatus } from "../domain/order";
import type { ProductInput } from "../domain/product";

declare const transactionBrand: unique symbol;
/** Handle of a running database transaction; only infrastructure looks inside it. */
export type TransactionContext = { readonly [transactionBrand]: true };

export interface TransactionRunner {
  run<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

export interface StoredVariant {
  id: string;
  size: string | null;
  stock: number;
}

export interface StoredProduct {
  id: string;
  clubId: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageKeys: string[];
  isActive: boolean;
  variants: StoredVariant[];
}

export interface ProductRepository {
  create(clubId: string, product: ProductInput): Promise<{ id: string }>;
  find(clubId: string, productId: string): Promise<StoredProduct | null>;
  /** Variants are matched by size; a size left out keeps its row (it may have sales) with stock 0. */
  update(productId: string, product: ProductInput): Promise<void>;
  /** Adds the photo only while the product has fewer than `max`; false when it was full. */
  appendImageKey(productId: string, key: string, max: number): Promise<boolean>;
  removeImageKey(productId: string, key: string): Promise<void>;
  setActive(productId: string, isActive: boolean): Promise<void>;
}

/** Public product photos, stored like the club's logo (owned by `clubs`). */
export interface ProductImages {
  save(clubSlug: string, image: { bytes: Uint8Array; contentType: string }): Promise<string>;
}

// ─── Orders (HU-24, HU-25) ───

export interface Buyer {
  firstName: string;
  lastName: string;
  /** Normalized +519XXXXXXXX. */
  phone: string;
  userId: string | null;
}

/** A size of an active product of the club, as the cart needs it. */
export interface SellableVariant {
  variantId: string;
  priceCents: number;
  stock: number;
}

export interface OrderItem {
  variantId: string;
  quantity: number;
  unitPriceCents: number;
}

export interface StoredOrder {
  id: string;
  clubId: string;
  status: OrderStatus;
  totalCents: number;
  items: OrderItem[];
}

export interface OrderRepository {
  sellableVariants(clubId: string, variantIds: string[]): Promise<SellableVariant[]>;
  create(order: {
    clubId: string;
    pickupEventId: string;
    buyer: Buyer;
    totalCents: number;
    items: OrderItem[];
  }): Promise<{ id: string }>;
  /** Reads the order and locks its row until the transaction ends. */
  lock(orderId: string, tx: TransactionContext): Promise<StoredOrder | null>;
  setStatus(orderId: string, status: OrderStatus, tx: TransactionContext): Promise<void>;
  /** Locks the variants (in id order, so two orders never deadlock) and returns their stock. */
  lockStock(variantIds: string[], tx: TransactionContext): Promise<Map<string, number>>;
  takeStock(items: OrderItem[], tx: TransactionContext): Promise<void>;
}

/** Upcoming events of the club where the order can be picked up (owned by `events`). */
export interface PickupEvents {
  isAvailable(clubSlug: string, eventId: string): Promise<boolean>;
}

export interface ServiceFees {
  forCharge(clubId: string, priceCents: number): Promise<number>;
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

export interface StoredPayment {
  id: string;
  clubId: string;
  orderId: string | null;
  amountCents: number;
  status: StoredPaymentStatus;
}

/** Payment rows of orders (owned by `payments`). */
export interface OrderPayments {
  recordMercadoPago(
    payment: { clubId: string; orderId: string; amountCents: number; serviceFeeCents: number },
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
      orderId: string;
      amountCents: number;
      proofFileKey: string;
      yapeSecurityCode: string | null;
    },
    tx: TransactionContext,
  ): Promise<void>;
  findVoucherInReview(orderId: string, tx: TransactionContext): Promise<{ id: string } | null>;
  approveVoucher(
    input: { paymentId: string; reviewedByUserId: string; at: Date },
    tx: TransactionContext,
  ): Promise<void>;
  rejectVoucher(
    input: { paymentId: string; reason: string; reviewedByUserId: string; at: Date },
    tx: TransactionContext,
  ): Promise<void>;
}
