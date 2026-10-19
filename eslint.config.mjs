import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent tooling, not app source. Git worktrees live here and each one is a
    // full copy of the repo, so without this `npm run lint` reports thousands of
    // problems from abandoned branches and stops being usable as a gate.
    ".claude/**",
    // Scroll-Craft is vendored intact; lint app-owned code, not upstream files.
    ".agents/skills/scroll-craft/**",
    // Velite's output, and the email template bundled there by
    // tests/newsletter-edicion.test.ts: generated, not written.
    ".velite/**",
  ]),
]);

export default eslintConfig;
