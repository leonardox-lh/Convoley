import { PlanNotFoundError } from "../domain/errors";
import { validatePlan, type PlanInput } from "../domain/plan";
import type { ClubCommunities, PlanRepository } from "./ports";

/** HU-26: the organizer creates a plan, valid in some of the club's communities. */
export function makeCreatePlan(deps: { plans: PlanRepository; communities: ClubCommunities }) {
  return async (input: { club: { id: string; slug: string }; plan: PlanInput }) =>
    deps.plans.create(
      input.club.id,
      validatePlan(input.plan, await deps.communities.idsOf(input.club.slug)),
    );
}

/** Plans aren't edited (buyers keep their terms): they're only offered or withdrawn. */
export function makeSetPlanActive(deps: { plans: PlanRepository }) {
  return async (input: { clubId: string; planId: string; isActive: boolean }) => {
    const plan = await deps.plans.find(input.planId);
    if (!plan || plan.clubId !== input.clubId) throw new PlanNotFoundError(input.planId);
    await deps.plans.setActive(plan.id, input.isActive);
  };
}
