/** What Mercado Pago returns when the organizer authorizes Convoley, or a token is renewed. */
export interface MercadoPagoTokens {
  accessToken: string;
  refreshToken: string;
  publicKey: string;
  mpUserId: string;
  expiresAt: Date;
  liveMode: boolean;
}

export interface MercadoPagoOAuth {
  exchangeCode(input: { code: string; redirectUri: string }): Promise<MercadoPagoTokens>;
  refresh(refreshToken: string): Promise<MercadoPagoTokens>;
}

export interface StoredConnection extends MercadoPagoTokens {
  clubId: string;
  connectedByUserId: string;
}

/** Stores the connection; the implementation keeps the tokens encrypted at rest. */
export interface MercadoPagoConnectionRepository {
  findByClub(clubId: string): Promise<StoredConnection | null>;
  findByMpUserId(mpUserId: string): Promise<StoredConnection | null>;
  save(connection: StoredConnection): Promise<void>;
  deleteByClub(clubId: string): Promise<void>;
}

/** A card or Yape payment as Mercado Pago reports it (server to server, never from the browser). */
export interface MercadoPagoCharge {
  providerPaymentId: string;
  status: string;
  statusDetail: string | null;
  amountCents: number;
  currency: string;
  /** Our Payment.id, sent as external_reference when the charge was created. */
  externalReference: string | null;
}

export interface NewMercadoPagoCharge {
  amountCents: number;
  /** Card or Yape token created by Mercado Pago's browser SDK. */
  token: string;
  /** "yape", "visa", "master"… as the SDK reports it. */
  paymentMethodId: string;
  installments: number;
  issuerId: string | null;
  payerEmail: string;
  description: string;
  externalReference: string;
  idempotencyKey: string;
}

/** Charges on the organizer's account, with the organizer's own access token. */
export interface MercadoPagoCharges {
  create(accessToken: string, charge: NewMercadoPagoCharge): Promise<MercadoPagoCharge>;
  find(accessToken: string, providerPaymentId: string): Promise<MercadoPagoCharge>;
  refund(accessToken: string, providerPaymentId: string, idempotencyKey: string): Promise<void>;
}
