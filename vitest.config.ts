import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "scripts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["lib/**/*.{ts,tsx}"],
      // Trip-wire only. The quality claim is the named outcome assertions in
      // the tests, not this number. See docs/superpowers/specs/test-plan-20260901.md.
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
      },
    },
  },
});
