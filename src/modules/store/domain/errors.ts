export type InvalidProductReason =
  "name" | "price" | "no_variants" | "mixed_sizes" | "size" | "duplicate_size" | "stock";

export class InvalidProductError extends Error {
  constructor(readonly reason: InvalidProductReason) {
    super(`Invalid product: ${reason}`);
    this.name = "InvalidProductError";
  }
}

export class TooManyPhotosError extends Error {
  constructor(readonly productId: string) {
    super(`Product ${productId} already has the maximum number of photos`);
    this.name = "TooManyPhotosError";
  }
}

export class ProductNotFoundError extends Error {
  constructor(readonly productId: string) {
    super(`Product ${productId} not found`);
    this.name = "ProductNotFoundError";
  }
}

export type InvalidCartReason = "empty" | "quantity" | "unavailable" | "out_of_stock";

export class InvalidCartError extends Error {
  constructor(readonly reason: InvalidCartReason) {
    super(`Invalid cart: ${reason}`);
    this.name = "InvalidCartError";
  }
}

export class PickupEventNotAvailableError extends Error {
  constructor(readonly eventId: string) {
    super(`Event ${eventId} can't be used for pickup`);
    this.name = "PickupEventNotAvailableError";
  }
}

export class OrderNotFoundError extends Error {
  constructor(readonly orderId: string) {
    super(`Order ${orderId} not found`);
    this.name = "OrderNotFoundError";
  }
}

/** The order isn't in the status this action needs (e.g. paying an order already paid). */
export class OrderStatusError extends Error {
  constructor(
    readonly orderId: string,
    readonly status: string,
  ) {
    super(`Order ${orderId} is ${status}`);
    this.name = "OrderStatusError";
  }
}

/** A voucher can't be approved: the stock ran out after the order was placed. */
export class OutOfStockError extends Error {
  constructor(readonly orderId: string) {
    super(`Order ${orderId} has items out of stock`);
    this.name = "OutOfStockError";
  }
}

export class MercadoPagoUnavailableError extends Error {
  constructor(readonly clubId: string) {
    super(`Club ${clubId} doesn't take Mercado Pago payments`);
    this.name = "MercadoPagoUnavailableError";
  }
}

export class NothingToReviewError extends Error {
  constructor(readonly orderId: string) {
    super(`Order ${orderId} has no voucher to review`);
    this.name = "NothingToReviewError";
  }
}
