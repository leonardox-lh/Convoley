import { db } from "@/lib/db";
import { makeCreatePlan, makeSetPlanActive } from "./application/plans";
import { clubCommunitiesAdapter } from "./infrastructure/clubs-adapter";
import { listClubPlans, prismaPlanRepository } from "./infrastructure/prisma-plan-repository";

const plans = prismaPlanRepository(db);

// ─── Plans (HU-26) ───
export const createPlan = makeCreatePlan({ plans, communities: clubCommunitiesAdapter });
export const setPlanActive = makeSetPlanActive({ plans });
export const listPlans = (clubId: string, options: { onlyActive: boolean }) =>
  listClubPlans(db, clubId, options);
export type { StoredPlan as Plan } from "./application/ports";
export { MAX_PLAN_CREDITS, MAX_PLAN_VALIDITY_DAYS, PLAN_NAME_MAX_LENGTH } from "./domain/plan";
export { InvalidPlanError, PlanNotFoundError, type InvalidPlanReason } from "./domain/errors";
