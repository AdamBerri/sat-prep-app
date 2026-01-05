import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "convex/_generated/**",
      "public/sw.js",
    ],
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    rules: {
      // Downgrade to warnings for CI
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "off",
      "prefer-const": "warn",
      "no-case-declarations": "warn",
    },
  },
];
