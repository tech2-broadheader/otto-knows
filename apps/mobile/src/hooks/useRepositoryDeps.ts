// Build the production RepositoryDeps once (encryption + consent loader + audit).
// Sensitive repositories need these; non-sensitive ones don't.
import { useMemo } from "react";
import { createRepositoryDeps, type RepositoryDeps } from "../data";

export function useRepositoryDeps(): RepositoryDeps {
  return useMemo(() => createRepositoryDeps(), []);
}
