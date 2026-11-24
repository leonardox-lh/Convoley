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
