import { defineConfig } from "vitest/config";

// Integration tests need the Postgres from docker-compose.yml; run with `npm run test:integration`.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 120_000,
  },
});
