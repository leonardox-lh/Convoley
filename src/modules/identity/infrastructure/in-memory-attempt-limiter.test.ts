import { describe, expect, it } from "vitest";
import { inMemoryAttemptLimiter } from "./in-memory-attempt-limiter";

const WINDOW_MS = 15 * 60 * 1000;

function recordTimes(limiter: { record(key: string): void }, key: string, times: number) {
  for (let i = 0; i < times; i++) limiter.record(key);
}

describe("inMemoryAttemptLimiter", () => {
  it("HU-01: bloquea después de 5 intentos", () => {
    const limiter = inMemoryAttemptLimiter({ maxAttempts: 5, windowMs: WINDOW_MS, now: () => 0 });
    recordTimes(limiter, "login:a", 4);
    expect(limiter.isBlocked("login:a")).toBe(false);
    limiter.record("login:a");
    expect(limiter.isBlocked("login:a")).toBe(true);
  });

  it("HU-01: cada clave cuenta por separado", () => {
    const limiter = inMemoryAttemptLimiter({ maxAttempts: 1, windowMs: WINDOW_MS, now: () => 0 });
    limiter.record("a");
    expect(limiter.isBlocked("a")).toBe(true);
    expect(limiter.isBlocked("b")).toBe(false);
  });

  it("HU-01: se reinicia al terminar la ventana", () => {
    let time = 0;
    const limiter = inMemoryAttemptLimiter({
      maxAttempts: 5,
      windowMs: WINDOW_MS,
      now: () => time,
    });
    recordTimes(limiter, "a", 5);
    time = WINDOW_MS - 1;
    expect(limiter.isBlocked("a")).toBe(true);
    time = WINDOW_MS;
    expect(limiter.isBlocked("a")).toBe(false);
  });

  it("HU-01: clear desbloquea la clave", () => {
    const limiter = inMemoryAttemptLimiter({ maxAttempts: 1, windowMs: WINDOW_MS, now: () => 0 });
    limiter.record("a");
    limiter.clear("a");
    expect(limiter.isBlocked("a")).toBe(false);
  });
});
