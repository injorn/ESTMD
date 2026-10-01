'use server'

import { revalidatePath } from 'next/cache'
import { requireWriter } from '@/lib/dal'
import { db } from '@/lib/db'
import { changeDeliveryProfile, saveEffortCell, saveItemEvidence } from '@/lib/effort-store'
import { isMatrixProfile, type DeliveryProfile } from '@/lib/delivery-profiles'
import { recomputeProject, type ActionState } from './project'
import { z } from 'zod'

function errorState(error: unknown): ActionState {
  return { error: error instanceof z.ZodError ? error.issues[0].message : error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ' }
}
function refresh(projectId: number) {
  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/summary`)
}
const optionalMd = (value: FormDataEntryValue | null) => value == null || String(value).trim() === '' ? null : Number(value)

export async function saveDeliveryProfile(_prev: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireWriter()
  try {
    const projectId = Number(form.get('projectId'))
    const profile = String(form.get('deliveryProfile'))
    const changed = changeDeliveryProfile(db, actor, { projectId, phaseId: Number(form.get('phaseId')), profile })
    if (changed && isMatrixProfile(profile as DeliveryProfile)) await recomputeProject(projectId)
    refresh(projectId)
    return { ok: 'บันทึกรูปแบบการส่งมอบแล้ว' }
  } catch (error) { return errorState(error) }
}
export async function saveRoleEffort(_prev: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireWriter()
  try {
    const projectId = Number(form.get('projectId'))
    saveEffortCell(db, actor, { projectId, itemId: Number(form.get('itemId')), roleId: Number(form.get('roleId')),
      manday: Number(form.get('manday')), commercialManday: optionalMd(form.get('commercialManday')),
      actualManday: optionalMd(form.get('actualManday')), billable: form.get('billable') === 'on' })
    refresh(projectId)
    return { ok: 'บันทึกแรงงานแล้ว' }
  } catch (error) { return errorState(error) }
}
export async function saveEvidence(_prev: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireWriter()
  try {
    const projectId = Number(form.get('projectId'))
    saveItemEvidence(db, actor, { projectId, itemId: Number(form.get('itemId')),
      sourceReference: String(form.get('sourceReference') ?? ''), baselineConfirmed: form.get('baselineConfirmed') === 'on',
      complexityFacts: String(form.get('complexityFacts') ?? ''), countUnit: String(form.get('countUnit') ?? '') })
    refresh(projectId)
    return { ok: 'บันทึกแหล่งอ้างอิงแล้ว' }
  } catch (error) { return errorState(error) }
}
