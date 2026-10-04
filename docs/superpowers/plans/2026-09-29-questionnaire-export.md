# Questionnaire Estimates in Excel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Include unanswered-to-line-item Questionnaire estimates in `PTTDigital_Manday`, exactly once, with totals matching the application summary.

**Architecture:** Add matrix cells to the project detail read model. Extend the shared summary builder to append virtual line items for positive Questionnaire answers without a matching saved item; calculate their role MD using the same matrix, multiplier, role scope, and project rate rules. Excel already builds rows and totals from this summary, so it continues to retain the separate `Questionnaire` sheet without database writes.

**Tech Stack:** Next.js 16 Server Components and route handler, TypeScript, Drizzle ORM, ExcelJS.

---

### Task 1: Provide matrix data to the shared summary builder

**Files:**
- Modify: `src/lib/queries.ts`

- [x] Add `matrixCells` to the existing `Promise.all` in `getProjectDetail` with a narrow select: `{ activityId: matrixCells.activityId, roleId: matrixCells.roleId, complexity: matrixCells.complexity, manday: matrixCells.manday }`. Return the result as `matrixCells` alongside activities and saved item mandays. Keep all current project and survey queries unchanged.

### Task 2: Add virtual Questionnaire rows to the shared summary

**Files:**
- Modify: `src/lib/summary.ts`
- Modify: `src/lib/excel.ts`

- [x] Import `buildMatrixLookup`, `standardManday`, `defaultItemDetail`, and `ONCE_PER_PROJECT_UNIT`. Build one lookup from `detail.matrixCells`.
- [x] Build saved `SummaryItem`s as today, then record saved `(activityId, complexity)` pairs. For each `detail.survey.topics` topic, iterate `L`, `M`, and `H`; read `${topic.activityId}_${complexity}` from `detail.activityQty`; ignore missing or non-positive answers and pairs already saved.
- [x] For each remaining answer, use `qty = activity.countUnit === ONCE_PER_PROJECT_UNIT ? 1 : answer.qty`; use trimmed `answer.detail` or `defaultItemDetail(activity.name, activity.countUnit, qty)`; set `activityLabel` to `${activity.code} ${activity.name}`, `countUnit` from the activity, `complexity` from the answer, and due date/deliverables to `null`.
- [x] Add the virtual item to the existing phase named `activity.groupName ?? activity.name`. If none exists, append an in-memory phase with a unique negative id, no derived MD yet, and an empty item array. Do not insert or update database rows.
- [x] For each included export role, set virtual item MD to zero for phase-scoped roles; otherwise call:

```ts
standardManday({
  matrix,
  activityId: activity.id,
  role,
  complexity,
  qty,
  stackMultiplier: detail.effectiveMultiplier,
})
```

- [x] After saved and virtual items are together, compute each phase's Developer MD, phase-scoped role MD, phase totals, role totals, cost, buffer, and item count through the existing summary path. Leave `buildSurvey` unchanged so the `Questionnaire` sheet still contains the raw answers.
- [x] Update the `buildWorkbook` comment to say `PTTDigital_Manday` gets estimate rows from the shared summary, including Questionnaire answers not yet saved as project line items. Keep the existing worksheet names, row layout, and formulas.

### Task 3: Review against the approved behavior

**Files:**
- Review: `src/lib/queries.ts`
- Review: `src/lib/summary.ts`
- Review: `src/lib/excel.ts`

- [x] Inspect the diff to confirm positive unanswered quantities are added once, saved matching line items remain authoritative, `ต่อโครงการ` uses quantity 1, role and buffer totals include virtual rows, `Questionnaire` remains present, and the export path performs no database writes. Do not add or run automated tests because the user did not request testing.
