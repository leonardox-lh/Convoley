import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import boundaries from "eslint-plugin-boundaries";

// Packages that only infrastructure/ (and lib/) may touch: ORM and external SDKs.
const INFRASTRUCTURE_PACKAGES = [
  "prisma",
  "@prisma/*",
  "pg",
  "@aws-sdk/*",
  "mercadopago",
  "next-auth",
  "@auth/*",
];
const sameModule = { moduleName: "{{ from.element.captured.moduleName }}" };
const otherModuleApi = {
  type: "module",
  captured: { moduleName: "!{{ from.element.captured.moduleName }}" },
  fileInternalPath: "index.ts",
};

// Layer rules from CLAUDE.md / docs/ARQUITECTURA.md.
const architecture = {
  plugins: { boundaries },
  settings: {
    "import/resolver": { typescript: { alwaysTryTypes: true } },
    "boundaries/legacy-templates": false,
    // Most specific first: the first match classifies the file.
    "boundaries/elements": [
      { type: "domain", pattern: "modules/*/domain", capture: ["moduleName"] },
      { type: "application", pattern: "modules/*/application", capture: ["moduleName"] },
      { type: "infrastructure", pattern: "modules/*/infrastructure", capture: ["moduleName"] },
      { type: "module", pattern: "modules/*", capture: ["moduleName"] },
      { type: "app", pattern: "src/app" },
      { type: "components", pattern: "src/components" },
      { type: "lib", pattern: "src/lib" },
      { type: "generated", pattern: "src/generated" },
    ],
  },
  rules: {
    "boundaries/dependencies": [
      2,
      {
        default: "disallow",
        checkAllOrigins: true,
        policies: [
          // Rule 3: npm packages are fine by default; the layer rules below narrow this.
          { allow: { to: { module: { origin: ["external", "core"] } } } },
          // Rule 1: domain is pure TypeScript, only its own module's domain.
          {
            from: { element: { type: "domain" } },
            allow: { to: { element: { type: "domain", captured: sameModule } } },
            disallow: { to: { module: { origin: ["external", "core"] } } },
          },
          // Rule 2: application uses its domain and ports, never infrastructure;
          // other modules only through their public index.ts (ARQUITECTURA.md).
          {
            from: { element: { type: "application" } },
            allow: [
              { to: { element: { types: ["domain", "application"], captured: sameModule } } },
              { to: { element: otherModuleApi } },
            ],
          },
          // Rule 3: infrastructure implements the ports; other modules only via index.ts.
          {
            from: { element: { type: "infrastructure" } },
            allow: [
              {
                to: {
                  element: {
                    types: ["domain", "application", "infrastructure"],
                    captured: sameModule,
                  },
                },
              },
              { to: { element: { types: ["lib", "generated"] } } },
              { to: { element: otherModuleApi } },
            ],
          },
          // index.ts wires the module together.
          {
            from: { element: { type: "module" } },
            allow: [
              {
                to: {
                  element: {
                    types: ["domain", "application", "infrastructure"],
                    captured: sameModule,
                  },
                },
              },
              { to: { element: { type: "lib" } } },
            ],
          },
          // Rule 5: app/ only talks to modules through their public API.
          {
            from: { element: { type: "app" } },
            allow: [
              { to: { element: { types: ["app", "components", "lib"] } } },
              { to: { element: { type: "module", fileInternalPath: "index.ts" } } },
            ],
          },
          {
            from: { element: { type: "components" } },
            allow: { to: { element: { types: ["components", "lib"] } } },
          },
          {
            from: { element: { type: "lib" } },
            allow: { to: { element: { types: ["lib", "generated"] } } },
          },
          // Rule 3: ORM and SDKs only in infrastructure/ and lib/.
          {
            from: { element: { types: ["application", "module", "app", "components"] } },
            disallow: { to: { module: { origin: "external", source: INFRASTRUCTURE_PACKAGES } } },
          },
        ],
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}", "tests/fixtures/**/*.ts"],
    ...architecture,
  },
  // Tests may reach into any layer they test.
  {
    files: ["**/*.test.ts", "e2e/**"],
    rules: { "boundaries/dependencies": "off" },
  },
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
    "tests/fixtures/**",
  ]),
]);

export default eslintConfig;
