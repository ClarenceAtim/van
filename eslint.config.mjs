// Fixed eslint.config.mjs for the neon-migration branch (PR #9, ClarenceAtim/van).
// Cause of the CI failure: eslint-config-next 16.4.3 ships native flat config,
// but the old config wrapped it in FlatCompat (legacy .eslintrc loader), which
// crashes with "TypeError: Converting circular structure to JSON".
// Fix per Next.js docs (nextjs.org/docs/app/api-reference/config/eslint):
// import the native exports instead of compat.extends(...).
// ESLint 9 stays as-is (eslint-config-next supports ESLint 9 and 10);
// @eslint/eslintrc can be dropped from devDependencies after this lands.

import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "test-results/**",
      "playwright-report/**",
    ],
  },
];

export default eslintConfig;
