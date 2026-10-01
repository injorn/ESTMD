import { and, asc, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../db/connect'
import { activities, evaluationCases, evaluationCaseReviews, matrixCells, projectItems,
  projectModifiers, projectRoles, projectPhases, projects, roles, stackModifiers, techStacks, users, ONCE_PER_PROJECT_UNIT } from '../db/schema'
import { isMatrixProfile } from '../delivery-profiles'
import { effectiveMultiplier } from '../estimate'
import { criteriaSnapshot, inputHash } from './policy'
import { evaluationCase, type EvaluationSnapshot } from './evaluation'

type Actor = { userId: number; role: 'admin' | 'estimator' | 'viewer' }
function requireActor(actor: Actor) {
  if (actor.role === 'viewer') throw new Error('บัญชีนี้เป็นสิทธิ์ดูอย่างเดียว')
  if (!Number.isInteger(actor.userId) || actor.userId <= 0 || !['admin', 'estimator'].includes(actor.role)) throw new Error('ไม่มีสิทธิ์ทำรายการ')
}

export function captureCases(db: Db, actor: Actor) {
  requireActor(actor)
  return db.transaction(tx => {
    const items = tx.select().from(projectItems).orderBy(asc(projectItems.id)).all()
    const activityById = new Map(tx.select().from(activities).all().map(a => [a.id, a]))
    const projectById = new Map(tx.select().from(projects).all().map(p => [p.id, p]))
    const roleRows = tx.select().from(roles).orderBy(asc(roles.id)).all()
    const chosenRoles = tx.select().from(projectRoles).all()
    const stackById = new Map(tx.select().from(techStacks).all().map(s => [s.id, s]))
    const modifierById = new Map(tx.select().from(stackModifiers).all().map(m => [m.id, m]))
    const chosenModifiers = tx.select().from(projectModifiers).orderBy(asc(projectModifiers.modifierId)).all()
    const cells = tx.select().from(matrixCells).all()
    const phaseById = new Map(tx.select().from(projectPhases).all().map(p => [p.id, p]))
    let captured = 0
    for (const item of items) {
      const activity = item.activityId ? activityById.get(item.activityId) : undefined
      const project = projectById.get(item.projectId)
      if (!activity || !project || item.qty <= 0) continue
      const phase = phaseById.get(item.phaseId)
      if (!phase || !isMatrixProfile(phase.deliveryProfile)) continue
      const multiplier = effectiveMultiplier(project.techStackId ? stackById.get(project.techStackId)?.multiplier : 1,
        chosenModifiers.filter(m => m.projectId === project.id).map(m => modifierById.get(m.modifierId)?.multiplier ?? 1))
      const rates = roleRows.filter(r => r.scope === 'item' && chosenRoles.some(pr => pr.projectId === project.id && pr.roleId === r.id && pr.included))
        .map(role => {
          const rate = (level: 'L' | 'M' | 'H') => cells.find(c => c.activityId === activity.id && c.roleId === role.id && c.complexity === level)?.manday ?? 0
          return { roleCode: role.code, L: rate('L'), M: rate('M'), H: rate('H'), multiplier: role.stackMultiplied ? multiplier : 1 }
        })
      if (!rates.length) continue
      const snapshot: EvaluationSnapshot = {
        id: String(item.id), itemId: item.id, projectId: project.id, projectName: project.name,
        activityCode: activity.code, activityName: activity.name, detail: item.detail, countUnit: activity.countUnit,
        expectedLevel: item.complexity, qty: activity.countUnit === ONCE_PER_PROJECT_UNIT ? 1 : item.qty,
        criteria: criteriaSnapshot(activity.code), rates,
      }
      evaluationCase.parse(snapshot)
      captured += tx.insert(evaluationCases).values({ sourceHash: inputHash(snapshot), snapshot, capturedBy: actor.userId }).onConflictDoNothing().run().changes
    }
    return captured
  })
}

export function listCases(db: Db) {
  return db.select({ id: evaluationCases.id, snapshot: evaluationCases.snapshot, status: evaluationCases.status,
    expectedLevel: evaluationCases.expectedLevel, reviewNote: evaluationCases.reviewNote, revision: evaluationCases.revision,
    reviewedAt: evaluationCases.reviewedAt, reviewer: users.name })
    .from(evaluationCases).leftJoin(users, eq(users.id, evaluationCases.reviewedBy)).orderBy(desc(evaluationCases.id)).all()
}

const reviewInput = z.object({
  id: z.coerce.number().int().positive(), revision: z.coerce.number().int().nonnegative(),
  status: z.enum(['reviewed', 'excluded']), level: z.enum(['L', 'M', 'H']).nullable(),
  note: z.string().trim().min(1, 'กรุณาระบุเหตุผลประกอบการตรวจ').max(2000),
}).refine(v => v.status !== 'reviewed' || v.level !== null, 'กรุณาเลือกระดับมาตรฐาน')

export function reviewCase(db: Db, actor: Actor, raw: unknown) {
  requireActor(actor)
  const input = reviewInput.parse(raw)
  return db.transaction(tx => {
    const row = tx.select().from(evaluationCases).where(eq(evaluationCases.id, input.id)).get()
    if (!row) throw new Error('ไม่พบรายการ')
    if (row.revision !== input.revision) throw new Error('รายการนี้มีการเปลี่ยนโดยผู้ตรวจคนอื่น กรุณาโหลดหน้าใหม่')
    const expectedLevel = input.status === 'reviewed' ? input.level : null
    tx.update(evaluationCases).set({ status: input.status, expectedLevel, reviewNote: input.note,
      revision: input.revision + 1, reviewedBy: actor.userId, reviewedAt: Math.floor(Date.now() / 1000) })
      .where(and(eq(evaluationCases.id, input.id), eq(evaluationCases.revision, input.revision))).run()
    tx.insert(evaluationCaseReviews).values({ caseId: input.id, revision: input.revision + 1,
      status: input.status, expectedLevel, note: input.note, reviewedBy: actor.userId }).run()
  })
}

export function exportCases(db: Db) {
  const cases = listCases(db).filter(c => c.status === 'reviewed' && c.expectedLevel).map(c => ({
    ...c.snapshot, id: String(c.id), sourceItemId: c.snapshot.itemId, expectedLevel: c.expectedLevel!,
    reviewed: true, reviewNote: c.reviewNote, reviewer: c.reviewer, reviewedAt: c.reviewedAt,
  }))
  return { exportedAt: new Date().toISOString(), cases }
}
