import path from "node:path";
import { beforeAll, describe, expect, test } from "vitest";
import { ESLint } from "eslint";

const BASE = "tests/fixtures/boundaries/src";
let eslint: ESLint;

beforeAll(() => {
  eslint = new ESLint({ cwd: process.cwd(), ignore: false });
}, 60_000);

const cases: [string, string, boolean][] = [
  ["modules/alpha/domain/x.ts", "./entity", true],
  ["modules/alpha/domain/x.ts", "../infrastructure/repository", false],
  ["modules/alpha/domain/x.ts", "../application/use-case", false],
  ["modules/alpha/domain/x.ts", "zod", false],
  ["modules/alpha/domain/x.ts", "node:fs", false],
  ["modules/alpha/domain/x.ts", "../../beta", false],
  ["app/x.ts", "@prisma/client", false],
  ["app/x.ts", "next/navigation", true],
  ["app/x.ts", "../modules/alpha", true],
  ["app/x.ts", "../modules/alpha/domain/entity", false],
  ["modules/alpha/application/x.ts", "../domain/entity", true],
  ["modules/alpha/application/x.ts", "../infrastructure/repository", false],
  ["modules/alpha/application/x.ts", "@prisma/client", false],
  ["modules/alpha/application/x.ts", "@aws-sdk/client-s3", false],
  ["modules/alpha/application/x.ts", "@prisma/adapter-pg", false],
  ["modules/alpha/application/x.ts", "next-auth", false],
  ["app/x.ts", "pg", false],
  ["modules/alpha/application/x.ts", "../../beta", true],
  ["modules/alpha/application/x.ts", "../../beta/domain/entity", false],
  ["modules/alpha/infrastructure/x.ts", "@prisma/client", true],
  ["modules/alpha/infrastructure/x.ts", "../../beta", true],
  ["modules/alpha/infrastructure/x.ts", "../../beta/domain/entity", false],
  ["modules/alpha/x.ts", "./infrastructure/repository", true],
  ["components/x.ts", "../modules/alpha", false],
];

describe("HT-01: ESLint bloquea importaciones prohibidas", () => {
  test.each(cases)(
    "%s importa %s -> permitido: %s",
    async (from, spec, allowed) => {
      const [result] = await eslint.lintText(
        `import * as m from "${spec}";\nexport const v = m;\n`,
        {
          filePath: path.resolve(BASE, from),
        },
      );
      const violations = result.messages.filter((m) => m.ruleId?.startsWith("boundaries"));
      expect(violations.length === 0).toBe(allowed);
    },
    60_000,
  );
});
