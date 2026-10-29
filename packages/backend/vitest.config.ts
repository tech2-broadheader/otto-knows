import { defineConfig } from "vitest/config";

/** convex-test runs functions in the edge runtime, like Convex's own V8 isolate. */
export default defineConfig({
  test: {
    include: ["convex/**/*.test.ts"],
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
  },
});
