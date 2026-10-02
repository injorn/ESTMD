import { z } from 'zod'
import { DELIVERY_PROFILES } from '../delivery-profiles'

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const MAX_IMPORT_ROWS = 1000
export class ImportInputError extends Error {}
export type ImportCell = { column: number; text: string; mergedFrom?: string }
export type ImportSheet = {
  name: string; hidden: boolean; rowCount: number; columnCount: number
  rows: { number: number; cells: ImportCell[] }[]; warnings: string[]; error?: string
}
export type ImportWorkbook = { fileName: string; sha256: string; sheets: ImportSheet[] }
export function initialSheetIndex(book: ImportWorkbook) {
  return book.sheets.findIndex(sheet => !sheet.hidden && !sheet.error && sheet.rows.length > 0)
}
export type ColumnMapping = {
  detailColumn: number; phaseColumn: number; qtyColumn: number
  deliverablesColumn: number; dueDateColumn: number; startRow: number; endRow: number
}
export type ReviewRow = {
  sourceRow: number; detailColumn: number; selected: boolean; phase: string; detail: string
  qty: number | null; deliverables: string; dueDatePlan: string
  activityId: number | null; complexity: 'L' | 'M' | 'H' | null; warnings: string[]
}

export function columnLabel(column: number): string {
  let label = ''
  for (let n = column; n > 0; n = Math.floor((n - 1) / 26)) label = String.fromCharCode(65 + (n - 1) % 26) + label
  return label
}

