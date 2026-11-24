import { MercadoPagoAccountInUseError, MercadoPagoNotConnectedError } from "../domain/errors";
import { needsRefresh } from "../domain/mercado-pago-connection";
import type { MercadoPagoConnectionRepository, MercadoPagoOAuth } from "./ports";

interface Deps {
  oauth: MercadoPagoOAuth;
  connections: MercadoPagoConnectionRepository;
  now: () => Date;
}

/** HU-18: the organizer authorized Convoley in Mercado Pago; keep the tokens for this club. */
export function makeConnectMercadoPago(deps: Omit<Deps, "now">) {
  return async function connectMercadoPago(input: {
    clubId: string;
    userId: string;
    code: string;
    redirectUri: string;
  }) {
    const issued = await deps.oauth.exchangeCode({
      code: input.code,
      redirectUri: input.redirectUri,
    });
    const owner = await deps.connections.findByMpUserId(issued.mpUserId);
    if (owner && owner.clubId !== input.clubId) throw new MercadoPagoAccountInUseError();
    await deps.connections.save({
      ...issued,
      clubId: input.clubId,
      connectedByUserId: input.userId,
    });
    return { mpUserId: issued.mpUserId, liveMode: issued.liveMode };
  };
}

/** Forgets the tokens: new players pay by voucher again. Past payments stay as history. */
export function makeDisconnectMercadoPago(deps: Pick<Deps, "connections">) {
  return (clubId: string) => deps.connections.deleteByClub(clubId);
}

/** A usable access token for the club, renewed first when it is close to expiring. */
export function makeGetMercadoPagoAccess(deps: Deps) {
  return async function getMercadoPagoAccess(clubId: string) {
    let connection = await deps.connections.findByClub(clubId);
    if (!connection) throw new MercadoPagoNotConnectedError(clubId);
    if (needsRefresh(connection.expiresAt, deps.now())) {
      const renewed = await deps.oauth.refresh(connection.refreshToken);
      connection = { ...connection, ...renewed };
      await deps.connections.save(connection);
    }
    return {
      accessToken: connection.accessToken,
      publicKey: connection.publicKey,
      mpUserId: connection.mpUserId,
    };
  };
}
