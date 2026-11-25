import { describe, expect, test } from "vitest";
import { InvalidPlanError, PlanNotFoundError } from "../domain/errors";
import type { PlanInput } from "../domain/plan";
import type { PlanRepository, StoredPlan } from "./ports";
import { makeCreatePlan, makeSetPlanActive } from "./plans";

function fakePlans(initial: StoredPlan[] = []) {
  const rows = [...initial];
  const plans: PlanRepository = {
    create: async (clubId, plan) => {
      const id = `plan-${rows.length + 1}`;
      rows.push({ id, clubId, isActive: true, ...plan });
      return { id };
    },
    find: async (id) => rows.find((row) => row.id === id) ?? null,
    setActive: async (id, isActive) => {
      rows.find((row) => row.id === id)!.isActive = isActive;
    },
  };
  return { plans, rows };
}

const input: PlanInput = {
  name: "Mensualidad",
  priceCents: 12_000,
  creditCount: null,
  validityDays: 30,
  communityIds: ["amateur"],
};
const club = { id: "club-1", slug: "voley" };
const communities = { idsOf: async () => ["general", "amateur"] };

describe("HU-26: crear planes o paquetes", () => {
  test("guarda precio, vigencia y comunidades del plan", async () => {
    const { plans, rows } = fakePlans();
    await makeCreatePlan({ plans, communities })({ club, plan: input });
    expect(rows[0]).toMatchObject({ clubId: "club-1", ...input, isActive: true });
  });

  test("no acepta comunidades de otro club", async () => {
    const { plans, rows } = fakePlans();
    await expect(
      makeCreatePlan({ plans, communities })({ club, plan: { ...input, communityIds: ["ajena"] } }),
    ).rejects.toBeInstanceOf(InvalidPlanError);
    expect(rows).toHaveLength(0);
  });

  test("se desactiva sin editarlo, solo dentro del propio club", async () => {
    const { plans, rows } = fakePlans([
      { id: "plan-1", clubId: "club-1", isActive: true, ...input },
    ]);
    const setActive = makeSetPlanActive({ plans });
    await expect(
      setActive({ clubId: "otro", planId: "plan-1", isActive: false }),
    ).rejects.toBeInstanceOf(PlanNotFoundError);
    await setActive({ clubId: "club-1", planId: "plan-1", isActive: false });
    expect(rows[0]!.isActive).toBe(false);
  });
});
