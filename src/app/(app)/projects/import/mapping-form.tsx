'use client'

import { useState } from 'react'
import { columnLabel, type ColumnMapping, type ImportSheet } from '@/lib/excel-import/model'

const FIELDS: { key: keyof ColumnMapping; label: string; required?: boolean }[] = [
  { key: 'detailColumn', label: 'รายละเอียดงาน', required: true }, { key: 'phaseColumn', label: 'Phase / กลุ่มงาน' },
  { key: 'qtyColumn', label: 'จำนวน' }, { key: 'deliverablesColumn', label: 'สิ่งส่งมอบ' }, { key: 'dueDateColumn', label: 'กำหนดส่ง' },
]

export function MappingForm({ sheet, initial, onReview }: { sheet: ImportSheet; initial: ColumnMapping; onReview: (mapping: ColumnMapping) => void }) {
  const [mapping, setMapping] = useState(initial)
  const [page, setPage] = useState(0)
  const columns = Array.from({ length: sheet.columnCount }, (_, index) => index + 1)
  const preview = sheet.rows.slice(page * 15, page * 15 + 15)
  const header = sheet.rows.find(r => r.number === initial.startRow - 1)
  return <form onSubmit={event => { event.preventDefault(); onReview(mapping) }} className="card space-y-4 p-4">
    <div><h2 className="font-semibold">2. เลือกช่วงแถวและคอลัมน์</h2><p className="mt-1 text-sm text-muted">ตรวจตัวอย่างด้านล่าง ข้ามชื่อโครงการและหัวตาราง คอลัมน์ MD และราคาไม่ต้องเลือก</p></div>
    {sheet.warnings.length ? <details className="text-sm text-accent"><summary className="cursor-pointer">ข้อสังเกตจาก Excel ({sheet.warnings.length})</summary><ul className="mt-2 max-h-48 list-disc overflow-auto pl-5">{sheet.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul></details> : null}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {FIELDS.map(field => <label key={field.key} className="text-sm">{field.label}{field.required ? ' *' : ''}<select className="field mt-1" required={field.required} value={mapping[field.key]} onChange={e => setMapping({ ...mapping, [field.key]: Number(e.target.value) })}>
        {!field.required ? <option value={0}>{field.key === 'qtyColumn' ? 'ไม่เลือก — ใช้จำนวน 1' : field.key === 'phaseColumn' ? 'ไม่เลือก — รวมเป็น “รายการนำเข้า”' : 'ไม่เลือก'}</option> : null}
        {columns.map(column => <option key={column} value={column}>{columnLabel(column)}{header?.cells.find(c => c.column === column)?.text ? ` — ${header.cells.find(c => c.column === column)!.text.slice(0, 60)}` : ''}</option>)}
      </select></label>)}
      <div className="flex gap-2"><label className="flex-1 text-sm">จากแถว<input className="field mt-1" type="number" required min="1" max={sheet.rowCount} value={mapping.startRow} onChange={e => setMapping({ ...mapping, startRow: Number(e.target.value) })} /></label><label className="flex-1 text-sm">ถึงแถว<input className="field mt-1" type="number" required min={mapping.startRow} max={sheet.rowCount} value={mapping.endRow} onChange={e => setMapping({ ...mapping, endRow: Number(e.target.value) })} /></label></div>
    </div>
    <div className="max-h-96 overflow-auto rounded-md border border-line" tabIndex={0} aria-label="ตัวอย่างตารางต้นทาง เลื่อนดูคอลัมน์ได้">
      <table className="min-w-full border-collapse text-xs"><caption className="sr-only">ตัวอย่างต้นทาง {sheet.name}</caption><thead className="sticky top-0 bg-background"><tr><th scope="col" className="border-b border-line p-2">แถว</th>{columns.map(column => <th key={column} scope="col" className={`min-w-32 border-b border-line p-2 text-left ${column === mapping.detailColumn ? 'bg-brand-soft' : ''}`}>{columnLabel(column)}</th>)}</tr></thead>
        <tbody>{preview.map(row => <tr key={row.number} className="border-b border-line last:border-0"><th scope="row" className="p-2 tabular-nums">{row.number}</th>{columns.map(column => { const cell = row.cells.find(c => c.column === column); return <td key={column} className={`max-w-72 whitespace-pre-wrap break-words p-2 align-top ${column === mapping.detailColumn ? 'bg-brand-soft/30' : ''}`}><span className="line-clamp-5">{cell?.text ?? ''}</span>{cell?.mergedFrom ? <span className="block text-muted">รวมจาก {cell.mergedFrom}</span> : null}</td> })}</tr>)}</tbody>
      </table>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm"><button type="button" className="btn-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>ก่อนหน้า</button><span className="tabular-nums">{page + 1} / {Math.max(1, Math.ceil(sheet.rows.length / 15))}</span><button type="button" className="btn-ghost" disabled={(page + 1) * 15 >= sheet.rows.length} onClick={() => setPage(page + 1)}>ถัดไป</button></div><button type="submit" className="btn-primary">ตรวจรายการก่อนนำเข้า</button></div>
  </form>
}
