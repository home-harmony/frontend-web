# FamilyLedger Web SPA (`frontend-web/`)

Angular 22 standalone, zoneless, signal-driven web client for **HomeHarmony / FamilyLedger**, styled with `spartan/ui` (`lyra` primitives, `--radius: 0rem`) + Tailwind CSS v4 (4 live-switchable OKLCH themes × System/Light/Dark, EN/RU i18n, Cognito Hosted UI OAuth2 + PKCE).

## Prerequisites

- **Node.js `>= 22`**
- **`pnpm >= 12`** (`corepack enable` or npm global install)

Install dependencies:

```bash
pnpm install --frozen-lockfile
```

## Development Commands

```bash
pnpm start   # Start Angular dev server at http://localhost:4200
pnpm lint    # Run ESLint & Angular template checks
pnpm test    # Run Vitest unit & component test suite (18 files, 72 tests)
pnpm build   # Build production bundle -> dist/family-ledger-web/browser/
```

## Environment Configuration

Runtime endpoints live in:
- `src/environments/environment.ts` (used by `pnpm start`, local `http://localhost:4200`)
- `src/environments/environment.prod.ts` (swapped automatically by `pnpm build`)

Never commit live AWS account IDs, Cognito client IDs, or API Gateway invoke URLs into these files. Leave placeholders in Git and populate local values from your CloudFormation stack outputs before running `pnpm start` or `pnpm build`.

## AWS Deployment Instructions

- **Sprint 2 Only (`dev` stack, local dev vs live AWS, S3 + CloudFront deploy, and E2E/CSP smoke checklist)**:
  See [`../documentation/roadmap/sprint-2/aws-deployment-guide.md`](../documentation/roadmap/sprint-2/aws-deployment-guide.md) (§8).
- **Overall Full Product (all 3 SAM stacks, Aurora DSQL, Day-2 frontend/backend deploys, multi-environment `dev`/`staging`/`prod`, Sprints 3–7 growth, and teardown)**:
  See [`../documentation/architecture/aws-deployment-and-teardown.md`](../documentation/architecture/aws-deployment-and-teardown.md).
