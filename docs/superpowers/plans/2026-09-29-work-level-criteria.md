# Work Level Criteria Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a signed-in, read-only Standard Matrix page that explains Low, Medium, and High criteria by work type.

**Architecture:** Store the approved criteria in a typed static module and render it in a new App Router Server Component. Add a Matrix tab visible to all signed-in users; leave estimation data and calculations untouched.

**Tech Stack:** Next.js 16 App Router, React Server Components, TypeScript, Tailwind utility classes.

---

### Task 1: Add typed criteria content

**Files:**
- Create: `src/lib/work-level-criteria.ts`
- Reference: `C:\Source\ProjectStandard\Present version 4\data.js`

- [x] Copy the `LEVEL_DEF` and `WORK_TYPE_LEVELS` entries from the reference as exported `as const` arrays. Preserve Thai text, line breaks, ordering, topic headers (`num`), units, and all three level descriptions. Define the shape from the values: `LEVEL_DEF` entries have `num: number | null`, `topic: string`, and nullable `low`, `medium`, `high`; work type entries have `type`, `unit`, `low`, `medium`, and `high` strings.
- [x] Export the decision rule text: `ใช้ระดับสูงสุดของปัจจัยหลักเป็น Final Level เช่น Interface ที่มี Data Transformation ระดับ High ให้ถือเป็น High แม้จำนวน Field จะอยู่ระดับ Medium`.

### Task 2: Add the read-only route and Matrix tab

**Files:**
- Create: `src/app/(app)/matrix/criteria/page.tsx`
- Modify: `src/app/(app)/matrix/matrix-tabs.tsx`

- [x] Add a `criteria` tab with `href: '/matrix/criteria'` and label `เกณฑ์ระดับงาน`. Render that tab for every user; keep `tech-stacks` and `roles` restricted to admins and `activities` visible to all current Matrix users.
- [x] Create a Server Component page that calls `requireUser()`, renders `MatrixTabs` with `active="criteria"`, and imports the typed criteria arrays. Set metadata title to `เกณฑ์ระดับงาน | Standard Matrix`.
- [x] Render general Low/Medium/High descriptions as a three-column comparison, then render `LEVEL_DEF` grouped by its numbered topic headings with each item's Low/Medium/High descriptions. Render `WORK_TYPE_LEVELS` in a horizontal-overflow table with Work Type, Unit, Low, Medium, and High columns. Preserve multiline descriptions with `whitespace-pre-line`; finish with the decision rule callout. Use existing `card`, `bg-brand-soft`, `border-line`, and text utility classes.

### Task 3: Review the implementation against the approved scope

**Files:**
- Review: `src/lib/work-level-criteria.ts`
- Review: `src/app/(app)/matrix/criteria/page.tsx`
- Review: `src/app/(app)/matrix/matrix-tabs.tsx`

- [x] Inspect the final diff to confirm the route is read-only and authenticated, the criteria copy includes the reference content, and the navigation role filter exposes only the intended tabs. Confirm there are no edits to estimation formulas or database schema. Do not add or run automated tests because the user did not request testing.
