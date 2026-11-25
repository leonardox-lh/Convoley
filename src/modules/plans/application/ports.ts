import type { PlanInput } from "../domain/plan";

declare const transactionBrand: unique symbol;
/** Handle of a running database transaction; only infrastructure looks inside it. */
export type TransactionContext = { readonly [transactionBrand]: true };

export interface TransactionRunner {
  run<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

export interface StoredPlan extends PlanInput {
  id: string;
  clubId: string;
  isActive: boolean;
}

export interface PlanRepository {
  create(clubId: string, plan: PlanInput): Promise<{ id: string }>;
  find(planId: string): Promise<StoredPlan | null>;
  setActive(planId: string, isActive: boolean): Promise<void>;
}

/** The club's communities (owned by `clubs`). */
export interface ClubCommunities {
  idsOf(clubSlug: string): Promise<string[]>;
}
