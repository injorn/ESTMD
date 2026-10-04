'use client'

import { useActionState } from 'react'
import { saveScope } from '@/lib/actions/scope'
import { DIMENSIONS, SCOPE_STATES } from '@/lib/estimation/catalog'
import type { ProjectDetail } from '@/lib/queries'

export function ScopeForm({ detail, readOnly }: { detail: ProjectDetail; readOnly: boolean }) {
  const [state, action, pending] = useActionState(saveScope, {})
  const answered = detail.scopeDimensions.filter(r => r.status !== 'needs_info').length
  return <section className="card p-4 sm:p-5 space-y-4">
    <div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">ขอบเขตโครงการ · 11 Dimensions</h2><span className="text-sm text-muted">ระบุขอบเขตแล้ว {answered}/11 มิติ</span></div>
    <p className="text-sm text-muted">ใช้ตรวจว่ามีงานอะไรบ้างก่อนสร้างรายการ Activity ในขั้น “รายการงาน” แต่ละมิติไม่เพิ่มหรือคูณ MD อัตโนมัติ ข้อมูลที่ยังไม่ทราบให้เลือก “รอข้อมูล”</p>
    <form action={action} onReset={e => e.preventDefault()} className="space-y-3">
      <input type="hidden" name="projectId" value={detail.project.id} />
      {DIMENSIONS.map(d => {
        const saved = detail.scopeDimensions.find(r => r.dimension === d.no)
        const linked = detail.items.filter(i => i.dimensionIds.includes(d.no))
        return <details key={d.no} className="rounded-md border border-line p-3" open={saved?.status === 'in_scope'}>
          <summary className="cursor-pointer font-medium">{d.no}. {d.name} <span className="text-xs text-muted">· {SCOPE_STATES[saved?.status ?? 'needs_info']} · {linked.length} รายการ</span></summary>
          <div className="mt-3 space-y-3 text-sm">
            <p className="font-medium">{d.thai}</p>
            <ul className="list-disc pl-5 space-y-1">{d.ask.map(q => <li key={q}>{q}</li>)}</ul>
            <label className="block">สถานะขอบเขต<select name={`status-${d.no}`} className="field mt-1" defaultValue={saved?.status ?? 'needs_info'} disabled={readOnly}>{Object.entries(SCOPE_STATES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="block">รายละเอียดและข้อสมมติ<textarea name={`detail-${d.no}`} defaultValue={saved?.detail ?? ''} readOnly={readOnly} maxLength={4000} className="field mt-1" rows={3} placeholder={d.collect} /></label>
            <dl className="space-y-2 text-xs"><div><dt className="font-medium">Activity ที่เกี่ยวข้อง</dt><dd>{d.activities.join(', ')} · {d.extra}</dd></div><div><dt className="font-medium">การนับจำนวน</dt><dd>{d.qty}</dd></div><div><dt className="font-medium">ปัจจัยเลือกระดับ</dt><dd>{d.level}</dd></div><div><dt className="font-medium">ตรวจงานซ้ำ</dt><dd>{d.overlap}</dd></div></dl>
            {linked.length ? <ul className="border-t border-line pt-2 space-y-1">{linked.map(i => <li key={i.id}>#{i.id} {i.detail} · {i.complexity} × {i.qty}</li>)}</ul> : saved?.status === 'in_scope' ? <p className="text-xs text-danger">ยังไม่มีรายการงานผูกกับมิตินี้ ตรวจความครบถ้วนในขั้นรายการงาน</p> : null}
          </div>
        </details>
      })}
      {!readOnly ? <button disabled={pending} className="btn-primary">{pending ? 'กำลังบันทึก…' : 'บันทึกขอบเขตทั้ง 11 มิติ'}</button> : null}
      {state.error ? <p role="alert" className="text-sm text-danger">{state.error}</p> : state.ok ? <p role="status" className="text-sm text-brand">{state.ok}</p> : null}
    </form>
  </section>
}