const DETAIL_HEADER = /^(details?|description|tasks?|activities|activity|รายละเอียด(?:งาน)?|รายการ(?:งาน)?|กิจกรรม)$/i
const PHASE_HEADER = /^(phase|feature(?:s)?|group|work package|เฟส|กลุ่มงาน|หมวด(?:งาน)?)$/i
const TOTAL_ROW = /^(grand\s*total|sub\s*total|total|รวม(?:ทั้งหมด)?|ยอดรวม|ค่าใช้จ่าย|อัตรา\/MD|day\s*rate)(?:\s|[:：(]|$)/i
const QTY_HEADER = /^(qty|quantity|จำนวน(?:หน่วย)?)$/i

/** Suggestions are editable; a new mapping regenerates the review explicitly. */
export function suggestMapping(sheet: ImportSheet): ColumnMapping {
  const header = sheet.rows.slice(0, 40).find(row => row.cells.some(c => DETAIL_HEADER.test(c.text.trim())))
  const find = (pattern: RegExp) => header?.cells.find(c => pattern.test(c.text.trim()))?.column ?? 0
  return {
    detailColumn: find(DETAIL_HEADER) || Math.min(2, sheet.columnCount || 1),
    phaseColumn: find(PHASE_HEADER), qtyColumn: find(QTY_HEADER),
    deliverablesColumn: find(/^(deliverables?|ผลส่งมอบ|สิ่งส่งมอบ)$/i),
    dueDateColumn: find(/^(due\s*date(?:\s*plan)?|กำหนดส่ง)$/i),
    startRow: (header?.number ?? 0) + 1, endRow: sheet.rowCount || 1,
  }
}

export function mapSheetRows(sheet: ImportSheet, mapping: ColumnMapping): ReviewRow[] {
  if (sheet.error) throw new Error(sheet.error)
  if (!Number.isInteger(mapping.detailColumn) || mapping.detailColumn < 1 || mapping.detailColumn > sheet.columnCount) throw new Error('กรุณาเลือกคอลัมน์รายละเอียด')
  if (mapping.startRow < 1 || mapping.endRow < mapping.startRow || mapping.endRow > sheet.rowCount) throw new Error('ช่วงแถวไม่ถูกต้อง')
  let phase = 'รายการนำเข้า'
  const result: ReviewRow[] = []
  for (const row of sheet.rows) {
    if (row.number > mapping.endRow) break
    const cell = (col: number) => row.cells.find(c => c.column === col)
    const phaseText = cell(mapping.phaseColumn)?.text.trim()
    if (phaseText && !PHASE_HEADER.test(phaseText) && !TOTAL_ROW.test(phaseText)) phase = phaseText
    if (row.number < mapping.startRow) continue
    const detailCell = cell(mapping.detailColumn)
    const detail = detailCell?.text.trim() ?? ''
    // A merged detail spans one task. Unlike Phase, it must not be copied down.
    if (!detail || (detailCell?.mergedFrom && Number(detailCell.mergedFrom.match(/\d+$/)?.[0]) !== row.number)) continue
    const warnings: string[] = []
    const summary = TOTAL_ROW.test(detail) || DETAIL_HEADER.test(detail)
    if (summary) warnings.push('น่าจะเป็นหัวตารางหรือยอดรวม — ไม่เลือกในเบื้องต้น')
    if (/^[\d,.\s]+$/.test(detail)) warnings.push('รายละเอียดเป็นตัวเลข — ตรวจคอลัมน์ที่เลือก')
    const rawQty = cell(mapping.qtyColumn)?.text.trim() ?? ''
    const qty = !mapping.qtyColumn ? 1 : rawQty === '' ? NaN : Number(rawQty.replace(/,/g, ''))
    const validQty = Number.isFinite(qty) && qty >= 0
    if (!validQty) warnings.push(`จำนวน “${rawQty}” ไม่ถูกต้อง กรุณาแก้ก่อนนำเข้า`)
    result.push({ sourceRow: row.number, detailColumn: mapping.detailColumn, selected: !summary,
      phase, detail, qty: validQty ? qty : null,
      deliverables: cell(mapping.deliverablesColumn)?.text.trim() ?? '',
      dueDatePlan: cell(mapping.dueDateColumn)?.text.trim() ?? '',
      activityId: null, complexity: null, warnings,
    })
  }
  return result
}

export const importedRowSchema = z.object({
  sourceRow: z.number().int().min(1).max(2000), detailColumn: z.number().int().min(1).max(80),
  phase: z.string().trim().min(1, 'กรุณาระบุ Phase').max(500),
  detail: z.string().trim().min(1, 'กรุณาระบุรายละเอียดงาน').max(8000),
  qty: z.number({ error: 'กรุณากรอกจำนวนเป็นตัวเลข หรือไม่เลือกแถวนี้' }).finite().min(0, 'จำนวนต้องไม่ติดลบ').max(1000000),
  deliverables: z.string().max(8000), dueDatePlan: z.string().max(200),
  activityId: z.number().int().positive().nullable(),
  complexity: z.enum(['L', 'M', 'H']).nullable(),
}).superRefine((row, ctx) => {
  if (row.activityId && !row.complexity) ctx.addIssue({ code: 'custom', path: ['complexity'], message: 'กรุณาเลือก L/M/H ของรายการที่จับคู่ Matrix' })
})
export const importProjectSchema = z.object({
  name: z.string().trim().min(1, 'กรุณาระบุชื่อโครงการ').max(500), code: z.string().trim().max(100),
  techStackId: z.number().int().positive().nullable(),
  fileName: z.string().trim().min(1).max(255), sha256: z.string().regex(/^[a-f0-9]{64}$/),
  sheetName: z.string().trim().min(1).max(100),
  profiles: z.record(z.string(), z.enum(DELIVERY_PROFILES)),
  rows: z.array(importedRowSchema).min(1, 'กรุณาเลือกอย่างน้อยหนึ่งรายการ').max(MAX_IMPORT_ROWS, 'นำเข้าได้ไม่เกิน 1,000 รายการต่อครั้ง'),
}).superRefine((input, ctx) => {
  const seen = new Set<number>()
  input.rows.forEach((row, index) => {
    if (seen.has(row.sourceRow)) ctx.addIssue({ code: 'custom', path: ['rows', index], message: 'แถวต้นทางซ้ำกัน' })
    seen.add(row.sourceRow)
    if (!Object.hasOwn(input.profiles, row.phase)) ctx.addIssue({ code: 'custom', path: ['profiles'], message: `กรุณาเลือกรูปแบบงานของ Phase ${row.phase}` })
  })
})
export type ImportProjectInput = z.infer<typeof importProjectSchema>
