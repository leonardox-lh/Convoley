import type { PrismaClient } from "@/generated/prisma/client";
import type { PlanRepository, StoredPlan } from "../application/ports";

const PLAN_FIELDS = {
  id: true,
  clubId: true,
  name: true,
  priceCents: true,
  creditCount: true,
  validityDays: true,
  communityIds: true,
  isActive: true,
} as const;

export function prismaPlanRepository(db: PrismaClient): PlanRepository {
  return {
    create: (clubId, plan) => db.plan.create({ data: { clubId, ...plan }, select: { id: true } }),
    find: (id) => db.plan.findUnique({ where: { id }, select: PLAN_FIELDS }),
    async setActive(id, isActive) {
      await db.plan.update({ where: { id }, data: { isActive } });
    },
  };
}

/** The club's plans, newest first; players only see the active ones. */
export function listClubPlans(
  db: PrismaClient,
  clubId: string,
  options: { onlyActive: boolean },
): Promise<StoredPlan[]> {
  return db.plan.findMany({
    where: { clubId, ...(options.onlyActive && { isActive: true }) },
    orderBy: { createdAt: "desc" },
    select: PLAN_FIELDS,
  });
}
