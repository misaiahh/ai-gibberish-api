import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["server/**/*.spec.ts"],
    sequence: {
      concurrent: false,
    },
    testTimeout: 60000,
  },
});
