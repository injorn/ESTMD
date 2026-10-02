import { createHash } from 'node:crypto'
import ExcelJS from 'exceljs'
import { MAX_UPLOAD_BYTES, type ImportWorkbook, type ImportSheet } from './model'

/** Bound inflated ZIP data before ExcelJS allocates workbook objects. */
function validateArchive(buffer: Buffer) {
  let footer = -1
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { footer = i; break }
  }
  if (footer < 0 || buffer.readUInt32LE(0) !== 0x04034b50) throw new Error('ไฟล์ Excel ไม่ถูกต้องหรือเสียหาย')
  const count = buffer.readUInt16LE(footer + 10)
  let offset = buffer.readUInt32LE(footer + 16)
  if (count > 5000) throw new Error('ไฟล์ Excel มีข้อมูลมากเกินไป')
  let inflated = 0
  for (let n = 0; n < count; n++) {
    if (offset + 46 > footer || buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('ไฟล์ Excel ไม่ถูกต้องหรือเสียหาย')
    inflated += buffer.readUInt32LE(offset + 24)
    if (inflated > 100 * 1024 * 1024) throw new Error('ข้อมูลในไฟล์ Excel เกิน 100 MiB หลังคลายการบีบอัด')
    offset += 46 + buffer.readUInt16LE(offset + 28) + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32)
  }
}

function cellText(value: ExcelJS.CellValue): { text: string; warning?: string } {
  if (value == null) return { text: '' }
  if (value instanceof Date) return { text: Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10) }
  if (typeof value !== 'object') return { text: String(value) }
  if ('richText' in value) return { text: value.richText.map(part => part.text).join('') }
  if ('formula' in value || 'sharedFormula' in value) {
    if (value.result == null) return { text: '', warning: 'สูตรไม่มีผลที่บันทึกไว้ กรุณาตรวจต้นฉบับ' }
    return cellText(value.result)
  }
  if ('error' in value) return { text: '', warning: `เซลล์มีข้อผิดพลาด ${value.error}` }
  if ('text' in value) return { text: value.text }
  return { text: '' }
}

export async function readImportWorkbook(buffer: Buffer, fileName: string): Promise<ImportWorkbook> {
  if (!/\.xlsx$/i.test(fileName)) throw new Error('รองรับไฟล์ .xlsx เท่านั้น')
  if (fileName.length > 255) throw new Error('ชื่อไฟล์ยาวเกิน 255 ตัวอักษร')
  if (buffer.length > MAX_UPLOAD_BYTES) throw new Error('ไฟล์ต้องมีขนาดไม่เกิน 10 MiB')
  if (buffer.length < 22) throw new Error('ไฟล์ Excel ไม่ถูกต้องหรือเสียหาย')
  validateArchive(buffer)
  const book = new ExcelJS.Workbook()
  try { await book.xlsx.load(buffer as unknown as ExcelJS.Buffer) }
  catch { throw new Error('อ่านไฟล์ Excel ไม่ได้ ไฟล์อาจเสียหายหรือมีรหัสผ่าน') }
  if (book.worksheets.length > 50) throw new Error('รองรับไม่เกิน 50 ชีตต่อไฟล์')
  let cells = 0
  let characters = 0
  const sheets: ImportSheet[] = book.worksheets.map(sheet => {
    let rowCount = 0
    let columnCount = 0
    sheet.eachRow(row => row.eachCell(cell => {
      // Formats often extend far beyond the table in historical workbooks.
      if (cell.value == null || cell.value === '') return
      rowCount = Math.max(rowCount, row.number)
      columnCount = Math.max(columnCount, Number(cell.col))
    }))
    const result: ImportSheet = { name: sheet.name, hidden: sheet.state !== 'visible', rowCount,
      columnCount, rows: [], warnings: [] }
    if (rowCount > 2000 || columnCount > 80) {
      result.error = 'ชีตนี้เกิน 2,000 แถวหรือ 80 คอลัมน์ กรุณาคัดลอกเฉพาะตารางงานเป็นชีตใหม่แล้วอัปโหลด'
      return result
    }
    sheet.eachRow(row => {
      const entry: ImportSheet['rows'][number] = { number: row.number, cells: [] }
      row.eachCell(cell => {
        const value = cellText(cell.value)
        if (value.warning) result.warnings.push(`${cell.address}: ${value.warning}`)
        if (!value.text) return
        if (++cells > 200000 || (characters += value.text.length) > 2000000) throw new Error('ข้อความใน Excel มากเกินไป กรุณาแยกไฟล์')
        if (value.text.length > 8000) throw new Error(`${sheet.name}!${cell.address}: ข้อความเกิน 8,000 ตัวอักษร`)
        entry.cells.push({ column: Number(cell.col), text: value.text,
          ...(cell.master.address !== cell.address ? { mergedFrom: cell.master.address } : {}),
        })
      })
      if (entry.cells.length) result.rows.push(entry)
    })
    return result
  })
  if (!sheets.some(s => !s.error && s.rows.length)) throw new Error('ไม่พบชีตที่มีรายการให้นำเข้า')
  return { fileName, sha256: createHash('sha256').update(buffer).digest('hex'), sheets }
}
