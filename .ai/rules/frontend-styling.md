# Frontend Styling, `spartan/ui` & CSP Rules

> Applies to `src/styles.css`, `src/styles/*.css`, component `*.css` files, and `libs/ui/*`.

---

## 1. Three-Layer Styling Architecture (`ADR-0022`)

1. **Layer 1 — Behavioral & Variant Primitives (`libs/ui/*` + `shared/components/*`)**:
   - Headless accessible primitives come from `@spartan-ng/brain` (`Brn*`); styled presentation directives live in `libs/ui/*` (`@spartan-ng/helm/*`).
   - Whenever cross-component reuse involves **variants, DOM structure, or ARIA behavior** (buttons, badges, comboboxes, money displays, empty states), encapsulate it as an Angular component or directive—never copy-pasted CSS classes.
2. **Layer 2 — Shared Semantic Surfaces (`src/styles/components.css` in `@layer components`)**:
   - Cross-component visual/layout idioms use prefixed `.fl-*` classes (`.fl-standalone-shell`, `.fl-page`, `.fl-page-header`, `.fl-alert-error`, `.fl-banner-notice`, `.fl-dialog-*`, `.fl-field*`, `.fl-role-radio`, `.fl-subtle-box`, `.fl-tabular`) imported **once** into `src/styles.css` inside `@layer components`.
   - Keep `src/styles/components.css` focused (~15–30 genuine cross-cutting layout/financial patterns) consuming `:root` OKLCH `var(--*)` tokens so utilities in `@layer utilities` can still override one-off spacing without `!important`.
3. **Layer 3 — Component-Scoped Semantic CSS (`<name>.css`)**:
   - Author component-specific layout and states in `<name>.css` with clean semantic class names (avoid verbose BEM `__`/`--` specificity chains).
   - Use modern standard CSS: `:host { display: block }`, CSS Grid/Flexbox, native `&` nesting, `:not()`/`:where()` to avoid overmatching, `@container` queries for container-aware components, `font-variant-numeric: tabular-nums` on financial figures, and HomeHarmony's OKLCH custom properties (`var(--card)`, `var(--border)`, `var(--primary)`, `var(--muted-foreground)`, `var(--destructive)`).

---

## 2. Strict CSS Prohibitions

- **No Shared `.css` `@import` Inside Component `styleUrl`**: Never `@import` shared stylesheets inside multiple component `.css` files—Angular encapsulates and duplicates the imported rules once per component in the JS bundle.
- **No `@reference` + `@apply` Soup in Component CSS**: Write native CSS + `var(--*)` inside `<name>.css`; reserve inline Tailwind utilities in `.html` for `spartan/ui` `hlm` host tweaks or trivial 1–2 class layout glue.
- **No `:host-context()`**: Chromium-only non-standard selector unsupported in Firefox/Safari; theme strictly through inherited CSS custom properties (`:root[data-theme=...]` and `:root.dark`).
- **No Unlayered Global `*` Resets**: Keep base resets strictly inside `@layer base` in `src/styles.css`.

---

## 3. CloudFront CSP & Theme Governance (`ADR-0021`)

- **Strict CSP Compliance**: All styles, scripts, and fonts must work under `FamilyLedgerSecurityHeadersPolicy` (`script-src 'self'`, `style-src 'self' 'unsafe-inline'`, `frame-ancestors 'none'`). External script, stylesheet, or font CDNs (e.g., Google Fonts) are strictly forbidden.
- **Locked OKLCH Themes**: Do not alter the 4 approved OKLCH theme palettes (`heritage-forest`, `private-navy`, `slate`, `zinc`) in `src/styles.css` without explicit human approval.
