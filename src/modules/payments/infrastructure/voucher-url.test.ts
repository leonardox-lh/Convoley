import { describe, expect, it, vi } from "vitest";

// env.ts requires real variables; the secret is passed explicitly below.
vi.mock("@/lib/env", () => ({ env: { AUTH_SECRET: "unused" } }));

const { signVoucherPath, verifyVoucherSignature, VOUCHER_URL_TTL_MS } =
  await import("./voucher-url");

const SECRET = "a-test-secret-that-is-long-enough-123";
// A multiple of 5 minutes, so the stable window starts exactly now.
const NOW = 1_800_000_000_000;

function parse(path: string) {
  const url = new URL(path, "http://localhost");
  return {
    key: decodeURIComponent(url.pathname.split("/").pop()!),
    exp: url.searchParams.get("exp"),
    sig: url.searchParams.get("sig"),
  };
}

describe("HU-15 criterio 1: la captura se ve solo con una URL firmada", () => {
  it("HU-15: una URL firmada vale antes de vencer", () => {
    const signed = parse(signVoucherPath("abc.jpg", NOW, SECRET));
    expect(verifyVoucherSignature(signed, NOW + 1000, SECRET)).toBe(true);
  });

  it("HU-15: vence a los 10 minutos", () => {
    const signed = parse(signVoucherPath("abc.jpg", NOW, SECRET));
    expect(verifyVoucherSignature(signed, NOW + VOUCHER_URL_TTL_MS + 1, SECRET)).toBe(false);
  });

  it("HU-15: no sirve para otra captura ni con la firma cambiada", () => {
    const signed = parse(signVoucherPath("abc.jpg", NOW, SECRET));
    expect(verifyVoucherSignature({ ...signed, key: "otra.jpg" }, NOW, SECRET)).toBe(false);
    expect(verifyVoucherSignature({ ...signed, sig: "x" + signed.sig }, NOW, SECRET)).toBe(false);
    expect(verifyVoucherSignature({ ...signed, exp: String(NOW * 2) }, NOW, SECRET)).toBe(false);
  });

  it("HU-15: sin firma no se ve", () => {
    expect(verifyVoucherSignature({ key: "abc.jpg", exp: null, sig: null }, NOW, SECRET)).toBe(
      false,
    );
  });
});

describe("HU-15: la URL no cambia en cada refresco de la lista", () => {
  it("HU-15: dos firmas dentro de la misma ventana de 5 minutos son iguales", () => {
    expect(signVoucherPath("abc.jpg", NOW + 1000, SECRET)).toBe(
      signVoucherPath("abc.jpg", NOW + 60_000, SECRET),
    );
  });
});
