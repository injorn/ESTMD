import assert from 'node:assert/strict'
import { test } from 'node:test'
import ExcelJS from 'exceljs'
import { readImportWorkbook } from '../src/lib/excel-import/workbook'
import { initialSheetIndex, mapSheetRows, suggestMapping } from '../src/lib/excel-import/model'
import { createImportedProject } from '../src/lib/excel-import/store'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buildSummary } from '../src/lib/summary'
import { buildWorkbook } from '../src/lib/excel'
import { boundedBody, importErrorResponse } from '../src/lib/excel-import/http'
import { saveItemEvidence, saveEffortCell } from '../src/lib/effort-store'

async function fixture() {
  const book = new ExcelJS.Workbook()
  const sheet = book.addWorksheet('รายการงาน')
  sheet.addRow(['Phase', 'Details', 'Qty', 'Deliverables', 'Due date', 'DEV MD'])
  sheet.addRow(['Auth', 'หน้าจอเข้าสู่ระบบ', 2, 'หน้า Login', new Date('2026-10-10T00:00:00Z'), 99])
  sheet.addRow([null, 'ค้นหาผู้ใช้', 3, 'หน้าค้นหา', null, 88])
  sheet.mergeCells('A2:A3')
  sheet.addRow(['Reports', 'รายงานยอดขาย', 1])
  sheet.addRow([null, null, 1])
  sheet.mergeCells('B4:B5')
  sheet.addRow([null, 'Total', null, null, null, { formula: 'SUM(F2:F5)', result: 187 }])
  sheet.addRow([null, 'จำนวนผิด', 'abc'])
  sheet.addRow([null, { formula: '"สูตรที่ไม่มีผล"' }, 1])
  sheet.addRow([null, { richText: [{ text: 'งาน' }, { text: 'ภาษาไทย' }] }, 0])
  sheet.addRow([null, { formula: '"ชื่อจากสูตร"', result: 'ชื่อจากสูตร' }, 1])
  book.addWorksheet('ซ่อน', { state: 'hidden' }).addRow(['Phase', 'Details'])
  const large = book.addWorksheet('เกินขนาด')
  large.getCell('A2001').value = 'Outside limit'
  const styled = book.addWorksheet('เว้นรูปแบบ')
  styled.addRow(['Phase', 'Details'])
  styled.addRow(['Style', 'รายการงานจริง'])
  styled.getCell('CC4000').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } }
  const horizontal = book.addWorksheet('รวมแนวนอน')
  horizontal.getCell('A2').value = 'รายละเอียดรวมหลายคอลัมน์'
  horizontal.mergeCells('A2:C2')
  return Buffer.from(await book.xlsx.writeBuffer())
}

test('reads Thai workbook, merges once, cached formulas, and exposes hidden/oversized sheets', async () => {
  const result = await readImportWorkbook(await fixture(), 'estimate.xlsx')
  assert.match(result.sha256, /^[a-f0-9]{64}$/)
  assert.equal(result.sheets[1].hidden, true)
  assert.equal(initialSheetIndex({ ...result, sheets: [result.sheets[1]] }), -1, 'Hidden sheet requires explicit user selection')
  assert.match(result.sheets[2].error!, /2,000/)
  assert.equal(result.sheets[3].error, undefined, 'Formatting outside table must not exclude useful data')
  assert.equal(result.sheets[3].rowCount, 2)
  assert.equal(mapSheetRows(result.sheets[4], { ...suggestMapping(result.sheets[4]), detailColumn: 2 })[0].detail, 'รายละเอียดรวมหลายคอลัมน์')
  assert.equal(result.sheets[0].rows[1].cells.find(c => c.column === 5)!.text, '2026-10-10')
  const rows = mapSheetRows(result.sheets[0], suggestMapping(result.sheets[0]))
  assert.equal(rows.find(r => r.sourceRow === 3)!.phase, 'Auth')
  assert.equal(rows.find(r => r.sourceRow === 2)!.qty, 2)
  assert.equal(rows.find(r => r.sourceRow === 2)!.detail, 'หน้าจอเข้าสู่ระบบ')
  assert.equal(rows.some(r => r.sourceRow === 5), false, 'Merged detail is not duplicated')
  assert.equal(rows.find(r => r.sourceRow === 6)!.selected, false, 'Total is excluded by default')
  assert.equal(rows.find(r => r.sourceRow === 6)!.qty, null, 'Explicitly mapped blank quantity is not invented')
  assert.equal(rows.find(r => r.sourceRow === 7)!.qty, null, 'Bad quantity must not become 1')
  assert.ok(rows.find(r => r.sourceRow === 7)!.warnings.length)
  assert.equal(rows.some(r => r.sourceRow === 8), false, 'Uncached formula is never imported as text')
  assert.equal(rows.find(r => r.sourceRow === 9)!.detail, 'งานภาษาไทย')
  assert.equal(rows.find(r => r.sourceRow === 9)!.qty, 0)
  assert.equal(rows.find(r => r.sourceRow === 10)!.detail, 'ชื่อจากสูตร')
  assert.ok(result.sheets[0].warnings.some(w => w.includes('B8')))
  assert.equal(rows.every(r => r.activityId === null && r.complexity === null), true)
  const restricted = mapSheetRows(result.sheets[0], { ...suggestMapping(result.sheets[0]), startRow: 3, endRow: 3 })
  assert.equal(restricted[0].phase, 'Auth', 'Phase survives a range starting inside a merged group')
})

