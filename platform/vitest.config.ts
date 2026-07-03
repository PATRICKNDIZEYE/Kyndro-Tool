import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["telemetry/tests/**/*.test.ts"],
  },
});
