import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/unit/**/*.test.js", "tests/security/**/*.test.js"],
    exclude: ["tests/integration.test.js", "tests/schema-v2.test.js"],
    setupFiles: ["./tests/vitest.setup.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/utils/**",
        "src/middleware/security.js",
        "src/middleware/csrf.js",
        "src/middleware/ownership.js",
        "src/middleware/permissions.js",
        "src/services/subscriptionService.js"
      ]
    }
  }
});
