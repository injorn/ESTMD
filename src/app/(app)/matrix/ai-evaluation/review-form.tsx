'use client'

import { useActionState, useState } from 'react'
import { captureEvaluationCases, reviewEvaluationCase } from '@/lib/actions/evaluation'

export function CaptureCasesForm() {
  const [state, action, pending] = useActionState(captureEvaluationCases, {})
  return <form action={action} className="space-y-2" aria-busy={pending}>
    <button className="btn-primary" disabled={pending}>{pending ? 'กำลังเตรียมรายการ…' : 'เตรียมรายการจากโครงการ'}</button>
    {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    {state.ok && <p role="status" className="text-sm text-ok">{state.ok}</p>}
  </form>
}

export function ReviewCaseForm({ id, revision, status, level, note }: {
  id: number; revision: number; status: 'pending' | 'reviewed' | 'excluded'; level: 'L' | 'M' | 'H' | null; note: string
}) {
  const [state, action, pending] = useActionState(reviewEvaluationCase, {})
  const [decision, setDecision] = useState(status === 'excluded' ? 'excluded' : 'reviewed')
  const prefix = `case-${id}`
  return <form action={action} className="space-y-3 border-t border-line pt-4" aria-busy={pending} aria-describedby={state.error ? `${prefix}-error` : undefined}>
    <input type="hidden" name="id" value={id} />
    <input type="hidden" name="revision" value={revision} />
    <fieldset disabled={pending} className="grid gap-3 sm:grid-cols-2">
      <legend className="mb-2 text-sm font-semibold">ผลตรวจของผู้ประเมิน</legend>
      <div>
        <label className="label" htmlFor={`${prefix}-status`}>นำเข้าชุดทดสอบ</label>
        <select id={`${prefix}-status`} name="status" className="field" value={decision} onChange={e => setDecision(e.target.value)}>
          <option value="reviewed">ยืนยันคำตอบมาตรฐาน</option><option value="excluded">แยกออก — ข้อมูลไม่พอ / งานไม่เหมาะสม</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`${prefix}-level`}>ระดับมาตรฐาน {decision === 'reviewed' ? '(จำเป็น)' : ''}</label>
        <select id={`${prefix}-level`} name="level" className="field" defaultValue={level ?? ''} required={decision === 'reviewed'} disabled={decision === 'excluded'}>
          <option value="">เลือกระดับหลังตรวจรายละเอียด</option><option value="L">L — Low</option><option value="M">M — Medium</option><option value="H">H — High</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor={`${prefix}-note`}>เหตุผลประกอบการตรวจ (จำเป็น)</label>
        <textarea id={`${prefix}-note`} name="note" className="field" rows={2} required maxLength={2000} defaultValue={note}
          placeholder="ระบุปัจจัยที่ใช้ตัดสิน หรือข้อมูลที่ยังขาด" />
      </div>
    </fieldset>
    {state.error && <p id={`${prefix}-error`} role="alert" className="text-sm text-danger">{state.error}</p>}
    {state.ok && <p role="status" className="text-sm text-ok">{state.ok}</p>}
    <button className="btn-primary" disabled={pending}>{pending ? 'กำลังบันทึก…' : 'บันทึกผลตรวจ'}</button>
  </form>
}
