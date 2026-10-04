# TypeSafe preparation

Goal: prepare versioned criteria, isolated AI/reviewer history, and offline evaluation without calling TypeSafe or changing saved estimates.

Design: LEVEL_DEF is the source for activity-coded AI criteria. Resolve overlapping numeric ranges into independent factors; the highest known factor wins. Missing factors and uncovered cases require review. WORK_TYPE_LEVELS remains a separate reference and is not mixed into this policy. Suggestions record input and criteria snapshots; confirmations are separate records. Evaluation uses frozen per-role matrix rates and multipliers, never current master data.

- [x] Write boundary, missing-data, stale-review, and MD evaluation tests; observe failure.
- [x] Implement versioned criteria and review validation.
- [x] Add suggestion/review tables and generate additive migration.
- [x] Export historical cases as unreviewed candidates and implement offline evaluation.
- [x] Verify tests, migration upgrade, typecheck, and lint; document commands and limitations.

Discovery: v3 CRUD activity codes combine actions while legacy criteria separate them. Gate these activities for review; map User Manual 15.1 explicitly to legacy 11.2. No new domain rules are invented for unsupported activities.
