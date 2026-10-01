import assert from 'node:assert/strict'
import { test } from 'node:test'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buildSummary } from '../src/lib/summary'
import { saveEffortCell, saveItemEvidence, changeDeliveryProfile, rebuildProjectMandays, updateGeneratedItem } from '../src/lib/effort-store'
import { buildWorkbook } from '../src/lib/excel'
import * as schema from '../src/lib/db/schema'
import { buildCalibrationReport } from '../src/lib/calibration'

// This test uses only a temporary database selected by DATABASE_PATH.
test('profiles preserve legacy totals, allow vendor effort without DEV, and separate evidence from cost', async () => {
  process.env.DATABASE_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'estmanday-profiles-')), 'test.db')
  const { db } = await import('../src/lib/db')
  const { getProjectDetail } = await import('../src/lib/queries')
  migrate(db, { migrationsFolder: './drizzle' })
  const sqlite = db.$client
  sqlite.exec(`INSERT INTO users(id,email,name,password_hash,role) VALUES(1,'profiles@test','Test','unused','admin');
    INSERT INTO roles(id,code,name,scope,ratio_of_dev,rate_per_md) VALUES(1,'PM','PM','phase',0.15,100),(2,'DEV','DEV','item',NULL,200);
    INSERT INTO projects(id,name,owner_id) VALUES(1,'Profiles',1),(2,'Other',1);
    INSERT INTO project_phases(id,project_id,name) VALUES(1,1,'Existing'),(2,1,'Vendor');
    INSERT INTO project_items(id,project_id,phase_id,detail) VALUES(1,1,1,'Code'),(2,1,2,'Governance');
    INSERT INTO project_roles(project_id,role_id,included) VALUES(1,1,1),(1,2,1);
    INSERT INTO project_item_mandays(item_id,role_id,manday) VALUES(1,2,20),(2,1,99);
    UPDATE project_item_mandays SET overridden=1 WHERE item_id=2;`)
  const detail = async () => (await getProjectDetail(1))!
  assert.equal(buildSummary(await detail()).totalManday, 23)
  const actor = { userId: 1, role: 'admin' as const }
  changeDeliveryProfile(db, actor, { projectId: 1, phaseId: 2, profile: 'vendor' })
  assert.equal((sqlite.prepare('SELECT manday FROM project_item_mandays WHERE item_id=2').get() as { manday: number }).manday, 99, 'Profile changes preserve old manual cells')
  saveEffortCell(db, actor, { projectId: 1, itemId: 2, roleId: 1, manday: 38, commercialManday: 50, actualManday: null, billable: false })
  saveItemEvidence(db, actor, { projectId: 1, itemId: 2, sourceReference: 'Tank eMOC!D43', baselineConfirmed: true, complexityFacts: 'Internal governance', countUnit: 'ต่อเดือน' })
  let summary = buildSummary(await detail())
  assert.equal(summary.totalManday, 61)
  assert.equal(summary.cost, 4300)
  assert.equal(summary.roles.find(r => r.code === 'PM')!.targetRatio, null)
  assert.equal(summary.phases[1].items[0].commercialByRole.get(1), 50)
  assert.equal(summary.phases[1].items[0].actualByRole.get(1), null)
  // Explicit effort replaces a phase ratio, including an explicit zero.
  saveEffortCell(db, actor, { projectId: 1, itemId: 1, roleId: 1, manday: 4, commercialManday: null, actualManday: 0, billable: true })
  summary = buildSummary(await detail())
  assert.equal(summary.totalManday, 62)
  assert.equal(summary.cost, 4400)
  assert.equal(summary.phases[0].derivedByRole.has(1), false)
  assert.equal(summary.phases[0].items[0].actualByRole.get(1), 0)
  rebuildProjectMandays(db, actor, 1, true)
  assert.equal((sqlite.prepare('SELECT manday FROM project_item_mandays WHERE item_id=2 AND role_id=1').get() as { manday: number }).manday, 38)
  // Restore explicit phase override after resetting matrix-backed phases.
  saveEffortCell(db, actor, { projectId: 1, itemId: 1, roleId: 1, manday: 4, commercialManday: null, actualManday: 0, billable: true })
  saveEffortCell(db, actor, { projectId: 1, itemId: 1, roleId: 2, manday: 20, commercialManday: null, actualManday: null, billable: true })
  summary = buildSummary(await detail())
  assert.throws(() => saveEffortCell(db, { ...actor, role: 'viewer' }, { projectId: 1, itemId: 1, roleId: 1, manday: 0, commercialManday: null, actualManday: null, billable: true }))
  assert.throws(() => saveEffortCell(db, actor, { projectId: 2, itemId: 1, roleId: 1, manday: 0, commercialManday: null, actualManday: null, billable: true }))
  assert.throws(() => saveEffortCell(db, actor, { projectId: 1, itemId: 1, roleId: 1, manday: -1, commercialManday: null, actualManday: null, billable: true }))
  const wb = await buildWorkbook(summary)
  const evidence = wb.getWorksheet('Effort Evidence')!
  assert.ok(evidence)
  assert.ok(evidence.getSheetValues().flat().includes(50))
  const main = wb.getWorksheet('PTTDigital_Manday')!
  const cost = main.getRows(1, main.rowCount)!.find(r => r.getCell(1).value === 'ค่าใช้จ่าย (บาท)')!
  assert.equal((cost.getCell(5).value as { result: number }).result, 400)
  assert.match((cost.getCell(5).value as { formula: string }).formula, /-/)
  const ExcelJS = (await import('exceljs')).default
  const reloaded = new ExcelJS.Workbook()
  await reloaded.xlsx.load(await wb.xlsx.writeBuffer())
  assert.equal(reloaded.getWorksheet('Effort Evidence')!.getCell('J4').value, 50)
  assert.throws(() => saveItemEvidence(db, actor, { projectId: 1, itemId: 1, sourceReference: '', baselineConfirmed: true, complexityFacts: '', countUnit: '' }))
  sqlite.exec(`INSERT INTO activities(id,code,name,count_unit) VALUES(1,'1.1','CRUD','ต่อหน้าจอ');
    UPDATE project_items SET activity_id=1,qty=2,source_reference='Source!F3',baseline_confirmed=1,complexity_facts='Existing CRUD' WHERE id=1;
    INSERT INTO matrix_cells(activity_id,role_id,complexity,manday) VALUES(1,2,'M',3);`)
  const report = buildCalibrationReport([await detail(), await detail()])
  assert.equal(report.samples.length, 1)
  assert.equal(report.samples[0].baseline, 20)
  assert.equal(report.samples[0].predicted, 6)
  assert.equal(report.groups[0].median, 10)
  assert.equal(report.groups[0].projectCount, 1)
  assert.equal(report.groups[0].signedBias, -14)
  assert.equal(report.groups[0].meanAbsoluteError, 14)
  updateGeneratedItem(db, actor, { projectId: 1, itemId: 1, detail: 'Code', qty: 4 })
  assert.equal(buildCalibrationReport([await detail()]).samples.length, 0, 'Regenerated quantity requires confirmation again')
  assert.equal((sqlite.prepare('SELECT manday FROM project_item_mandays WHERE item_id=1 AND role_id=2').get() as { manday: number }).manday, 20)
  saveItemEvidence(db, actor, { projectId: 1, itemId: 1, sourceReference: 'Source!F3', baselineConfirmed: true, complexityFacts: 'Existing CRUD', countUnit: '' })
  saveEffortCell(db, actor, { projectId: 1, itemId: 1, roleId: 2, manday: 21, commercialManday: null, actualManday: null, billable: true })
  assert.equal(buildCalibrationReport([await detail()]).samples.length, 0, 'Changing baseline requires confirmation again')
  sqlite.close()
})

test('additive migration retains effort and defaults old phases to legacy', () => {
  const sqlite = new Database(':memory:')
  const connection = drizzle(sqlite, { schema })
  migrate(connection, { migrationsFolder: './drizzle' })
  sqlite.exec(`INSERT INTO users(id,email,name,password_hash) VALUES(1,'migration@test','Test','unused');
    INSERT INTO projects(id,name,owner_id) VALUES(1,'Old',1);
    INSERT INTO project_phases(project_id,name) VALUES(1,'Old');`)
  assert.equal((sqlite.prepare('SELECT delivery_profile FROM project_phases').get() as { delivery_profile: string }).delivery_profile, 'legacy')
  sqlite.close()
})
