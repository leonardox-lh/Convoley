import { describe, expect, test } from "vitest";
import type { InvalidPlanError } from "./errors";
import { validatePlan, type PlanInput } from "./plan";

const CLUB_COMMUNITIES = ["general", "amateur"];
const plan = (overrides: Partial<PlanInput> = {}): PlanInput => ({
  name: "4 fechas",
  priceCents: 5000,
  creditCount: 4,
  validityDays: null,
  communityIds: ["general"],
  ...overrides,
});
const reason = (input: PlanInput) => {
  try {
    validatePlan(input, CLUB_COMMUNITIES);
    return null;
  } catch (error) {
    return (error as InvalidPlanError).reason;
  }
};

describe("HU-26: número de fechas o vigencia en días", () => {
  test("4 fechas, mensualidad (30 días sin límite de fechas) o ambos", () => {
    expect(reason(plan())).toBeNull();
    expect(reason(plan({ creditCount: null, validityDays: 30 }))).toBeNull();
    expect(reason(plan({ creditCount: 4, validityDays: 30 }))).toBeNull();
  });

  test("al menos uno de los dos, con valores positivos", () => {
    expect(reason(plan({ creditCount: null, validityDays: null }))).toBe("terms");
    expect(reason(plan({ creditCount: 0 }))).toBe("terms");
    expect(reason(plan({ creditCount: null, validityDays: -1 }))).toBe("terms");
  });
});

describe("HU-26: precio", () => {
  test("en céntimos y mayor que 0", () => {
    expect(reason(plan({ priceCents: 0 }))).toBe("price");
    expect(reason(plan({ priceCents: 49.9 }))).toBe("price");
  });
});

describe("HU-26: aplica a ciertas comunidades", () => {
  test("al menos una y solo del club", () => {
    expect(reason(plan({ communityIds: [] }))).toBe("communities");
    expect(reason(plan({ communityIds: ["de-otro-club"] }))).toBe("communities");
    expect(
      validatePlan(plan({ communityIds: ["amateur", "amateur"] }), CLUB_COMMUNITIES).communityIds,
    ).toEqual(["amateur"]);
  });
});
