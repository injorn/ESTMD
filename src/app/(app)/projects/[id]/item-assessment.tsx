'use client'

import { useActionState, useState } from 'react'
import { saveAssessment } from '@/lib/actions/scope'
import { DIMENSIONS, reviewedCriterion, assessmentIsCurrent } from '@/lib/estimation/catalog'
import { isMatrixProfile, type DeliveryProfile } from '@/lib/delivery-profiles'
import { round2 } from '@/lib/estimate'
import type { ProjectDetail } from '@/lib/queries'

export function ItemAssessment({ item, detail, profile, criteria, readOnly }: { item: ProjectDetail['items'][number]; detail: Pick<ProjectDetail, 'activities' | 'roles' | 'matrixCells' | 'effectiveMultiplier' | 'mandays' | 'scopeDimensions' | 'projectRoles'>; profile: DeliveryProfile; criteria: string[]; readOnly: boolean }) {
  const [state, action, pending] = useActionState(saveAssessment, {})
  const [level, setLevel] = useState(item.complexity)
  const [dimensions, setDimensions] = useState(item.dimensionIds)
  const activity = detail.activities.find(a => a.id === item.activityId)
  const reviewed = activity ? reviewedCriterion(activity.code) : undefined
  const matrix = isMatrixProfile(profile) && !!activity
  const current = assessmentIsCurrent(item.assessment, item, activity?.code ?? '')
  const included = detail.roles.filter(r => detail.projectRoles.some(pr => pr.roleId === r.id && pr.included))
  const excluded = detail.roles.filter(r => !included.some(i => i.id === r.id) && detail.matrixCells.some(c => c.activityId === item.activityId && c.roleId === r.id && c.manday > 0))
  const rows = included.map(role => ({ role, values: ['L', 'M', 'H'].map(l => {
    const cell = detail.mandays.find(c => c.itemId === item.id && c.roleId === role.id)
    if (cell?.overridden) return cell.manday
    const base = detail.matrixCells.find(c => c.activityId === item.activityId && c.roleId === role.id && c.complexity === l)?.manday ?? 0
    return round2(base * item.qty * (role.stackMultiplied ? detail.effectiveMultiplier : 1))
  }) }))
  return <details className="mt-2 text-xs">
    <summary className="cursor-pointer font-medium text-brand">ประเมินระดับ / MD / 11 Dimensions {item.assessment ? current ? '· ยืนยันเกณฑ์แล้ว' : '· รายการเปลี่ยน ต้องทบทวน' : '· ยังไม่ยืนยันเกณฑ์'}</summary>
    <div className="mt-3 space-y-3 rounded-md border border-line p-3">
      {reviewed ? <><p><strong>ข้อมูลที่ต้องเก็บ:</strong> {reviewed.ask}</p><p><strong>หน่วยและการนับ:</strong> {activity?.countUnit} · {reviewed.rule}</p><p><strong>ตรวจงานซ้ำ:</strong> {reviewed.review}</p>{reviewed.assumptions ? <p><strong>สมมติฐานของ MD เริ่มต้น:</strong> {reviewed.assumptions}<br />{reviewed.basis}</p> : null}</> : null}
      {matrix ? <>
        <div className="grid gap-3 md:grid-cols-3">{['L', 'M', 'H'].map((l, i) => <div key={l} className="rounded border border-line p-3"><h3 className="font-semibold">Level {l}</h3><p className="mt-2 whitespace-pre-line">{criteria[i] || 'ยังไม่มีเกณฑ์เฉพาะ กรุณาอ้างอิงมาตรฐานทีม'}</p></div>)}</div>
        <div className="overflow-x-auto"><table className="w-full text-xs"><caption className="text-left mb-2">MD รวมของรายการ × {item.qty} {activity?.countUnit} · ตัวคูณเฉพาะบทบาทที่กำหนด × {detail.effectiveMultiplier}</caption><thead><tr className="bg-brand-soft"><th className="p-2 text-left">บทบาท</th>{['L', 'M', 'H'].map(l => <th key={l} className="p-2 text-right">{l}</th>)}</tr></thead><tbody>{rows.map(({ role, values }) => <tr key={role.id} className="border-b border-line"><th className="p-2 text-left font-normal">{role.name}{detail.mandays.some(c => c.itemId === item.id && c.roleId === role.id && c.overridden) ? ' (MD แก้เอง)' : role.scope === 'phase' ? ' (ใช้ ratio ระดับ Phase)' : ''}</th>{values.map((v, i) => <td key={i} className="p-2 text-right tabular-nums">{v}</td>)}</tr>)}</tbody><tfoot><tr><th className="p-2 text-left">รวม MD รายการก่อน ratio</th>{[0, 1, 2].map(i => <td key={i} className="p-2 text-right font-semibold">{round2(rows.reduce((sum, r) => sum + (r.role.scope === 'phase' && !detail.mandays.some(c => c.itemId === item.id && c.roleId === r.role.id && c.explicitEffort) ? 0 : r.values[i]), 0))}</td>)}</tr></tfoot></table></div>
        <p className="text-muted">MD ที่แก้เองจะคงไว้; ค่า ratio ระดับ Phase, Buffer และราคาแสดงในหน้าสรุป</p>
        {excluded.length ? <p className="text-danger">Matrix มี MD ของ {excluded.map(r => r.name).join(', ')} แต่ยังไม่รวมบทบาทเหล่านี้ในยอดโครงการ ตรวจการเลือกบทบาทในขั้น “ทีม &amp; อัตรา”</p> : null}
      </> : <p>ประเมินจากขอบเขตและลง MD ตามบทบาทใน “แก้รายการ / แรงงาน”</p>}
      <form action={action} onReset={e => e.preventDefault()} className="space-y-3">
        <input type="hidden" name="projectId" value={item.projectId} /><input type="hidden" name="itemId" value={item.id} /><input type="hidden" name="activityId" value={item.activityId ?? ''} /><input type="hidden" name="detail" value={item.detail} /><input type="hidden" name="qty" value={item.qty} />
        <fieldset disabled={readOnly || pending} className="space-y-2"><legend className="font-medium mb-2">มิติที่เกี่ยวข้องกับรายการนี้ (เลือกหลายมิติได้โดยไม่เพิ่ม MD)</legend>{DIMENSIONS.map(d => <label key={d.no} className="flex items-start gap-2"><input type="checkbox" name="dimensions" value={d.no} checked={dimensions.includes(d.no)} onChange={e => setDimensions(previous => e.target.checked ? [...previous, d.no] : previous.filter(n => n !== d.no))} /><span>{d.no}. {d.name}{d.activities.includes(activity?.code ?? '') ? ' · Activity ที่เกี่ยวข้อง' : ''}</span></label>)}</fieldset>
        {dimensions.filter(n => detail.scopeDimensions.find(d => d.dimension === n)?.status === 'out_of_scope').map(n => <p key={n} className="text-danger">มิติ {n} ถูกระบุว่าไม่มีงานในขอบเขต กรุณาทบทวนขอบเขตโครงการ</p>)}
        <label className="block">ระดับที่ยืนยัน<select name="level" value={level} onChange={e => setLevel(e.target.value as typeof level)} disabled={readOnly || !matrix} className="field mt-1">{['L', 'M', 'H'].map(l => <option key={l}>{l}</option>)}</select></label>
        {!matrix ? <input type="hidden" name="level" value={item.complexity} /> : null}
        <label className="block">ข้อเท็จจริง / หลักฐานที่ตรงกับเกณฑ์<textarea name="evidence" required maxLength={4000} readOnly={readOnly} defaultValue={item.assessment?.evidence ?? item.complexityFacts ?? ''} className="field mt-1" /></label>
        <label className="block">เหตุผลเปลี่ยนระดับ / ข้อสมมติ<textarea name="reason" required={level !== item.complexity} maxLength={2000} readOnly={readOnly} defaultValue={item.assessment?.reason ?? ''} className="field mt-1" /></label>
        {!readOnly ? <div className="flex flex-wrap gap-2"><button name="intent" value="record" disabled={pending || level !== item.complexity} className="btn-ghost">บันทึกเกณฑ์และมิติ (คง MD)</button>{matrix ? <button name="intent" value="apply" disabled={pending || !criteria.some(Boolean)} className="btn-primary">ใช้ระดับและคำนวณ MD รายการนี้</button> : null}</div> : null}
        {state.error ? <p role="alert" className="text-danger">{state.error}</p> : state.ok ? <p role="status" className="text-brand">{state.ok}</p> : null}
      </form>
    </div>
  </details>
}
