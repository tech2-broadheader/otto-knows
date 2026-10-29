/// <reference types="vite/client" />
// Every Convex module, for convex-test to load (tests are excluded).
export const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
