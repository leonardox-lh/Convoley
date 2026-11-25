import { describe, expect, it } from "vitest";
import {
  ClubNotFoundError,
  InvalidLogoTypeError,
  InvalidServiceFeeError,
  LogoTooLargeError,
} from "../domain/errors";
import { MAX_LOGO_BYTES } from "../domain/logo";
import { fakeLogoStorage } from "./fakes";
import type { ClubPaymentSettings, PaymentSettingsRepository } from "./ports";
import { makeUpdatePaymentSettings } from "./update-payment-settings";
import { makeUpdateServiceFee } from "./update-service-fee";

function fakeSettings(initial: ClubPaymentSettings | null) {
  let stored = initial;
  const settings: PaymentSettingsRepository = {
    find: async () => stored,
    update: async (_slug, changes) => void (stored = { ...stored!, ...changes }),
  };
  return { settings, current: () => stored };
}

const empty = {
  paymentPhone: null,
  paymentHolderName: null,
  paymentQrKey: null,
  serviceFeeFixedCents: 0,
  serviceFeePercentBps: 0,
  cancellationDeadlineHours: null,
};
const input = {
  clubSlug: "voley-miraflores",
  paymentPhone: "+51987654321",
  paymentHolderName: "Ana Paz",
  qr: null,
};
const png = (bytes: number) => ({ bytes: new Uint8Array(bytes), contentType: "image/png" });

describe("HU-13 criterio 1: subir la imagen del QR", () => {
  it("HU-13: guarda el QR con una clave nueva del club", async () => {
    const { settings, current } = fakeSettings(empty);
    const images = fakeLogoStorage().storage;
    await makeUpdatePaymentSettings({ settings, images })({ ...input, qr: png(100) });
    expect(current()?.paymentQrKey).toMatch(/^voley-miraflores-qr-.+\.png$/);
  });

  it("HU-13: sin archivo nuevo conserva el QR anterior", async () => {
    const { settings, current } = fakeSettings({ ...empty, paymentQrKey: "old.png" });
    await makeUpdatePaymentSettings({ settings, images: fakeLogoStorage().storage })(input);
    expect(current()?.paymentQrKey).toBe("old.png");
  });

  it("HU-13: rechaza un QR que no es imagen o pesa más de 2 MB", async () => {
    const { settings } = fakeSettings(empty);
    const update = makeUpdatePaymentSettings({ settings, images: fakeLogoStorage().storage });
    await expect(
      update({ ...input, qr: { bytes: new Uint8Array(1), contentType: "application/pdf" } }),
    ).rejects.toThrow(InvalidLogoTypeError);
    await expect(update({ ...input, qr: png(MAX_LOGO_BYTES + 1) })).rejects.toThrow(
      LogoTooLargeError,
    );
  });
});

describe("HU-13 criterio 2: número y titular visibles para el jugador", () => {
  it("HU-13: guarda número y titular", async () => {
    const { settings, current } = fakeSettings(empty);
    await makeUpdatePaymentSettings({ settings, images: fakeLogoStorage().storage })(input);
    expect(current()).toMatchObject({ paymentPhone: "+51987654321", paymentHolderName: "Ana Paz" });
  });

  it("HU-13: falla si el club no existe", async () => {
    const { settings } = fakeSettings(null);
    await expect(
      makeUpdatePaymentSettings({ settings, images: fakeLogoStorage().storage })(input),
    ).rejects.toThrow(ClubNotFoundError);
  });
});

describe("HU-22 criterio 1: el organizador define un cargo fijo o un porcentaje", () => {
  it("HU-22: guarda un porcentaje y lo cambia por un monto fijo sin dejar los dos", async () => {
    const { settings, current } = fakeSettings(empty);
    const update = makeUpdateServiceFee({ settings });

    await update({ clubSlug: "voley-miraflores", kind: "percent", amount: 350 });
    expect(current()).toMatchObject({ serviceFeeFixedCents: 0, serviceFeePercentBps: 350 });

    await update({ clubSlug: "voley-miraflores", kind: "fixed", amount: 100 });
    expect(current()).toMatchObject({ serviceFeeFixedCents: 100, serviceFeePercentBps: 0 });

    await update({ clubSlug: "voley-miraflores", kind: "none", amount: 0 });
    expect(current()).toMatchObject({ serviceFeeFixedCents: 0, serviceFeePercentBps: 0 });
  });

  it("HU-22: rechaza un cargo fuera de los límites o de un club que no existe", async () => {
    const update = makeUpdateServiceFee(fakeSettings(empty));
    await expect(update({ clubSlug: "x", kind: "fixed", amount: 9_999 })).rejects.toThrow(
      InvalidServiceFeeError,
    );
    await expect(
      makeUpdateServiceFee(fakeSettings(null))({ clubSlug: "x", kind: "fixed", amount: 100 }),
    ).rejects.toThrow(ClubNotFoundError);
  });
});
