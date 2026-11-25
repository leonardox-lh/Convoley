import { InvalidPlanError } from "./errors";

export const PLAN_NAME_MAX_LENGTH = 60;
export const MAX_PLAN_CREDITS = 100;
export const MAX_PLAN_VALIDITY_DAYS = 366;

export interface PlanInput {
  name: string;
  priceCents: number;
  /** Dates included; null = unlimited while the plan lasts (a monthly fee). */
  creditCount: number | null;
  /** Days from payment; null = no expiry. */
  validityDays: number | null;
  communityIds: string[];
}

const inRange = (value: number, max: number) =>
  Number.isInteger(value) && value > 0 && value <= max;

/**
 * HU-26: a plan has a name, a price, a number of dates and/or a validity in days, and the
 * club communities where it can be used (at least one).
 */
export function validatePlan(input: PlanInput, clubCommunityIds: string[]): PlanInput {
  const name = input.name.trim();
  if (!name || name.length > PLAN_NAME_MAX_LENGTH) throw new InvalidPlanError("name");
  if (!Number.isInteger(input.priceCents) || input.priceCents <= 0) {
    throw new InvalidPlanError("price");
  }
  const { creditCount, validityDays } = input;
  if (creditCount === null && validityDays === null) throw new InvalidPlanError("terms");
  if (creditCount !== null && !inRange(creditCount, MAX_PLAN_CREDITS)) {
    throw new InvalidPlanError("terms");
  }
  if (validityDays !== null && !inRange(validityDays, MAX_PLAN_VALIDITY_DAYS)) {
    throw new InvalidPlanError("terms");
  }
  const communityIds = [...new Set(input.communityIds)];
  if (communityIds.length === 0 || communityIds.some((id) => !clubCommunityIds.includes(id))) {
    throw new InvalidPlanError("communities");
  }
  return { name, priceCents: input.priceCents, creditCount, validityDays, communityIds };
}
