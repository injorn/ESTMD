'use server'

import { revalidatePath } from 'next/cache'
import { requireWriter } from '@/lib/dal'
import { db } from '@/lib/db'
import { saveItemAssessment, saveProjectScope } from '@/lib/scope-store'
import { DIMENSIONS, type ScopeStatus } from '@/lib/estimation/catalog'
import type { ActionState } from './project'

export async function saveScope(_previous: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireWriter()
  try {
    const projectId = Number(form.get('projectId'))
    saveProjectScope(db, actor, { projectId, rows: DIMENSIONS.map(d => ({ dimension: d.no, status: String(form.get(`status-${d.no}`)) as ScopeStatus, detail: String(form.get(`detail-${d.no}`) ?? '') })) })
    revalidatePath(`/projects/${projectId}`)
    return { ok: 'บันทึกขอบเขต 11 Dimensions แล้ว' }
  } catch (e) { return { error: e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ' } }
}
export async function saveAssessment(_previous: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireWriter()
  try {
    const projectId = Number(form.get('projectId'))
    saveItemAssessment(db, actor, { projectId, itemId: Number(form.get('itemId')), activityId: form.get('activityId') ? Number(form.get('activityId')) : null, detail: String(form.get('detail')), qty: Number(form.get('qty')), level: String(form.get('level')) as 'L' | 'M' | 'H', dimensions: form.getAll('dimensions').map(Number), evidence: String(form.get('evidence') ?? ''), reason: String(form.get('reason') ?? ''), applyLevel: form.get('intent') === 'apply' })
    revalidatePath(`/projects/${projectId}`)
    revalidatePath(`/projects/${projectId}/summary`)
    return { ok: form.get('intent') === 'apply' ? 'ใช้ระดับและคำนวณ MD ของรายการนี้แล้ว (เก็บ MD ที่แก้เองไว้)' : 'บันทึกเกณฑ์และ Dimensions แล้ว' }
  } catch (e) { return { error: e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ' } }
}
