---
name: angular-patterns
description: >-
  Use when designing, implementing, or refactoring Angular bounded-context slices,
  pages, components, dialogs, stores, API clients, or semantic CSS in frontend-web/.
  Enforces ADR-0021 and ADR-0022 (bounded-context DAG, suffixless role folders,
  mandatory UI Mock Approval Gate, @spartan-ng/mcp, and 3-layer OKLCH CSS).
---

# Angular Bounded-Context & Styling Patterns

Procedural workflow for building and refactoring `frontend-web/`. Applies [`frontend-angular.md`](../../rules/frontend-angular.md) and [`frontend-styling.md`](../../rules/frontend-styling.md) without duplicating them.

---

## 1. Pre-Implementation Checks

1. **Consult Live Primitives & Platform Guidance**:
   - Inspect `@spartan-ng/mcp` (and existing `libs/ui/*` exports) before adding or customizing `Brn*` / `Hlm*` components.
   - Consult `modern-web-guidance` when implementing web platform UI patterns (dialogs, popovers, tables, forms, responsive container queries, accessibility).
2. **Mandatory UI Mock Approval Gate**:
   - Before writing Angular templates for any **new** screen, form, dialog, or workspace view, present an interactive UI mockup (using the approved OKLCH theme tokens from `src/styles.css`) for human review. Proceed only after approval. *(Pure internal refactors that preserve existing approved UI layout do not require a new mock.)*
3. **Bounded-Context & Role-Folder Placement**:
   - Map the task to its owning DDD Bounded Context under `src/app/features/<context>/` (or `shared/` only if domain-agnostic / shared across 2+ contexts).
   - Place every suffixless file inside its exact role directory (`pages/`, `components/`, `services/`, `stores/`, `guards/`, `interceptors/`, `pipes/`, `directives/`, `models/`, `utils/`) with zero empty directories.

---

## 2. Implementation Idioms

- **Multi-File Component Anatomy (`<name>/{<name>.ts, .html, .css, .spec.ts}`)**:
  - `<name>.ts`: `@Component({ selector: 'app-...', changeDetection: ChangeDetectionStrategy.OnPush, templateUrl: './<name>.html', styleUrl: './<name>.css' })`. Keep signals/computed state declarative; prevent race conditions on workspace switch via monotonic request sequence counters and `WorkspaceStore.switchVersion()`.
  - `<name>.html`: Semantic structure with native `@if` / `@for`, ARIA attributes (`role="dialog"`, `aria-modal="true"`, `role="alert"`), localized `'key' | t` copy in both `messages-en.ts` and `messages-ru.ts`, and `spartan/ui` `hlm*` primitives.
  - `<name>.css`: `:host { display: block }` + semantic classes using OKLCH `var(--*)` tokens; reuse `.fl-*` surface classes from `src/styles/components.css` rather than duplicating dialog/page/banner chrome.
- **Anti-Corruption Layer**:
  - Match Rust backend request/response payloads 1:1 in `features/<context>/models/<context>-dto.ts`.
  - Keep HTTP calls in `features/<context>/services/<context>-api.ts` using `APP_CONFIG.apiUrl`.

---

## 3. Verification Sequence

1. Add/update Vitest specs per [`angular-testing`](../angular-testing/SKILL.md).
2. Run all frontend gates:
   ```bash
   pnpm lint
   pnpm test
   pnpm build
   ```
3. Run `code-review` before concluding.
