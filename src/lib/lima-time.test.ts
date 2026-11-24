import { describe, expect, it } from "vitest";
import { limaDateTimeToUtc, todayInLima } from "./lima-time";

describe("HU-04: hora de Lima", () => {
  it("HU-04: 2026-12-05 19:00 en Lima es 2026-12-06T00:00Z", () => {
    expect(limaDateTimeToUtc("2026-12-05", "19:00").toISOString()).toBe("2026-12-06T00:00:00.000Z");
  });

  it("HU-04: todayInLima usa el dia de Lima, no el de UTC", () => {
    expect(todayInLima(new Date("2026-12-06T02:00:00Z"))).toBe("2026-12-05");
  });
});
