'use client'

import { useState } from 'react'
import type { Activity } from '@/lib/db/schema'
import { ONCE_PER_PROJECT_UNIT } from '@/lib/db/schema'
import { isMatrixProfile, type DeliveryProfile } from '@/lib/delivery-profiles'
import { columnLabel, type ReviewRow } from '@/lib/excel-import/model'

export function ReviewTable({ rows, onChange, activities, profileOf }: { rows: ReviewRow[]; onChange: (rows: ReviewRow[]) => void; activities: Activity[]; profileOf: (phase: string) => DeliveryProfile }) {
  const [page, setPage] = useState(0)
  const update = (sourceRow: number, patch: Partial<ReviewRow>) => onChange(rows.map(row => row.sourceRow === sourceRow ? { ...row, ...patch } : row))
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><p>เลือก {rows.filter(row => row.selected).length} / {rows.length} รายการ · หัวข้อและยอดรวมไม่เลือกในเบื้องต้น</p><div className="flex gap-2"><button type="button" className="btn-ghost" onClick={() => onChange(rows.map(row => ({ ...row, selected: true })))}>เลือกทั้งหมด</button><button type="button" className="btn-ghost" onClick={() => onChange(rows.map(row => ({ ...row, selected: false })))}>ไม่เลือกทั้งหมด</button></div></div>
    <div className="overflow-x-auto rounded-md border border-line" tabIndex={0} aria-label="รายการสำหรับนำเข้า เลื่อนดูคอลัมน์ได้">
      <table className="w-full min-w-[1050px] border-collapse text-sm"><caption className="sr-only">ตรวจและแก้รายการก่อนสร้างโครงการ</caption><thead><tr className="bg-background text-xs">{['เลือก', 'ต้นทาง', 'Phase', 'รายละเอียด / สิ่งส่งมอบ', 'จำนวน', 'กิจกรรม Matrix', 'ระดับ', 'การประเมิน'].map(text => <th scope="col" key={text} className="border-b border-line p-2 text-left font-semibold">{text}</th>)}</tr></thead>
        <tbody>{rows.slice(page * 25, page * 25 + 25).map(row => {
          const activity = activities.find(a => a.id === row.activityId)
          const matrix = isMatrixProfile(profileOf(row.phase))
          const once = matrix && activity?.countUnit === ONCE_PER_PROJECT_UNIT
          const label = `แถว ${row.sourceRow}`
          return <tr key={row.sourceRow} className={`border-b border-line align-top last:border-0 ${row.selected ? '' : 'bg-background'}`}>
            <td className="p-2"><input type="checkbox" aria-label={`นำเข้า${label}`} checked={row.selected} onChange={e => update(row.sourceRow, { selected: e.target.checked })} /></td>
            <th scope="row" className="p-2 text-xs font-normal tabular-nums">{columnLabel(row.detailColumn)}{row.sourceRow}</th>
            <td className="w-40 p-2"><input aria-label={`Phase ${label}`} className="field" value={row.phase} required={row.selected} maxLength={500} onChange={e => update(row.sourceRow, { phase: e.target.value })} /></td>
            <td className="min-w-64 p-2"><textarea aria-label={`รายละเอียด ${label}`} className="field min-h-20" value={row.detail} required={row.selected} maxLength={8000} onChange={e => update(row.sourceRow, { detail: e.target.value })} />
              {row.warnings.length ? <p className="mt-1 text-xs text-accent">ต้นทาง: {row.warnings.join(' · ')}</p> : null}
              <details className="mt-2 text-xs"><summary className="cursor-pointer text-brand">สิ่งส่งมอบ / กำหนดส่ง</summary><label className="mt-2 block">สิ่งส่งมอบ<textarea className="field mt-1" value={row.deliverables} maxLength={8000} onChange={e => update(row.sourceRow, { deliverables: e.target.value })} /></label><label className="mt-2 block">กำหนดส่ง<input className="field mt-1" value={row.dueDatePlan} maxLength={200} onChange={e => update(row.sourceRow, { dueDatePlan: e.target.value })} /></label></details>
            </td>
            <td className="w-24 p-2"><input aria-label={`จำนวน ${label}`} className="field tabular-nums" type="number" required={row.selected} min="0" max="1000000" step="0.01" value={once ? 1 : row.qty ?? ''} readOnly={once} aria-invalid={row.selected && row.qty == null && !once} onChange={e => update(row.sourceRow, { qty: e.target.value === '' ? null : Number(e.target.value) })} /><span className="mt-1 block text-xs text-muted">{activity?.countUnit ?? 'ต่อรายการ'}{once ? ' (จำนวน 1)' : ''}</span></td>
            <td className="w-52 p-2"><select aria-label={`กิจกรรม Matrix ${label}`} className="field" value={row.activityId ?? ''} onChange={e => update(row.sourceRow, { activityId: e.target.value ? Number(e.target.value) : null, complexity: e.target.value ? row.complexity : null })}><option value="">ยังไม่จับคู่ / ลง MD เอง</option>{activities.map(a => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}</select></td>
            <td className="w-24 p-2"><select aria-label={`ระดับ ${label}`} className="field" value={row.complexity ?? ''} disabled={!row.activityId} required={row.selected && !!row.activityId} onChange={e => update(row.sourceRow, { complexity: e.target.value ? e.target.value as ReviewRow['complexity'] : null })}><option value="">เลือก</option>{['L', 'M', 'H'].map(level => <option key={level}>{level}</option>)}</select></td>
            <td className="w-36 p-2 text-xs text-muted">{!matrix ? 'กรอก MD ตามบทบาทในขั้นถัดไป' : row.activityId && row.complexity ? 'คำนวณจาก Matrix เมื่อนำเข้า' : 'รอประเมิน'}</td>
          </tr>
        })}</tbody>
      </table>
    </div>
    <div className="flex items-center justify-end gap-2 text-sm"><button type="button" className="btn-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>รายการก่อนหน้า</button><span className="tabular-nums">{page + 1} / {Math.max(1, Math.ceil(rows.length / 25))}</span><button type="button" className="btn-ghost" disabled={(page + 1) * 25 >= rows.length} onClick={() => setPage(page + 1)}>รายการถัดไป</button></div>
  </div>
}
