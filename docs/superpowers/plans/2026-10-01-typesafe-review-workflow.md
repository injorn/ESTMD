# TypeSafe review workflow

Goal: finish CRUD criteria against matrix v3 and let estimators review historical baseline labels inside the app.

Design: CRUD activity 1.1–1.3 uses matrix v3's semantic complexity legend across all actions, including import. It has its own version and source snapshot, never maps legacy Add/Search codes directly. The highest factor wins, missing facts require review. Historical cases freeze text, criteria, quantities and rates; review changes only the evaluation dataset. Every review records actor, note and time, with optimistic concurrency. Viewers can read but cannot capture or review. No external API calls.

- [x] Test CRUD semantics, missing inputs, imported-case snapshots, review permissions, stale revisions and estimate isolation.
- [x] Implement matrix-v3 CRUD criteria and render their normalized definitions on the criteria page.
- [x] Add evaluation case/review tables and service; capture cases without duplicating unchanged snapshots.
- [x] Add review screen and authenticated JSON export compatible with the evaluator.
- [x] Verify backend tests, typecheck, lint, migration and UI states.

QA: synthetic local SQLite database; captured two examples, reviewed one as M, excluded one for missing information, repeated capture without duplication, downloaded one reviewed example. Original estimate levels stayed L/M. Mobile content width equaled viewport width. No console errors. No real examples were marked as reviewed by the agent.
