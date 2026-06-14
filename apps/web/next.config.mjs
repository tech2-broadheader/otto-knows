import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source; let Next transpile them.
  transpilePackages: ["@otto/schemas", "@otto/types", "@otto/core"],
  // Pin the file-tracing root to this monorepo (a stray lockfile elsewhere on the
  // machine otherwise confuses Next's workspace-root inference).
  outputFileTracingRoot: path.join(__dirname, "../.."),
  eslint: {
    // Linting is run once at the workspace root (`pnpm lint`), not per-app during build.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
