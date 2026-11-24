import type { PrismaClient } from "@/generated/prisma/client";
import type { MercadoPagoConnectionRepository, StoredConnection } from "../application/ports";
import { decryptToken, encryptToken } from "./token-cipher";

type Row = Awaited<ReturnType<PrismaClient["mercadoPagoConnection"]["findUnique"]>>;

export function prismaMercadoPagoConnections(
  db: PrismaClient,
  encryptionKey: string,
): MercadoPagoConnectionRepository {
  const toConnection = (row: NonNullable<Row>): StoredConnection => ({
    clubId: row.clubId,
    mpUserId: row.mpUserId,
    accessToken: decryptToken(row.accessTokenEncrypted, encryptionKey),
    refreshToken: decryptToken(row.refreshTokenEncrypted, encryptionKey),
    publicKey: row.publicKey,
    expiresAt: row.expiresAt,
    liveMode: row.liveMode,
    connectedByUserId: row.connectedByUserId,
  });

  return {
    async findByClub(clubId) {
      const row = await db.mercadoPagoConnection.findUnique({ where: { clubId } });
      return row && toConnection(row);
    },
    async findByMpUserId(mpUserId) {
      const row = await db.mercadoPagoConnection.findUnique({ where: { mpUserId } });
      return row && toConnection(row);
    },
    async save({ accessToken, refreshToken, ...connection }) {
      const data = {
        ...connection,
        accessTokenEncrypted: encryptToken(accessToken, encryptionKey),
        refreshTokenEncrypted: encryptToken(refreshToken, encryptionKey),
      };
      await db.mercadoPagoConnection.upsert({
        where: { clubId: connection.clubId },
        create: data,
        update: data,
      });
    },
    async deleteByClub(clubId) {
      await db.mercadoPagoConnection.deleteMany({ where: { clubId } });
    },
  };
}

/** Whether the club is connected, for screens; reads no token. */
export function findMercadoPagoStatus(db: PrismaClient, clubId: string) {
  return db.mercadoPagoConnection.findUnique({
    where: { clubId },
    select: { mpUserId: true, liveMode: true, publicKey: true },
  });
}
