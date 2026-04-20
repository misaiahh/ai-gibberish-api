import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Global ignores
  { ignores: ["node_modules/", ".output/", "pacts/", ".nitro/", "coverage/", "eslint.config.js"] },

  // Base JS rules
  js.configs.recommended,

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Project-wide settings
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
  },

    // TypeScript-specific rules
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // Server routes — allow console.log and other utilities
  {
    files: ["server/routes/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // Tests — allow assert, console, etc.
  {
    files: ["server/**/*.test.ts", "server/**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
