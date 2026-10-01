'use client'

import { useActionState, useState } from 'react'
import { saveDeliveryProfile, saveEvidence, saveRoleEffort } from '@/lib/actions/effort'
import { saveItem, type ActionState } from '@/lib/actions/project'
import { PROFILE_OPTIONS, isMatrixProfile, type DeliveryProfile } from '@/lib/delivery-profiles'
import type { ProjectDetail } from '@/lib/queries'

function Feedback({ state }: { state: ActionState }) {
  return state.error ? <p role="alert" className="text-xs text-danger">{state.error}</p>
    : state.ok ? <p role="status" className="text-xs text-brand">{state.ok}</p> : null
}

export function ProfileForm({ projectId, phaseId, profile }: { projectId: number; phaseId: number; profile: DeliveryProfile }) {
  const [state, action, pending] = useActionState(saveDeliveryProfile, {})
  const [selected, setSelected] = useState(profile)
  return <form action={action} onReset={event => event.preventDefault()} className="space-y-2 border-b border-line px-4 py-3 text-sm">
    <input type="hidden" name="projectId" value={projectId} />
    <input type="hidden" name="phaseId" value={phaseId} />
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={`profile-${phaseId}`} className="font-medium">รูปแบบการส่งมอบ</label>
      <select id={`profile-${phaseId}`} name="deliveryProfile" value={selected} onChange={e => setSelected(e.target.value as DeliveryProfile)} className="field max-w-xs" aria-describedby={`profile-help-${phaseId}`}>
        {PROFILE_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
      <button type="submit" className="btn-ghost" disabled={pending}>{pending ? 'กำลังบันทึก…' : 'ใช้รูปแบบนี้'}</button>
    </div>
    <p id={`profile-help-${phaseId}`} className="text-xs text-muted">{PROFILE_OPTIONS.find(p => p.value === selected)!.description} · เมื่อเปลี่ยนรูปแบบ ค่าอัตโนมัติจะคำนวณใหม่ และเก็บ MD ที่แก้เองไว้</p>
    <Feedback state={state} />
  </form>
}

type Item = ProjectDetail['items'][number]
export function EvidenceForm({ item, profile, roles, cells }: {
  item: Item; profile: DeliveryProfile; roles: ProjectDetail['roles']; cells: ProjectDetail['mandays']
}) {
  const [state, action, pending] = useActionState(saveEvidence, {})
  const [effortState, effortAction, savingEffort] = useActionState(saveRoleEffort, {})
  const [editState, editAction, savingItem] = useActionState(saveItem, {})
  const [roleId, setRoleId] = useState(roles[0]?.id ?? 0)
  const cell = cells.find(c => c.itemId === item.id && c.roleId === roleId)
  return <details className="mt-2 text-xs">
    <summary className="cursor-pointer font-medium text-brand">แก้รายการ / แรงงาน / แหล่งอ้างอิง</summary>
    <div className="mt-2 space-y-4 rounded-md border border-line p-3">
      <form action={editAction} onReset={event => event.preventDefault()} className="space-y-2">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="projectId" value={item.projectId} />
        <input type="hidden" name="phaseId" value={item.phaseId} />
        <input type="hidden" name="activityId" value={item.activityId ?? ''} />
        <input type="hidden" name="dueDatePlan" value={item.dueDatePlan ?? ''} />
        <input type="hidden" name="deliverables" value={item.deliverables ?? ''} />
        <label className="block">รายละเอียดงาน<textarea name="detail" required defaultValue={item.detail} className="field mt-1" /></label>
        <div className="flex gap-2">
          <label>ระดับ<select name="complexity" defaultValue={item.complexity} className="field mt-1">{['L', 'M', 'H'].map(l => <option key={l}>{l}</option>)}</select></label>
          <label>จำนวน<input name="qty" type="number" min="0" step="0.01" defaultValue={item.qty} className="field mt-1" /></label>
        </div>
        <button type="submit" disabled={savingItem} className="btn-ghost">{savingItem ? 'กำลังบันทึก…' : 'บันทึกรายการ'}</button>
        <Feedback state={editState} />
      </form>
      <form action={effortAction} onReset={event => event.preventDefault()} className="space-y-2">
        <input type="hidden" name="projectId" value={item.projectId} />
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="roleId" value={roleId} />
        <label className="block">บทบาท<select value={roleId} onChange={e => setRoleId(Number(e.target.value))} className="field mt-1">{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <div key={`${roleId}-${cell?.manday}-${cell?.commercialManday}-${cell?.actualManday}-${cell?.billable}`} className="space-y-2">
          <label className="block">MD ประเมินรวมก่อนปรับงบ<input name="manday" type="number" required min="0" step="0.01" defaultValue={cell?.manday ?? 0} className="field mt-1" /></label>
          <label className="block">MD สำหรับราคา (เว้นว่างถ้าไม่ทราบ)<input name="commercialManday" type="number" min="0" step="0.01" defaultValue={cell?.commercialManday ?? ''} className="field mt-1" /></label>
          <label className="block">MD ใช้จริง (เว้นว่างถ้ายังไม่มีข้อมูล)<input name="actualManday" type="number" min="0" step="0.01" defaultValue={cell?.actualManday ?? ''} className="field mt-1" /></label>
          <label className="flex items-center gap-2"><input type="checkbox" name="billable" defaultChecked={cell?.billable ?? true} />คิดเงินสำหรับแรงงานนี้</label>
        </div>
        <p className="text-muted">MD เป็นยอดรวมของรายการ ไม่คูณจำนวนอีก; การลง MD เองจะแทนค่า ratio ของบทบาทนี้ในกลุ่มงาน เลือกบทบาทที่จะรวมในขั้น “ทีม &amp; อัตรา”</p>
        <button type="submit" disabled={savingEffort || !roles.length} className="btn-ghost">{savingEffort ? 'กำลังบันทึก…' : 'บันทึกแรงงาน'}</button>
        <Feedback state={effortState} />
      </form>
      <form action={action} onReset={event => event.preventDefault()} className="space-y-2">
        <input type="hidden" name="projectId" value={item.projectId} />
        <input type="hidden" name="itemId" value={item.id} />
        <label className="block">แหล่งอ้างอิง (ไฟล์ / ชีต / เซลล์)<textarea name="sourceReference" defaultValue={item.sourceReference ?? ''} maxLength={2000} className="field mt-1" /></label>
        <label className="block">ข้อเท็จจริงที่ใช้เลือกระดับ<textarea name="complexityFacts" defaultValue={item.complexityFacts ?? ''} maxLength={4000} className="field mt-1" /></label>
        {!isMatrixProfile(profile) ? <label className="block">หน่วยนับ<input name="countUnit" defaultValue={item.countUnit ?? ''} maxLength={100} list={`units-${item.id}`} className="field mt-1" /><datalist id={`units-${item.id}`}>{['ต่อรายการ', 'ต่อ interface', 'ต่อ site', 'ต่อ wave', 'ต่อเดือน', 'ต่อรอบตรวจ', 'ต่อ object'].map(u => <option key={u} value={u} />)}</datalist></label> : null}
        <label className="flex items-center gap-2"><input key={String(item.baselineConfirmed)} type="checkbox" name="baselineConfirmed" defaultChecked={item.baselineConfirmed} />ยืนยันว่าเป็น MD ตามเนื้องานก่อนปรับงบ</label>
        <button type="submit" disabled={pending} className="btn-ghost">{pending ? 'กำลังบันทึก…' : 'บันทึกแหล่งอ้างอิง'}</button>
        <Feedback state={state} />
      </form>
    </div>
  </details>
}
