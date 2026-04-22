import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["server/**/*.spec.ts"],
    globalSetup: ["server/__tests__/globalSetup.ts"],
    sequence: {
      concurrent: false,
    },
    testTimeout: 60000,
    forceExit: true,
  },
});
