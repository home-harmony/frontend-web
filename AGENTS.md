# AGENTS.md — HomeHarmony (`frontend-web/` Angular Web SPA Entry Point)

> Entry point for AI agents working in `frontend-web/`.
> Also read cross-repo governance and domain rules in [`../documentation/AGENTS.md`](../documentation/AGENTS.md).

---

## 1. Reading Order

1. [`README.md`](./README.md) — developer commands, environment placeholders & deployment runbooks
2. [`.ai/rules/frontend-angular.md`](./.ai/rules/frontend-angular.md) — bounded-context DAG, suffixless role folders, multi-file components, signals, PKCE/`X-Family-Id`/RFC 9457 invariants (`ADR-0021`, `ADR-0022`)
3. [`.ai/rules/frontend-styling.md`](./.ai/rules/frontend-styling.md) — 3-layer styling (`spartan/ui` $\rightarrow$ `@layer components` `.fl-*` $\rightarrow$ component CSS + OKLCH `var(--*)`), strict CloudFront CSP
4. [`../documentation/architecture/api-design.md`](../documentation/architecture/api-design.md) — REST routes, `IdToken` policy, `X-Family-Id` tenancy & RFC 9457 error codes
5. [`../documentation/domain/ubiquitous-language.md`](../documentation/domain/ubiquitous-language.md) & [`bounded-contexts.md`](../documentation/domain/bounded-contexts.md) — canonical glossary & 9 DDD bounded contexts

---

## 2. Rules & Skills Index

### A. Modular Rules (Always Enforced)
- **Common Workspace Rules** (auto-included by [`../documentation/AGENTS.md`](../documentation/AGENTS.md)): [`../documentation/.ai/rules/common.md`](../documentation/.ai/rules/common.md)
@[Frontend Angular Rules](./.ai/rules/frontend-angular.md)
@[Frontend Styling & CSP Rules](./.ai/rules/frontend-styling.md)

### B. Skills (Auto-Discovered via `.agents/skills.json`)

| Scope | Task | Skill (`SKILL.md`) |
| :--- | :--- | :--- |
| **Frontend** | Design/refactor Angular bounded-context slices, suffixless role folders, UI mocks & 3-layer CSS | [`.ai/skills/angular-patterns/SKILL.md`](./.ai/skills/angular-patterns/SKILL.md) |
| **Frontend** | Write Vitest unit/store/component tests across 4 roles, interceptors, RFC 9457 & EN/RU parity | [`.ai/skills/angular-testing/SKILL.md`](./.ai/skills/angular-testing/SKILL.md) |
| **Cross-Repo** | Align domain glossary, research primary sources, or propose an ADR | [`../documentation/.ai/skills/domain-and-adr/SKILL.md`](../documentation/.ai/skills/domain-and-adr/SKILL.md) |
| **Cross-Repo** | Draft/review `Draft` specs or slice vertical roadmap epics | [`../documentation/.ai/skills/spec-driven-dev/SKILL.md`](../documentation/.ai/skills/spec-driven-dev/SKILL.md) |
| **Cross-Repo** | Post-coding 2-axis self-review (Standards vs. Spec) & One-Way Door PR check | [`../documentation/.ai/skills/code-review/SKILL.md`](../documentation/.ai/skills/code-review/SKILL.md) |

---

## 3. `spartan/ui` MCP & Mandatory UI Mock Approval Gate

- **Official Spartan MCP (`@spartan-ng/mcp`)**: Configure `npx -y @spartan-ng/mcp` in IDE MCP settings to query live `Brn*`/`Hlm*` APIs and theming docs from `spartan.ng`.
- **UI Mock Approval Gate**: Present an interactive UI mockup (using the approved OKLCH tokens in `src/styles.css`) for human approval before writing Angular templates for any new screen, form, or dialog.

---

## 4. Mandatory Verification Gates

Before finishing any code change in `frontend-web/`:
```bash
pnpm lint
pnpm test
pnpm build
```
- Run [`code-review`](../documentation/.ai/skills/code-review/SKILL.md) after every coding change.
- Put temporary scratch notes in `.ai/local/` (gitignored).
