import ExcelJS from 'exceljs'
import { MAX_IMPORT_ROWS } from './model'

const HEADERS = ['Phase', 'รายละเอียดงาน', 'จำนวน', 'สิ่งส่งมอบ', 'กำหนดส่ง']

/** The same template is generated for every download; no project data is used. */
export function buildImportTemplate(): ExcelJS.Workbook {
  const book = new ExcelJS.Workbook()
  book.creator = 'Manday Estimation'
  book.properties.date1904 = false
  const input = book.addWorksheet('รายการงาน', { views: [{ state: 'frozen', ySplit: 1 }] })
  const examples = book.addWorksheet('ตัวอย่าง', { views: [{ state: 'frozen', ySplit: 1 }] })
  for (const sheet of [input, examples]) {
    sheet.columns = [22, 70, 14, 50, 20].map(width => ({ width }))
    sheet.addRow(HEADERS)
    sheet.getRow(1).height = 28
    sheet.getRow(1).eachCell(cell => {
      cell.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003B7A' } }
      cell.alignment = { vertical: 'middle', wrapText: true }
    })
    sheet.autoFilter = 'A1:E1'
    sheet.getColumn(5).numFmt = 'yyyy-mm-dd'
  }
  for (let row = 2; row <= MAX_IMPORT_ROWS + 1; row++) {
    input.getCell(row, 3).value = 1
    input.getCell(row, 3).dataValidation = {
      type: 'decimal', operator: 'between', formulae: [0, 1000000], allowBlank: true,
      showErrorMessage: true, errorStyle: 'stop', errorTitle: 'จำนวนไม่ถูกต้อง',
      error: 'กรอกจำนวนตั้งแต่ 0 ถึง 1,000,000 เช่น 1, 2 หรือ 0.5',
      showInputMessage: true, promptTitle: 'จำนวนหน่วยงาน', prompt: 'ค่าเริ่มต้น 1; ปรับตามจำนวนหน้าจอ รายงาน หรือรายการงาน',
    }
    for (let column = 1; column <= 5; column++) {
      const cell = input.getCell(row, column)
      cell.font = { name: 'Tahoma', size: 11, color: { argb: 'FF005AA7' } }
      cell.alignment = { vertical: 'top', wrapText: true }
    }
  }
  examples.addRows([
    ['จัดการผู้ใช้', 'หน้าจอค้นหาและแสดงรายการผู้ใช้ พร้อมแบ่งหน้าและกรองสถานะ', 2, 'หน้าจอค้นหาผู้ใช้', new Date('2026-10-15T00:00:00Z')],
    ['รายงาน', 'รายงานยอดขายรายเดือน แยกตามสาขาและดาวน์โหลด Excel', 1, 'รายงานยอดขายและไฟล์ Excel', new Date('2026-10-20T00:00:00Z')],
    ['กำกับ Vendor', 'ตรวจรับงานและประสาน Vendor ตามรอบส่งมอบ', 3, 'บันทึกตรวจรับงาน 3 รอบ', null],
  ])
  for (let row = 2; row <= 4; row++) {
    examples.getRow(row).height = 48
    examples.getRow(row).eachCell(cell => {
      cell.font = { name: 'Tahoma', size: 11 }
      cell.alignment = { vertical: 'top', wrapText: true }
      if (row % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F5FC' } }
    })
  }
  const guide = book.addWorksheet('วิธีใช้')
  guide.columns = [{ width: 26 }, { width: 105 }]
  guide.addRows([
    ['หัวข้อ', 'คำแนะนำ'],
    ['เริ่มกรอก', 'กรอกงานจริงในชีต “รายการงาน” ตั้งแต่แถว 2; มีที่สำหรับ 1,000 รายการ จำนวนเริ่มต้น 1 แก้ได้'],
    ['ดูตัวอย่าง', 'ชีต “ตัวอย่าง” ใช้อธิบายวิธีกรอกเท่านั้น ไม่ต้องนำเข้าเป็นงานจริง คัดลอกรูปแบบมาใช้ได้'],
    ['Phase', 'ชื่อกลุ่มงาน เช่น จัดการผู้ใช้ รายงาน หรือกำกับ Vendor; กรอกซ้ำแต่ละแถวเพื่ออ่านง่าย'],
    ['รายละเอียดงาน', 'จำเป็น: อธิบายขอบเขตและเงื่อนไขของแต่ละงาน หนึ่งแถวต่อหนึ่งรายการ ไม่ใส่หัวข้อหรือยอดรวมเป็นงาน'],
    ['จำนวน', 'จำเป็น: จำนวนหน่วย เช่น หน้าจอ รายงาน หรือรอบงาน เป็นตัวเลขไม่ติดลบ ค่าเริ่มต้น 1 ไม่ใช่ MD'],
    ['สิ่งส่งมอบ', 'ไม่จำเป็น: ระบุผลที่จะส่ง เช่น หน้าจอ รายงาน เอกสาร หรือบันทึกตรวจรับ'],
    ['กำหนดส่ง', 'ไม่จำเป็น: ใช้วันที่ YYYY-MM-DD เช่น 2026-10-15; วันที่ในตัวอย่างเป็นเพียงตัวอย่าง'],
    ['นำเข้ากลับ', 'บันทึกเป็น .xlsx → โครงการ → นำเข้าจาก Excel → เลือกชีต “รายการงาน” → ตรวจรายการก่อนนำเข้า'],
    ['ประเมิน MD', 'เลือก Activity, L/M/H และรูปแบบงานในระบบ แล้วคำนวณ Matrix หรือกรอก MD ตามบทบาท จากนั้นเลือกทีม/อัตราและ Export'],
    ['ไม่มีคอลัมน์ MD', 'Template ใช้เก็บขอบเขตงานเท่านั้น ไม่กรอก MD ราคา หรือ Actual ในไฟล์นี้'],
  ])
  guide.getRow(1).font = { name: 'Tahoma', size: 11, bold: true }
  for (let row = 2; row <= guide.rowCount; row++) {
    guide.getRow(row).height = 42
    guide.getRow(row).font = { name: 'Tahoma', size: 11 }
    guide.getRow(row).alignment = { vertical: 'top', wrapText: true }
  }
  return book
}
