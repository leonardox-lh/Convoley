export class VoucherTooLargeError extends Error {
  constructor(readonly sizeBytes: number) {
    super(`Voucher image is too large: ${sizeBytes} bytes`);
    this.name = "VoucherTooLargeError";
  }
}

export class InvalidVoucherTypeError extends Error {
  constructor(readonly contentType: string) {
    super(`Voucher must be a JPG, PNG or WebP image, got "${contentType}"`);
    this.name = "InvalidVoucherTypeError";
  }
}

export class InvalidSecurityCodeError extends Error {
  constructor() {
    super("The Yape security code must be digits only");
    this.name = "InvalidSecurityCodeError";
  }
}

export class MercadoPagoNotConnectedError extends Error {
  constructor(readonly clubId: string) {
    super(`Club ${clubId} has no Mercado Pago account connected`);
    this.name = "MercadoPagoNotConnectedError";
  }
}

/** Mercado Pago refused the OAuth code or refresh token (expired, revoked, wrong app). */
export class MercadoPagoAuthorizationError extends Error {
  constructor(readonly detail: string) {
    super(`Mercado Pago authorization failed: ${detail}`);
    this.name = "MercadoPagoAuthorizationError";
  }
}

/** The Mercado Pago account is already connected to another club. */
export class MercadoPagoAccountInUseError extends Error {
  constructor() {
    super("This Mercado Pago account is already connected to another club");
    this.name = "MercadoPagoAccountInUseError";
  }
}

/** Mercado Pago answered a charge, lookup or refund with an error (network, 4xx, 5xx). */
export class MercadoPagoChargeError extends Error {
  constructor(
    readonly httpStatus: number,
    readonly body: unknown,
  ) {
    super(`Mercado Pago request failed with HTTP ${httpStatus}`);
    this.name = "MercadoPagoChargeError";
  }
}
