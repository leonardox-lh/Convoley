import { describe, expect, it } from "vitest";
import { MercadoPagoAccountInUseError, MercadoPagoNotConnectedError } from "../domain/errors";
import { fakeConnections, fakeOAuth, tokens } from "./fakes";
import {
  makeConnectMercadoPago,
  makeDisconnectMercadoPago,
  makeGetMercadoPagoAccess,
} from "./mercado-pago-connection";
import type { StoredConnection } from "./ports";

const NOW = new Date("2026-11-24T12:00:00Z");
const input = { clubId: "club-1", userId: "user-1", code: "TG-code", redirectUri: "https://x/cb" };

function stored(overrides: Partial<StoredConnection> = {}): StoredConnection {
  return { ...tokens(), clubId: "club-1", connectedByUserId: "user-1", ...overrides };
}

describe("HU-18: conectar Mercado Pago", () => {
  it("HU-18 criterio 1: cambia el código de autorización por tokens y los guarda para el club", async () => {
    const { oauth, calls } = fakeOAuth(tokens({ mpUserId: "999" }));
    const { connections, rows } = fakeConnections();
    const connect = makeConnectMercadoPago({ oauth, connections });

    const result = await connect(input);

    expect(calls.exchanged).toEqual(["TG-code"]);
    expect(result).toEqual({ mpUserId: "999", liveMode: false });
    expect(rows).toEqual([
      expect.objectContaining({ clubId: "club-1", mpUserId: "999", connectedByUserId: "user-1" }),
    ]);
  });

  it("HU-18 criterio 1: reconectar reemplaza los tokens del mismo club", async () => {
    const { oauth } = fakeOAuth(tokens({ accessToken: "APP_USR-new" }));
    const { connections, rows } = fakeConnections([stored()]);

    await makeConnectMercadoPago({ oauth, connections })(input);

    expect(rows).toHaveLength(1);
    expect(rows[0]!.accessToken).toBe("APP_USR-new");
  });

  it("HU-18 criterio 1: una cuenta de Mercado Pago no puede cobrar para dos clubes", async () => {
    const { oauth } = fakeOAuth(tokens({ mpUserId: "111" }));
    const { connections } = fakeConnections([stored({ clubId: "club-2", mpUserId: "111" })]);

    await expect(makeConnectMercadoPago({ oauth, connections })(input)).rejects.toThrow(
      MercadoPagoAccountInUseError,
    );
  });

  it("HU-18 criterio 2: se puede desconectar y ya no hay token para cobrar", async () => {
    const { oauth } = fakeOAuth();
    const { connections, rows } = fakeConnections([stored()]);
    const getAccess = makeGetMercadoPagoAccess({ oauth, connections, now: () => NOW });

    await makeDisconnectMercadoPago({ connections })("club-1");

    expect(rows).toHaveLength(0);
    await expect(getAccess("club-1")).rejects.toThrow(MercadoPagoNotConnectedError);
  });

  it("HU-18 criterio 3: el token que se usa para cobrar es el del organizador del club", async () => {
    const { oauth, calls } = fakeOAuth();
    const { connections } = fakeConnections([stored({ accessToken: "APP_USR-organizer" })]);

    const access = await makeGetMercadoPagoAccess({ oauth, connections, now: () => NOW })("club-1");

    expect(access.accessToken).toBe("APP_USR-organizer");
    expect(calls.refreshed).toEqual([]);
  });

  it("HU-18: renueva el token cuando le falta menos de una semana para vencer", async () => {
    const { oauth, calls } = fakeOAuth(tokens({ accessToken: "APP_USR-renewed" }));
    const { connections, rows } = fakeConnections([
      stored({ expiresAt: new Date("2026-11-28T00:00:00Z"), refreshToken: "TG-old" }),
    ]);

    const access = await makeGetMercadoPagoAccess({ oauth, connections, now: () => NOW })("club-1");

    expect(calls.refreshed).toEqual(["TG-old"]);
    expect(access.accessToken).toBe("APP_USR-renewed");
    expect(rows[0]!.accessToken).toBe("APP_USR-renewed");
  });
});
