---
name: angular-testing
description: >-
  Use when writing, updating, or debugging Vitest unit and component integration
  tests in frontend-web/. Covers TestBed + HttpTestingController seams, real HTTP
  interceptor verification, 4-role RBAC matrices, RFC 9457 no-detail-leak checks,
  and EN/RU translation parity.
---

# Angular & Vitest Testing at Seams

Procedural testing guide for `frontend-web/` (`pnpm test` via `@angular/build:unit-test` + Vitest).

---

## 1. Three Frontend Test Seams

1. **Seam 1 — Pure `utils/` & `models/` Unit Tests (Zero `TestBed`)**:
   - Test PKCE S256 vectors, JWT `IdToken` validation (`token_use === 'id'`, `aud`, `exp`, `email_verified`), URL/invite parsers, route-scope classification, and `ProblemDetails` exhaustiveness across all backend `API_ERROR_CODES`.
   - Maintain the EN/RU dictionary parity test (`Object.keys(EN_MESSAGES).sort()` equals `Object.keys(RU_MESSAGES).sort()` with non-empty values).
2. **Seam 2 — `stores/`, `guards/`, & `interceptors/` Integration Tests**:
   - Wire `provideHttpClient(withInterceptors([...]))` + `provideHttpClientTesting()` (`HttpTestingController`).
   - Verify `Authorization: Bearer <id_token>`, `X-Family-Id` attachment on family-scoped endpoints vs omission on identity-only endpoints (`GET /profile/families`, `POST /families`, `POST /families/{id}/members`), single `401` refresh-and-retry, and `WorkspaceStore` isolation across `0`/`1`/`2+` families.
3. **Seam 3 — `pages/` & `components/` Behavioral Tests**:
   - Mount standalone components with real `I18nService`, `WorkspaceStore`, and `problemDetailsInterceptor` against `HttpTestingController`.
   - Assert observable DOM behavior (queries by role, label, `data-*` hooks, and localized copy) rather than private component fields.

---

## 2. Mandatory Security & Domain Assertions

Every feature/page/dialog test suite must verify:
- **Role Matrix (`Owner`, `Member`, `Child`, `Other`)**: Owner-only mutation controls are absent from the DOM for non-Owners; `Role::Child` restrictions hold; `PermissionChecklist` renders and submits permissions **strictly when `role === 'other'`**.
- **Workspace Switch & `410 FAMILY_DELETED`**: Switching `WorkspaceStore.selectFamily(...)` reloads scoped data without stale cross-family rows; `410 FAMILY_DELETED` / `403 USER_NOT_IN_FAMILY` evicts the workspace and shows recovery UI.
- **Zero Raw Backend `detail` Leak**: Flush RFC 9457 error fixtures containing a distinctive sentinel `detail` (e.g. `RAW_SQL_SECRET_TRACE`) and assert `expect(el.textContent).not.toContain('RAW_SQL_SECRET_TRACE')` alongside the localized `errors.<CODE>` alert.
- **Clean HTTP Verification**: Always call `httpTesting.verify()` in `afterEach` and clear `localStorage` / `sessionStorage` in `beforeEach`.
