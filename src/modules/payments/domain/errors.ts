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
