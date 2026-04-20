import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["server/**/*.test.ts"],
    globalSetup: ["server/__tests__/globalSetup.ts"],
    forceExit: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "server/__tests__/"],
    },
  },
});
