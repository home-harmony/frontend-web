# Frontend (Angular) Rules

> Applies to all TypeScript and HTML files in `frontend-web/` (`src/app/{core,shared,features}`).

---

## 1. Progressive Bounded-Context Slices & Dependency DAG (`ADR-0022`)

- **Strict One-Way Import DAG** (enforced by `eslint.config.js`):
  `features/<bounded-context>` $\rightarrow$ `shared` $\rightarrow$ `core` $\rightarrow$ `libs/ui`.
  - `libs/ui/`: Owned `@spartan-ng/helm/*` primitives generated via `@spartan-ng/cli` (zero `src/app/` imports; keep untouched in Spartan's single-file format).
  - `src/app/core/`: App-wide infrastructure singletons only (`auth`, `config`, `context`, `errors`, `http`, `i18n`, `theme`). Never place feature-specific DTOs or API clients in `core/` (only cross-workspace `GET /profile/families` bootstrap and shared `Role`/`Permission` RBAC kernel types live in `core/context/`).
  - `src/app/shared/`: Cross-context UI shells, domain pickers (`CurrencyCombobox`, future `AccountSelect`, `MoneyDisplay`, `sdui/` card host), pipes, directives, and generic utilities. Zero imports from `features/`.
  - `src/app/features/<bounded-context>/`: Lazy-loaded DDD Bounded Contexts matching `documentation/domain/bounded-contexts.md` (`family`, `accounts`, `ledger`, `debt-planner`, `recurring`, `budget`, `goals`). Sibling features must **never** import directly from one another; promote shared read-only contracts/pickers to `shared/` or `core/context/models/`.

---

## 2. Suffixless Naming & Mandatory Role Folders (`ADR-0022`)

- **Angular 20+ Suffixless Convention**:
  - Omit `.component`, `.service`, `.store`, `.guard`, `.interceptor`, `.pipe`, and `.dto` dot-suffixes on filenames (`members-directory.ts`, `family-api.ts`, `workspace.ts`, `auth.ts`, `translate.ts`, `family-dto.ts`, `messages-en.ts`).
  - Omit `Component` suffixes on component class names (`MembersDirectory`, `AppShell`, `InviteMemberDialog`).
- **Mandatory Role Subdirectories**: Because filenames are suffixless, every file under `core/<domain>/`, `shared/`, and `features/<context>/` (except `<context>.routes.ts`) **must** live inside an explicit role folder so its architectural role is unmistakable from its path:
  - `pages/<name>/` — Routed smart components (inject stores/APIs, orchestrate navigation & mutations)
  - `components/<name>/` — Non-routed presentational/dialog UI components (prefer pure `input()`/`output()`/`model()`)
  - `services/` — `@Injectable` API clients & stateless services (`family-api.ts`, `workspace-api.ts`, `auth.ts`, `i18n.ts`, `theme.ts`)
  - `stores/` — Signal state stores (`workspace.ts`, `active-family.ts`)
  - `guards/` — Functional route guards (`CanActivateFn`)
  - `interceptors/` — Functional HTTP interceptors (`HttpInterceptorFn`)
  - `pipes/` & `directives/` — Standalone template pipes and attribute directives
  - `models/` — Pure TypeScript interfaces, wire DTOs, `InjectionToken`s, and constants (zero functions or side effects)
  - `utils/` — Pure stateless functions (parsers, type guards, route matchers, validators)
- **Pragmatic Scaling**: Create only the role folders that contain files. Empty directories are prohibited.

---

## 3. Component Layout, Signals & Clean Code

- **Two-Tier Component Files**:
  - **Non-trivial components, all `pages/`, forms, dialogs, tables, charts, and SDUI cards**: Mandatory multi-file folder `<name>/{<name>.ts, <name>.html, <name>.css, <name>.spec.ts}` (omit `<name>.css` only when zero component-scoped CSS is needed).
  - **Trivial stateless leaves** (`<= 40` combined TS + template lines and zero custom CSS): May stay single-file until complexity grows.
- **Standalone, Signals & Zoneless**: Use standalone declarations, `ChangeDetectionStrategy.OnPush` on every component, native control flow (`@if`, `@for`, `@switch`), and Angular signals (`signal`, `computed`, `effect`, `input`, `output`, `model`).
- **Strict TypeScript & SLAP**: `strict: true` and `strictTemplates: true` are enforced. Zero `any`, zero unguarded casts. Keep methods focused (`10–30` lines target, `40` ceiling, max nesting `2`).

---

## 4. Security, Multi-Family & Financial Integrity (`ADR-0005`, `ADR-0011`, `ADR-0018`, `ADR-0021`)

- **Zero Client-Side Float Monetary Math**: Never perform monetary arithmetic in JavaScript `number` floats. Render and format backend-computed decimal values only.
- **Token & Multi-Family Policy**: Attach Cognito `IdToken` (`Authorization: Bearer <id_token>`, `email_verified === true`) via `authInterceptor`. Attach `X-Family-Id` via `familyHeaderInterceptor` strictly on family-scoped endpoints (never on `GET /profile/families`, `POST /families`, or `POST /families/{id}/members`). Clear/reload scoped view state on `WorkspaceStore` switch or `410 FAMILY_DELETED`.
- **Localized RFC 9457 Errors Only**: Map every `application/problem+json` response via `error.code` $\rightarrow$ `I18nService` EN/RU dictionary. Never display raw backend `detail` strings as primary user-facing copy.
- **Zero Secrets**: Never commit real AWS account IDs, Cognito IDs, API Gateway URLs, or tokens in `src/environments/*`.
