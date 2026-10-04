import assert from 'node:assert/strict'
import { test } from 'node:test'
import { reviewedCriterion, DIMENSIONS, NEW_ACTIVITIES, assessmentIsCurrent } from '../src/lib/estimation/catalog'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from '../src/lib/db/schema'
import { saveItemAssessment, saveProjectScope } from '../src/lib/scope-store'
import { buildWorkbook } from '../src/lib/excel'
import { buildSummary } from '../src/lib/summary'
import type { ProjectDetail } from '../src/lib/queries'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

test('scope and explicit assessment preserve prior MD, reject stale edits, and export confirmed criteria', async () => {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: './drizzle' })
  sqlite.exec(`INSERT INTO users(id,email,name,password_hash,role) VALUES(1,'scope@test','Test','unused','admin');
    INSERT INTO roles(id,code,name,scope) VALUES(1,'SA','SA','item'),(2,'DEV','Developer','item'),(3,'TESTER','Tester','item'),(4,'DEV_SR','Senior','item'),(5,'INFRA','Infrastructure','item'),(6,'BA','BA','item');
    INSERT INTO projects(id,name,owner_id) VALUES(1,'Scope',1),(2,'Other',1);
    INSERT INTO project_phases(id,project_id,name,delivery_profile) VALUES(1,1,'Build','self_dev'),(2,1,'Vendor','vendor');`)
  const { register } = require('./seed-work-scope.cjs')
  register(sqlite)
  const activityId = (sqlite.prepare('SELECT id FROM activities WHERE code=?').get('19.1') as { id: number }).id
  sqlite.prepare('INSERT INTO project_items(id,project_id,phase_id,activity_id,detail,qty) VALUES(1,1,1,?,\'Tune\',2),(2,1,2,?,\'Vendor\',1)').run(activityId, activityId)
  sqlite.exec(`INSERT INTO project_item_mandays(item_id,role_id,manday,overridden,commercial_manday,actual_manday) VALUES(1,2,99,1,120,80),(1,1,7,0,NULL,NULL),(2,2,40,0,NULL,NULL)`)
  sqlite.prepare('UPDATE matrix_cells SET manday=77 WHERE activity_id=? AND role_id=1 AND complexity=\'M\'').run(activityId)
  register(sqlite)
  assert.equal((sqlite.prepare('SELECT manday FROM matrix_cells WHERE activity_id=? AND role_id=1 AND complexity=\'M\'').get(activityId) as { manday: number }).manday, 77, 'Additive registration keeps customized standards')
  assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM activities').get() as { n: number }).n, 3)
  const actor = { userId: 1, role: 'admin' as const }
  const rows = DIMENSIONS.map(d => ({ dimension: d.no, status: d.no === 9 ? 'in_scope' as const : 'needs_info' as const, detail: d.no === 9 ? 'Query target < 2s' : '' }))
  saveProjectScope(db, actor, { projectId: 1, rows })
  saveProjectScope(db, actor, { projectId: 1, rows })
  assert.equal(db.select().from(schema.projectScopeDimensions).all().length, 11)
  assert.throws(() => saveProjectScope(db, { ...actor, role: 'viewer' }, { projectId: 1, rows }))
  assert.throws(() => saveProjectScope(db, actor, { projectId: 1, rows: rows.map(() => rows[0]) }))
  const input = { projectId: 1, itemId: 1, activityId, detail: 'Tune', qty: 2, level: 'M' as const, dimensions: [6, 9], evidence: 'Baseline 6s; query and index bottleneck', reason: '', applyLevel: false }
  saveItemAssessment(db, actor, input)
  assert.equal((sqlite.prepare('SELECT manday FROM project_item_mandays WHERE item_id=1 AND role_id=1').get() as { manday: number }).manday, 7)
  assert.throws(() => saveItemAssessment(db, actor, { ...input, projectId: 2 }))
  assert.throws(() => saveItemAssessment(db, { ...actor, role: 'viewer' }, input))
  assert.throws(() => saveItemAssessment(db, actor, { ...input, detail: 'Changed' }))
  assert.throws(() => saveItemAssessment(db, actor, { ...input, level: 'H', applyLevel: true }))
  assert.throws(() => saveItemAssessment(db, actor, { ...input, itemId: 2, detail: 'Vendor', qty: 1, applyLevel: true }))
  saveItemAssessment(db, actor, { ...input, level: 'H', reason: 'Multiple bottlenecks and load-sensitive changes', applyLevel: true })
  assert.equal((sqlite.prepare('SELECT manday FROM project_item_mandays WHERE item_id=1 AND role_id=1').get() as { manday: number }).manday, 4)
  assert.equal((sqlite.prepare('SELECT manday FROM project_item_mandays WHERE item_id=1 AND role_id=2').get() as { manday: number }).manday, 99)
  assert.equal((sqlite.prepare('SELECT manday FROM project_item_mandays WHERE item_id=2 AND role_id=2').get() as { manday: number }).manday, 40)
  assert.equal((sqlite.prepare('SELECT commercial_manday FROM project_item_mandays WHERE item_id=1 AND role_id=2').get() as { commercial_manday: number }).commercial_manday, 120)
  const project = db.select().from(schema.projects).get()!
  const roleRows = db.select().from(schema.roles).all()
  const detail = { project, phases: db.select().from(schema.projectPhases).all(), items: db.select().from(schema.projectItems).all(), roles: roleRows, activities: db.select().from(schema.activities).all(), matrixCells: db.select().from(schema.matrixCells).all(), mandays: db.select().from(schema.projectItemMandays).all(), projectRoles: roleRows.map(r => ({ id: r.id, projectId: 1, roleId: r.id, included: true, ratePerMd: null, resourceLabel: null, personName: null, sortOrder: 0 })), scopeDimensions: db.select().from(schema.projectScopeDimensions).all(), activityQty: new Map(), survey: null, stack: null, stackMultiplier: 1, effectiveMultiplier: 1, modifiers: [] } as ProjectDetail
  const summary = buildSummary(detail)
  const workbook = await buildWorkbook(summary)
  const scopeSheet = workbook.getWorksheet('Scope Dimensions')!
  assert.equal(scopeSheet.rowCount, 12)
  assert.equal(scopeSheet.getRow(10).getCell(3).value, 'มีงานในขอบเขต')
  const evidence = workbook.getWorksheet('Effort Evidence')!
  assert.match(String(evidence.getRow(2).getCell(16).value), /Technical Enhancement/)
  const saved = db.select().from(schema.projectItems).get()!.assessment!
  assert.equal(assessmentIsCurrent(saved, { detail: 'Tune', qty: 2, complexity: 'H', complexityFacts: saved.evidence }, '19.1'), true)
  assert.equal(assessmentIsCurrent(saved, { detail: 'Tune', qty: 2, complexity: 'H', complexityFacts: 'Evidence changed' }, '19.1'), false)
  assert.equal(evidence.getRow(2).getCell(4).value, saved.criterion)
  assert.doesNotMatch(JSON.stringify(workbook.getWorksheet('PTTDigital_Manday')!.getSheetValues()), /level-def-|reviewed-scope-/)
  sqlite.close()
})

test('reviewed scope has eleven dimensions and explicit new activity MD', () => {
  assert.equal(DIMENSIONS.length, 11)
  assert.equal(new Set(DIMENSIONS.map(d => d.no)).size, 11)
  assert.deepEqual(NEW_ACTIVITIES.map(a => a.totals), [[4, 8, 15], [3, 6, 10], [1, 2, 3]])
  assert.ok(reviewedCriterion('1.4')?.levels[2].length)
  assert.equal(reviewedCriterion('missing'), undefined)
  assert.ok(reviewedCriterion('19.1')?.assumptions)
})
