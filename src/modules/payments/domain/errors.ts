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
