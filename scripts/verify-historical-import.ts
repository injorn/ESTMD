import fs from 'node:fs/promises'
import path from 'node:path'
import { readImportWorkbook } from '../src/lib/excel-import/workbook'

// Read-only compatibility check. No workbook contents or personnel are printed.
async function main() {
const directory = path.resolve('pttdigitalMD')
const files = (await fs.readdir(directory)).filter(name => /\.xlsx$/i.test(name)).sort()
let failed = 0
let skippedSheets = 0
for (const file of files) {
  const workbookPath = path.join(directory, file)
  const before = await fs.stat(workbookPath)
  try {
    const book = await readImportWorkbook(await fs.readFile(workbookPath), file)
    const after = await fs.stat(workbookPath)
    if (before.mtimeMs !== after.mtimeMs || before.size !== after.size) throw new Error('Source changed during read')
    const skipped = book.sheets.filter(s => s.error).length
    skippedSheets += skipped
    console.log(`${file}: ${book.sheets.filter(s => !s.error && s.rows.length).length} readable sheets, ${skipped} oversized sheets${skipped ? ' (' + book.sheets.filter(s => s.error).map(s => s.name).join(', ') + ')' : ''}`)
  } catch (error) {
    failed++
    console.error(`${file}: ${error instanceof Error ? error.message : 'read failed'}`)
  }
}
console.log(`Checked ${files.length} workbooks; ${failed} failures; ${skippedSheets} oversized sheets skipped`)
if (failed || !files.length) process.exitCode = 1
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
