import { describe, expect, it } from "vitest";
import { ClubNotFoundError, InvalidLogoTypeError, LogoTooLargeError } from "../domain/errors";
import { MAX_LOGO_BYTES } from "../domain/logo";
import { fakeLogoStorage } from "./fakes";
import type { ClubPaymentSettings, PaymentSettingsRepository } from "./ports";
import { makeUpdatePaymentSettings } from "./update-payment-settings";

function fakeSettings(initial: ClubPaymentSettings | null) {
  let stored = initial;
  const settings: PaymentSettingsRepository = {
    find: async () => stored,
    update: async (_slug, changes) => void (stored = { ...stored!, ...changes }),
  };
  return { settings, current: () => stored };
}

const empty = { paymentPhone: null, paymentHolderName: null, paymentQrKey: null };
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
