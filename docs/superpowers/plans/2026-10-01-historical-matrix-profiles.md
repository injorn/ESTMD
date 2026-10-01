# Historical Matrix Profiles Implementation Plan

**Goal:** Implement approved historical-estimate recommendations on `codex/historical-matrix-profiles` while preserving legacy calculations.

**Architecture:** Phase delivery profiles select matrix or explicit effort. Role cells retain separate MD measures and billing status. Summary and export use the same baseline calculation.

**Tech Stack:** Next.js 16.3.6, React 19, SQLite/Drizzle, Zod, ExcelJS, Node test runner.

Execution is inline in this session; no delegated agent work is required.

- [x] Write `scripts/test-delivery-profiles.ts` against real summary, migration and profile service. Verify red with `node --conditions=react-server --import tsx --test scripts/test-delivery-profiles.ts`.
- [x] Add `src/lib/delivery-profiles.ts`: typed profile metadata, matrix/direct routing and form validation. Extend `src/lib/db/schema.ts` for phase profile, item evidence and role cell measures; generate additive migration with `npx drizzle-kit generate`. Preserve default legacy and baseline values.
- [x] Add `src/lib/effort-store.ts` using transactional SQLite/Drizzle writes. Validate actor role and project/phase/item/role identity. Preserve manual values on direct reset/recompute. Test writes against in-memory migrated databases.
- [x] Update `src/lib/actions/project.ts`, `src/lib/queries.ts` and `src/lib/summary.ts`. Direct rows start at0 pending explicit effort, matrix rows retain rate behavior. Manual phase overrides replace fallback ratios; nullable actual/commercial values remain separate. Run profile tests until green.
- [x] Update phase/item forms and `src/components/summary-view.tsx` using existing design classes. Add accessible profile and evidence forms with save feedback, editing existing rows and read-only behavior. Use `useActionState` for validation and pending feedback.
- [x] Update `src/lib/excel.ts`: evidence sheet and baseline-only cost formulas, with non-billable effort removed from costs but retained in MD. Reload generated workbook in test and verify cells/formulas/results.
- [x] Add matrix methodology route and navigation, revise historical recommendation status and TypeSafe preparation docs. Record approved terms in `CONTEXT.md`.
- [x] Run `node --conditions=react-server --import tsx --test scripts/test-delivery-profiles.ts scripts/test-estimation-ai.ts scripts/test-evaluation-review.ts`, `npm run test:upgrade`, `npm run typecheck`, targeted ESLint and `npm run build`. Validate UI with synthetic database; verify source XLSX hashes remain unchanged and branch is correct.

No baseline workbook, existing estimate or current L/M/H rate is rewritten. Additive production migration requires a database backup before applying it; run tests first.

## Verification result

2026-10-01: 7 Node tests passed (including profile integration, legacy ignored overrides, calibration confirmation invalidation and Excel reload), upgrade test passed, typecheck and targeted lint passed, production build passed. Browser synthetic fixture saved38 baseline/50 commercial/null actual/non-billable and displayed38MD with0cost; calibration/export returned200. Source workbook SHA-256 checks unchanged. Reviewer finding on questionnaire regeneration fixed and regression verified. No merge or push.
