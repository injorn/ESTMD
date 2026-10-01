# Historical matrix profiles

User approved the recommendations on 2026-10-01 and requested a separate branch for program changes. Branch: `codex/historical-matrix-profiles`. Existing uncommitted work is preserved.

## Accepted behavior

Delivery profile belongs to a phase/work package: legacy (existing calculation), self development, SAP, vendor governance, migration/rollout. Mixed projects can combine them. Legacy is the migration default so saved estimates retain their result. Self development uses the existing matrix and role scopes; other profiles use explicit role effort and never derive PM/BA/SA/Tester from generic DEV. Switching profile refreshes non-overridden matrix cells while preserving explicit overrides. Recompute resets only matrix-backed phases, leaving direct effort intact.

Each saved role effort cell has baseline MD, nullable commercial MD, nullable actual MD and billable status. Baseline is the existing manday value; the other measures never drive estimation totals. Null means unknown and zero means recorded zero. Non-billable baseline remains in effort totals but contributes no cost. New explicit phase-scoped effort replaces the ratio; legacy ignored overrides retain their old behavior until explicitly reconfirmed. Explicit phase-scoped overrides replace the ratio for that role and phase, rather than adding to it. Ratio targets only apply to matrix-backed phases; mixed-profile projects do not show a misleading global target.

Each item can retain source reference, baseline confirmation, complexity facts and a custom count unit for direct packages. Manual MD is total package effort, independent of quantity; matrix MD is computed per activity count unit. Source notes can identify workbook/sheet/range; no automatic Excel import or inference of missing role labels. Additional joint/platform roles are provided with zero default rates requiring a user-supplied rate; missing billable rates are visibly flagged.

The summary and Excel share one calculation. Excel exports an Effort Evidence sheet retaining profile, unit, qty, level, source, confirmation, baseline/commercial/actual and billable status. Mixed ratio and missing evidence warnings appear on screen and in export. A matrix methodology page explains profiles, activity bundles versus components, historical source problems and calibration prerequisites. No unsupported L/M/H rates or multipliers are introduced.

## Verification

Integration tests with migrated temporary SQLite cover default legacy compatibility, direct vendor PM with no DEV, mixed phases, explicit phase overrides without duplicate ratio, non-billable cost, null versus zero evidence, invalid/cross-project writes, direct effort surviving resets and stack changes. Excel reload tests validate evidence and cost formulas. Run existing upgrade/AI tests, typecheck, targeted lint and production build. UI check uses synthetic test data, never overwrites historical estimates.

## Tradeoffs

Profiles route estimation methods rather than guessing separate rate matrices from aggregate project totals. All activities remain shared; the current rates remain unchanged until confirmed per-unit examples support calibration. Explicit direct effort requires a person to provide MD. TypeSafe remains the prepared optional semantic classifier; no API call or outbound workbook upload is added.
