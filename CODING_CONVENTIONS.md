# CODING_CONVENTIONS.md — House Style
> Reusable across projects. Lives in the **repo root** so BMAD's Dev and QA agents read it. `CLAUDE.md` is the policy; this is the detailed style. When they ever disagree, `CLAUDE.md` wins. Keep this file mostly unchanged between projects — it's your standard.

---

## 1. Language / TypeScript
- TypeScript everywhere, `strict: true`. No `any` without a `// reason:` comment.
- Explicit types on function boundaries (params + return). Let inference handle locals.
- Prefer `type` for unions/shapes, `interface` only when you need declaration merging.
- Derive types from Zod schemas with `z.infer` — never hand-maintain a type that duplicates a schema.
- No non-null assertions (`!`) unless guarded by a check above.

## 2. Naming
- Files & folders: `kebab-case` (`user-profile.tsx`, `packages/schemas/routine-schema.ts`).
- React components: `PascalCase` (`UserCard`). Hooks: `useThing`.
- Variables / functions: `camelCase`. Constants: `UPPER_SNAKE_CASE`.
- Booleans read as questions: `isLoading`, `hasAccess`, `canEdit`.
- Zod schemas end in `Schema` (`RoutineSchema`); inferred type drops it (`type Routine = z.infer<typeof RoutineSchema>`).
- Event handlers: `handleX` (definition) / `onX` (prop).
- Avoid abbreviations except well-known ones (`id`, `url`, `db`).

## 3. File & folder organization
- Group by **feature/domain** once a feature grows; shared primitives go in `/packages/core`, web UI primitives in `/apps/web/components/shared`.
- One primary export per file; co-locate small helpers used only by that file.
- Shared data shapes live **only** in `/packages/schemas`. Server-only code lives in the web app's `/server` and is never imported by client/mobile components.

## 4. Imports
- Absolute imports via the `@/` alias (or workspace package names like `@otto/schemas`), not deep relative paths (`../../../`).
- Order: external packages → workspace/`@/` internal → relative → styles. No unused imports.

## 5. Functions & control flow
- Small, single-purpose functions. Prefer early returns over nested `if`.
- Max ~3 levels of nesting; extract a helper beyond that.
- Pure where possible; isolate side effects.

## 6. Error handling
- Validate all external input (form data, request bodies, params, webhooks, connector payloads) with Zod **at the boundary**.
- No silent `catch {}`. Either handle it or rethrow a typed error.
- User-facing messages are friendly and generic; logs carry the detail. Never leak stack traces or secrets to the client.

## 7. API conventions
- Consistent response envelope: success `{ data: T }`, failure `{ error: { code, message } }`. Frontend handles both shapes the same way everywhere.
- Correct status codes (400 validation, 401 auth, 403 forbidden, 404 missing, 409 conflict, 500 unexpected).
- Endpoints/actions validate input against the shared schema before doing work.
- No business logic in route handlers — delegate to `/server`.

## 8. Components (frontend)
- **Web:** Server Components by default; add `"use client"` only when you need state/effects/interactivity.
- **Mobile (React Native + Expo):** function components with hooks; styling via NativeWind; keep navigation in the router layer, screens thin.
- Props are fully typed; no `any`. No business/data logic inside presentational components — push it to hooks, the shared core, or the server.
- Every async UI has explicit loading and error states. No blank screens. Mobile screens handle offline / local-first state explicitly.
- Forms: React Hook Form + the shared Zod schema via the resolver.

## 9. Styling
- Tailwind utility classes (web) / NativeWind (mobile); no inline styles unless dynamic. Pull colors/spacing from the design tokens, not magic hex values.
- Mobile-first: base styles for small screens, scale up.
- Don't override shadcn / accessibility defaults.

## 10. Accessibility (non-negotiable)
- Semantic markup; one `<h1>` per web page; logical heading order. On mobile, set accessibility labels/roles.
- Every input has a label; every image has `alt` / `accessibilityLabel`; interactive elements are keyboard- and screen-reader-usable with visible focus.

## 11. Comments & docs
- Comments explain **why**, not what. Delete commented-out code — git has the history.
- JSDoc on exported/shared functions and non-obvious types.

## 12. Tests
- Test files next to source or under `/tests`, named `*.test.ts(x)`.
- Arrange–Act–Assert. Test behavior and edge cases, not implementation details.
- Critical flows (auth, finance entry, routine optimizer confirm, connector sync) get an e2e test — Playwright (web) / Maestro or Detox (mobile), Tier 2+.
- TDD inside BMAD's Dev step: RED → GREEN → REFACTOR per acceptance criterion.

## 13. Git
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`, `style:`.
- One logical change per commit. Branch per story: `feature/{{story-id}}` (e.g. `feature/1-2-routine-anchors`).
- Never commit `.env`, `node_modules`, build output, or secrets.

## 14. Quick "never" list
No `any` (unjustified) · no string-built SQL · no hardcoded URLs/keys · no secrets in code · no unvalidated input trusted · no dead code or `console.log` in commits · no business logic in components or route handlers · no hand-rolled auth/crypto · no silent write-back to the user's calendar/finance/routine.
