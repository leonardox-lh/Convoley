import type { SubscriptionRecord } from "../domain/subscription";

export interface SubscriptionRepository {
  /** Creates the subscription with the given trial end if the club has none yet. */
  ensure(clubId: string, trialEndsAt: Date): Promise<SubscriptionRecord>;
  listAll(): Promise<SubscriptionRecord[]>;
  /**
   * Moves `paidUntil` from `expectedPaidUntil` to `newPaidUntil` and stores the payment, in one
   * transaction. Returns false when `paidUntil` is no longer `expectedPaidUntil`.
   */
  recordPayment(input: {
    clubId: string;
    expectedPaidUntil: Date | null;
    newPaidUntil: Date;
    amountCents: number;
    recordedByUserId: string;
  }): Promise<boolean>;
  setSuspendedAt(clubId: string, suspendedAt: Date | null): Promise<void>;
}