test('rejects damaged, wrong extension and oversized uploads without partial parsing', async () => {
  await assert.rejects(readImportWorkbook(Buffer.from('not excel'), 'test.xlsx'), /Excel/)
  await assert.rejects(readImportWorkbook(await fixture(), 'test.xls'), /xlsx/)
  await assert.rejects(readImportWorkbook(Buffer.alloc(10 * 1024 * 1024 + 1), 'test.xlsx'), /10/)
})

test('bounds actual chunked request bytes and rejects missing body', async () => {
  const valid = new Request('http://localhost/import', { method: 'POST', body: 'small' })
  assert.equal((await boundedBody(valid, 5)).toString(), 'small')
  const overflow = new Request('http://localhost/import', { method: 'POST', body: 'too long', headers: { 'content-length': '1' } })
  await assert.rejects(boundedBody(overflow, 3), error => {
    assert.equal(importErrorResponse(error).status, 413)
    return true
  })
  await assert.rejects(boundedBody(new Request('http://localhost/import', { method: 'POST' }), 100))
})

test('creates mixed-profile draft atomically, calculates new Matrix MD and exports pending tasks with sources', async () => {
  process.env.DATABASE_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'estmanday-import-')), 'test.db')
  const { db } = await import('../src/lib/db')
  const { getProjectDetail } = await import('../src/lib/queries')
  migrate(db, { migrationsFolder: './drizzle' })
  const sql = db.$client
  sql.exec(`INSERT INTO users(id,email,name,password_hash,role) VALUES(1,'import@test','Test','unused','admin');
    INSERT INTO roles(id,code,name,scope,rate_per_md,stack_multiplied) VALUES(1,'DEV','DEV','item',200,1),(2,'PM','PM','phase',100,0);
    INSERT INTO tech_stacks(id,name,multiplier) VALUES(1,'Stack',1.5);
    INSERT INTO activities(id,code,name,count_unit) VALUES(1,'1.1','CRUD','ต่อหน้าจอ'),(2,'11','Once','ต่อโครงการ');
    INSERT INTO matrix_cells(activity_id,role_id,complexity,manday) VALUES(1,1,'H',5),(2,1,'L',2);`)
  const book = await readImportWorkbook(await fixture(), 'estimate.xlsx')
  const base = { name: 'นำเข้าเพื่อประเมินใหม่', code: 'TEST', techStackId: 1, fileName: book.fileName, sha256: book.sha256,
    sheetName: 'รายการงาน', profiles: { Auth: 'self_dev' as const, Vendor: 'vendor' as const },
    rows: [
      { sourceRow: 2, detailColumn: 2, phase: 'Auth', detail: 'หน้าจอเข้าสู่ระบบ', qty: 2, deliverables: 'หน้า Login', dueDatePlan: '2026-10-10', activityId: 1, complexity: 'H' as const },
      { sourceRow: 3, detailColumn: 2, phase: 'Auth', detail: 'ยังไม่จับคู่', qty: 3, deliverables: '', dueDatePlan: '', activityId: null, complexity: null },
      { sourceRow: 4, detailColumn: 2, phase: 'Vendor', detail: 'ตรวจงาน Vendor', qty: 1, deliverables: '', dueDatePlan: '', activityId: 1, complexity: 'H' as const },
      { sourceRow: 10, detailColumn: 2, phase: 'Auth', detail: 'Once', qty: 9, deliverables: '', dueDatePlan: '', activityId: 2, complexity: 'L' as const },
    ],
  }
  const actor = { userId: 1, role: 'admin' as const }
  assert.throws(() => createImportedProject(db, { ...actor, role: 'viewer' }, base), /สิทธิ์/)
  assert.throws(() => createImportedProject(db, actor, { ...base, techStackId: 999 }), /Stack/)
  assert.throws(() => createImportedProject(db, actor, { ...base, rows: [{ ...base.rows[0], activityId: 999 }] }), /กิจกรรม/)
  assert.throws(() => createImportedProject(db, actor, { ...base, rows: [{ ...base.rows[0], qty: null }] }))
  assert.throws(() => createImportedProject(db, actor, { ...base, rows: [{ ...base.rows[0], complexity: null }] }))
  assert.equal((sql.prepare('SELECT count(*) n FROM projects').get() as { n: number }).n, 0)
  const projectId = createImportedProject(db, actor, base)
  const detail = (await getProjectDetail(projectId))!
  assert.equal(detail.project.wizardStep, 3)
  assert.equal(detail.items.length, 4)
  assert.equal(detail.items.find(i => i.detail === 'Once')!.qty, 1)
  assert.equal(detail.items.every(i => !i.baselineConfirmed), true)
  assert.match(detail.items[0].sourceReference!, /estimate.xlsx.*รายการงาน.*B2/)
  assert.match(detail.items[0].sourceReference!, new RegExp(book.sha256))
  assert.equal(detail.mandays.find(m => m.itemId === detail.items[0].id && m.roleId === 1)!.manday, 15)
  assert.equal(detail.mandays.filter(m => m.itemId === detail.items[1].id).length, 0)
  assert.equal(detail.mandays.filter(m => m.itemId === detail.items.find(i => i.detail === 'ตรวจงาน Vendor')!.id).length, 0)
  assert.equal(detail.projectRoles.find(r => r.roleId === 1)!.included, true)
  assert.equal(detail.projectRoles.find(r => r.roleId === 2)!.included, false)
  const summary = buildSummary(detail)
  assert.equal(summary.totalManday, 18, '15 new MD + once 3, historical 99/88 MD ignored')
  assert.ok(summary.warnings.some(w => w.includes('ยังไม่จับคู่')))
  assert.equal(summary.phases.find(p => p.name === 'Vendor')!.items[0].pendingEstimation, true, 'Mapping Activity in direct profile does not estimate MD')
  const pending = detail.items.find(i => i.detail === 'ยังไม่จับคู่')!
  saveItemEvidence(db, actor, { projectId, itemId: pending.id, sourceReference: 'customer scope v2', baselineConfirmed: false, complexityFacts: '', countUnit: '' })
  assert.equal(buildSummary((await getProjectDetail(projectId))!).phases.flatMap(p => p.items).find(i => i.id === pending.id)!.pendingEstimation, true, 'Evidence text does not determine estimate status')
  saveEffortCell(db, actor, { projectId, itemId: pending.id, roleId: 1, manday: 0, commercialManday: null, actualManday: null, billable: true })
  assert.equal(buildSummary((await getProjectDetail(projectId))!).phases.flatMap(p => p.items).find(i => i.id === pending.id)!.pendingEstimation, false, 'Explicit zero is an estimate')
  const workbook = await buildWorkbook(summary)
  const exported = new ExcelJS.Workbook()
  await exported.xlsx.load(await workbook.xlsx.writeBuffer())
  const texts = exported.getWorksheet('PTTDigital_Manday')!.getSheetValues().flat(Infinity)
  assert.ok(texts.some(v => typeof v === 'string' && v.includes('หน้าจอเข้าสู่ระบบ')))
  assert.ok(texts.some(v => typeof v === 'string' && v.includes('ยังไม่จับคู่') && v.includes('รอประเมิน')))
  assert.ok(exported.getWorksheet('Effort Evidence')!.getSheetValues().flat(Infinity).some(v => typeof v === 'string' && v.includes('estimate.xlsx')))
  sql.close()
})
