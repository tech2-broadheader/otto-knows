import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Vitest config for @otto/web. Mirrors the `@/*` path alias from tsconfig.json
 * so unit tests can import server modules the same way route handlers do.
 * (`@otto/*` workspace packages resolve via node module resolution already.)
 */
export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: `${fileURLToPath(new URL("./src", import.meta.url))}/`,
      },
    ],
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
