export const TRIAL_DAYS = 30;
export const BILLING_PERIOD_DAYS = 30;
export const MONTHLY_PRICE_CENTS = 4900;
export const EXPIRY_WARNING_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SubscriptionRecord {
  clubId: string;
  trialEndsAt: Date;
  paidUntil: Date | null;
  suspendedAt: Date | null;
}

export type SubscriptionStatus = "trial" | "active" | "read_only" | "suspended";

export interface ClubAccess {
  status: SubscriptionStatus;
  /** Last moment the club can edit, trial or paid. */
  accessEndsAt: Date;
  /** Whole days left until `accessEndsAt` (0 once it passed). */
  daysLeft: number;
  /** True when the access ends soon and the organizer should be warned. */
  warn: boolean;
}

export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);

const accessEnd = (sub: SubscriptionRecord) =>
  sub.paidUntil && sub.paidUntil > sub.trialEndsAt ? sub.paidUntil : sub.trialEndsAt;

export function subscriptionState(sub: SubscriptionRecord, now: Date): ClubAccess {
  const accessEndsAt = accessEnd(sub);
  const daysLeft = Math.max(0, Math.ceil((accessEndsAt.getTime() - now.getTime()) / DAY_MS));
  const expired = accessEndsAt <= now;
  const status: SubscriptionStatus = sub.suspendedAt
    ? "suspended"
    : expired
      ? "read_only"
      : sub.paidUntil && sub.paidUntil > now
        ? "active"
        : "trial";
  const warn = !sub.suspendedAt && !expired && daysLeft <= EXPIRY_WARNING_DAYS;
  return { status, accessEndsAt, daysLeft, warn };
}

export const isWritable = (access: ClubAccess) =>
  access.status === "trial" || access.status === "active";

/** Paying before the access ends doesn't lose days: the new period starts where the old ends. */
export function nextPaidUntil(sub: SubscriptionRecord, now: Date): Date {
  const end = accessEnd(sub);
  return addDays(end > now ? end : now, BILLING_PERIOD_DAYS);
}
