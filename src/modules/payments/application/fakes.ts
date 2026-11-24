import type {
  MercadoPagoConnectionRepository,
  MercadoPagoOAuth,
  MercadoPagoTokens,
  StoredConnection,
} from "./ports";

// In-memory fakes with the same contract as the real ports, shared by the application tests.
export function tokens(overrides: Partial<MercadoPagoTokens> = {}): MercadoPagoTokens {
  return {
    accessToken: "APP_USR-access",
    refreshToken: "TG-refresh",
    publicKey: "APP_USR-public",
    mpUserId: "111",
    expiresAt: new Date("2027-05-01T00:00:00Z"),
    liveMode: false,
    ...overrides,
  };
}

export function fakeOAuth(issued: MercadoPagoTokens = tokens()) {
  const calls = { exchanged: [] as string[], refreshed: [] as string[] };
  const oauth: MercadoPagoOAuth = {
    exchangeCode: async ({ code }) => {
      calls.exchanged.push(code);
      return issued;
    },
    refresh: async (refreshToken) => {
      calls.refreshed.push(refreshToken);
      return issued;
    },
  };
  return { oauth, calls };
}

export function fakeConnections(initial: StoredConnection[] = []) {
  const rows = [...initial];
  const connections: MercadoPagoConnectionRepository = {
    findByClub: async (clubId) => rows.find((row) => row.clubId === clubId) ?? null,
    findByMpUserId: async (mpUserId) => rows.find((row) => row.mpUserId === mpUserId) ?? null,
    save: async (connection) => {
      const index = rows.findIndex((row) => row.clubId === connection.clubId);
      if (index >= 0) rows[index] = connection;
      else rows.push(connection);
    },
    deleteByClub: async (clubId) => {
      const index = rows.findIndex((row) => row.clubId === clubId);
      if (index >= 0) rows.splice(index, 1);
    },
  };
  return { connections, rows };
}
