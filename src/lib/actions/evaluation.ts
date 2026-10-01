'use server'

import { revalidatePath } from 'next/cache'
import { ZodError } from 'zod'
import { requireWriter } from '@/lib/dal'
import { db } from '@/lib/db'
import { captureCases, reviewCase } from '@/lib/estimation-ai/case-store'

export type EvaluationActionState = { error?: string; ok?: string }
const route = '/matrix/ai-evaluation'

export async function captureEvaluationCases(_previous: EvaluationActionState, _form: FormData): Promise<EvaluationActionState> {
  void _previous
  void _form
  const user = await requireWriter()
  try {
    const count = captureCases(db, user)
    revalidatePath(route)
    return { ok: count ? `เพิ่ม ${count} รายการสำหรับตรวจแล้ว` : 'ไม่มีรายการใหม่ รายการเดิมยังอยู่ครบ' }
  } catch {
    return { error: 'เตรียมรายการไม่สำเร็จ กรุณาลองใหม่' }
  }
}

export async function reviewEvaluationCase(_previous: EvaluationActionState, form: FormData): Promise<EvaluationActionState> {
  const user = await requireWriter()
  try {
    reviewCase(db, user, { id: form.get('id'), revision: form.get('revision'), status: form.get('status'),
      level: form.get('level') || null, note: form.get('note') })
    revalidatePath(route)
    return { ok: 'บันทึกผลตรวจแล้ว' }
  } catch (error) {
    return { error: error instanceof ZodError ? error.issues[0].message : error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ' }
  }
}
