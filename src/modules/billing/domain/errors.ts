/** The subscription changed since the form was loaded (double click, two tabs). */
export class StaleSubscriptionError extends Error {
  constructor(readonly clubId: string) {
    super(`Subscription of club ${clubId} changed since it was read`);
    this.name = "StaleSubscriptionError";
  }
}
