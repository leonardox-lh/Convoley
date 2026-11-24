import type { AttemptLimiter } from "../application/ports";

// shortcut: counts live in this process's memory, so they reset on deploy and aren't shared
// between instances; move to Postgres or Redis if Railway runs more than one instance.
export function inMemoryAttemptLimiter(options: {
  maxAttempts: number;
  windowMs: number;
  now?: () => number;
}): AttemptLimiter {
  const now = options.now ?? Date.now;
  const windows = new Map<string, { startedAt: number; count: number }>();
  const activeWindow = (key: string) => {
    const window = windows.get(key);
    return window && now() - window.startedAt < options.windowMs ? window : undefined;
  };

  return {
    isBlocked: (key) => (activeWindow(key)?.count ?? 0) >= options.maxAttempts,
    record(key) {
      const window = activeWindow(key);
      if (window) window.count += 1;
      else windows.set(key, { startedAt: now(), count: 1 });
    },
    clear: (key) => void windows.delete(key),
  };
}
