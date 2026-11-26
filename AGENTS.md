# AGENTS.md — HomeHarmony (`frontend-web/` Angular Web SPA Entry Point)

> Entry point for AI agents working in `frontend-web/`.
> Also read cross-repo governance and domain rules in [`../documentation/AGENTS.md`](../documentation/AGENTS.md).

---

## 1. Reading Order

1. [`../documentation/AGENTS.md`](../documentation/AGENTS.md) — cross-repo governance, domain vocabulary, and AI-native platform invariants (`ADR-0018`)
2. [`../documentation/architecture/api-design.md`](../documentation/architecture/api-design.md) — REST routes, `IdToken` policy, `X-Family-Id` multi-family tenancy, and RFC 9457 error contracts
3. [`../documentation/decisions/0021-angular-spa-architecture-and-ui-library.md`](../documentation/decisions/0021-angular-spa-architecture-and-ui-library.md) — Angular SPA, `spartan/ui` 1.0 + Tailwind CSS, Cognito Hosted UI PKCE, EN/RU i18n, and strict CSP invariants
4. [`../documentation/roadmap/sprint-2/sprint_2_ui_plan.md`](../documentation/roadmap/sprint-2/sprint_2_ui_plan.md) — Sprint 2 vertical-slice UI execution plan and progress tracker
5. [`../documentation/domain/ubiquitous-language.md`](../documentation/domain/ubiquitous-language.md) — canonical domain vocabulary (`Family Workspace`, `HomeDisplayCurrency`, `PaymentAccount`, `TransactionAmendment`, etc.)

---

## 2. Architecture & Angular Coding Rules

- **Standalone, Signals & Zoneless**: Use standalone components/directives/pipes, Angular signals (`signal`, `computed`, `effect`) for local and store state, zoneless change detection, and `ChangeDetectionStrategy.OnPush` on all components.
- **Strict TypeScript**: `strict: true` and `strictTemplates: true` are enforced. Zero `any`, zero implicit `unknown` casts without type guards, and zero non-null assertions in production code unless guarded.
- **Anti-Corruption Layer (ACL)**: Backend wire DTOs live in `src/app/core/api/*.dto.ts` matching Rust DTOs 1:1; map across store/UI boundaries cleanly without leaking raw HTTP shapes into templates.
- **Zero Client-Side Float Monetary Math (`ADR-0005`, `ADR-0018`)**: Never perform monetary arithmetic in JavaScript `number` floats. Format backend-computed decimal strings/values for display only.
- **Multi-Family Isolation (`ADR-0011`)**: Attach `Authorization: Bearer <id_token>` (Cognito `IdToken` with `email_verified === true`) via the auth interceptor, and attach `X-Family-Id` via the family-header interceptor strictly on family-scoped endpoints (never on `GET /profile/families`, `POST /families`, or `POST /families/{id}/members`). Clear workspace-scoped UI state immediately on workspace switch.
- **Localized Errors Only (`api-design.md`)**: Every `application/problem+json` response must map through `src/app/core/errors/problem-details.ts` (`error.code` → `I18nService` EN/RU dictionary). Never show raw backend `detail` strings as primary user-facing UI text.
- **Strict CloudFront CSP Compliance**: Never load external scripts, stylesheets, or CDN fonts (e.g. Google Fonts). Keep all fonts/styles self-hosted or system-stack under `script-src 'self'` and `style-src 'self' 'unsafe-inline'`.
- **Zero Secrets**: Never commit real AWS account IDs, Cognito pool/client IDs, API Gateway URLs, or tokens in `src/environments/*`.

---

## 3. `spartan/ui` & Official Spartan MCP Server

- **Two-Layer Model**: Headless accessible primitives come from `@spartan-ng/brain` (`Brn*`); styled Tailwind presentation directives live in `libs/ui/*` (`@spartan-ng/helm/*`, configured in `components.json`) and are owned in-repo.
- **Official Spartan MCP (`@spartan-ng/mcp`)**: Configure in your IDE MCP config so AI agents inspect live `Brn*`/`Hlm*` APIs, blocks, and theming docs directly from `spartan.ng`:
  ```json
  {
    "mcpServers": {
      "spartan-ui": {
        "command": "npx",
        "args": ["-y", "@spartan-ng/mcp"]
      }
    }
  }
  ```

---

## 4. Mandatory UI Mock Approval Gate

- Before writing Angular component templates/layouts for any new screen, form, dialog, or workspace view, present an interactive UI mockup (using the approved OKLCH theme in `src/styles.css`) for human review and approval.
- Do not modify `src/styles.css` final theme tokens until the human selects a theme in the interactive OKLCH theme picker.

---

## 5. Mandatory Verification Gates

Before finishing any code change in `frontend-web/`:
```bash
pnpm lint
pnpm test
pnpm build
```
- `pnpm test` must run non-interactively (`ng test --watch=false`) and verify EN/RU translation key parity alongside error-mapping and component/store tests.
