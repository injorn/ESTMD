import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from './db/connect'
import { activities, matrixCells, projectItems, projectItemMandays, projectScopeDimensions, projectPhases, projects, roles, techStacks, projectModifiers, stackModifiers } from './db/schema'
import { criteriaSnapshot } from './estimation-ai/policy'
import { DIMENSIONS, criterionText, reviewedCriterion, type Assessment } from './estimation/catalog'
import { isMatrixProfile } from './delivery-profiles'
import { effectiveMultiplier, round2 } from './estimate'

type Actor = { userId: number; role: 'admin' | 'estimator' | 'viewer' }
const dimensionIds = z.array(z.number().int().min(1).max(11)).max(11).refine(ids => new Set(ids).size === ids.length)
function authorize(actor: Actor) {
  if (actor.userId <= 0 || !Number.isInteger(actor.userId) || actor.role === 'viewer') throw new Error('ไม่มีสิทธิ์แก้ไขข้อมูล')
}
const scopeSchema = z.object({ projectId: z.number().int().positive(), rows: z.array(z.object({ dimension: z.number().int().min(1).max(11), status: z.enum(['needs_info', 'in_scope', 'out_of_scope']), detail: z.string().trim().max(4000) })).length(11).refine(rows => new Set(rows.map(r => r.dimension)).size === 11) })
export function saveProjectScope(db: Db, actor: Actor, input: z.input<typeof scopeSchema>) {
  authorize(actor)
  const v = scopeSchema.parse(input)
  db.transaction(tx => {
    if (!tx.select().from(projects).where(eq(projects.id, v.projectId)).get()) throw new Error('ไม่พบโครงการ')
    for (const row of v.rows) tx.insert(projectScopeDimensions).values({ projectId: v.projectId, ...row }).onConflictDoUpdate({ target: [projectScopeDimensions.projectId, projectScopeDimensions.dimension], set: row }).run()
    tx.update(projects).set({ updatedAt: sql`(unixepoch())` }).where(eq(projects.id, v.projectId)).run()
  })
}
const assessmentSchema = z.object({ projectId: z.number().int().positive(), itemId: z.number().int().positive(), activityId: z.number().int().positive().nullable(), detail: z.string(), qty: z.number().finite().min(0), level: z.enum(['L', 'M', 'H']), dimensions: dimensionIds, evidence: z.string().trim().min(1, 'ระบุข้อเท็จจริงและเหตุผลที่ตรงกับเกณฑ์').max(4000), reason: z.string().trim().max(2000), applyLevel: z.boolean() })
export function saveItemAssessment(db: Db, actor: Actor, input: z.input<typeof assessmentSchema>) {
  authorize(actor)
  const v = assessmentSchema.parse(input)
  return db.transaction(tx => {
    const item = tx.select().from(projectItems).where(and(eq(projectItems.id, v.itemId), eq(projectItems.projectId, v.projectId))).get()
    if (!item) throw new Error('ไม่พบรายการในโครงการนี้')
    if (item.detail !== v.detail || item.qty !== v.qty || item.activityId !== v.activityId) throw new Error('รายการเปลี่ยนแล้ว กรุณาโหลดใหม่ก่อนประเมิน')
    const phase = tx.select().from(projectPhases).where(and(eq(projectPhases.id, item.phaseId), eq(projectPhases.projectId, v.projectId))).get()
    if (!phase) throw new Error('ไม่พบกลุ่มงาน')
    const activity = item.activityId == null ? null : tx.select().from(activities).where(eq(activities.id, item.activityId)).get()
    if (v.applyLevel && (!isMatrixProfile(phase.deliveryProfile) || !activity)) throw new Error('รายการนี้ลง MD ตามบทบาท ใช้ระดับ Matrix ไม่ได้')
    if (!v.applyLevel && v.level !== item.complexity) throw new Error('กดใช้ระดับและคำนวณ MD หากต้องการเปลี่ยนระดับ')
    if (v.level !== item.complexity && !v.reason) throw new Error('ระบุเหตุผลเมื่อเปลี่ยนระดับ')
    const snapshot = activity ? criteriaSnapshot(activity.code) : null
    const key = { L: 'low', M: 'medium', H: 'high' }[v.level] as 'low' | 'medium' | 'high'
    const criterion = isMatrixProfile(phase.deliveryProfile) && activity ? [...new Set([snapshot?.source?.[key], criterionText(activity.code, v.level)].filter(Boolean))].join('\n\n') : 'ลง MD ตามบทบาทและขอบเขตงานที่ตกลง'
    if (v.applyLevel && !criterion) throw new Error('ยังไม่มีเกณฑ์สำหรับกิจกรรมนี้ กรุณาลง MD ตามบทบาทพร้อมเหตุผล')
    const assessment: Assessment = { activityCode: activity?.code ?? '', level: v.level, criterion: criterion || v.evidence, evidence: v.evidence, reason: v.reason, dimensions: v.dimensions, assessedBy: actor.userId, assessedAt: new Date().toISOString(), input: { detail: item.detail, qty: item.qty }, version: snapshot?.version ?? 'direct-effort' }
    tx.update(projectItems).set({ dimensionIds: v.dimensions, assessment, complexityFacts: v.evidence, complexity: v.level, baselineConfirmed: v.applyLevel ? false : item.baselineConfirmed }).where(eq(projectItems.id, item.id)).run()
    if (v.applyLevel && activity) {
      const project = tx.select().from(projects).where(eq(projects.id, v.projectId)).get()!
      const stack = project.techStackId ? tx.select().from(techStacks).where(eq(techStacks.id, project.techStackId)).get() : null
      const modifiers = tx.select({ multiplier: stackModifiers.multiplier }).from(projectModifiers).innerJoin(stackModifiers, eq(stackModifiers.id, projectModifiers.modifierId)).where(eq(projectModifiers.projectId, v.projectId)).all()
      const multiplier = effectiveMultiplier(stack?.multiplier, modifiers.map(m => m.multiplier))
      for (const role of tx.select().from(roles).where(eq(roles.active, true)).all()) {
        const existing = tx.select().from(projectItemMandays).where(and(eq(projectItemMandays.itemId, item.id), eq(projectItemMandays.roleId, role.id))).get()
        if (existing?.overridden) continue
        const base = tx.select().from(matrixCells).where(and(eq(matrixCells.activityId, activity.id), eq(matrixCells.roleId, role.id), eq(matrixCells.complexity, v.level))).get()?.manday ?? 0
        const manday = round2(base * item.qty * (role.stackMultiplied ? multiplier : 1))
        tx.insert(projectItemMandays).values({ itemId: item.id, roleId: role.id, manday }).onConflictDoUpdate({ target: [projectItemMandays.itemId, projectItemMandays.roleId], set: { manday } }).run()
      }
    }
    tx.update(projects).set({ updatedAt: sql`(unixepoch())` }).where(eq(projects.id, v.projectId)).run()
    return { assessment, guidance: activity ? reviewedCriterion(activity.code)?.review : DIMENSIONS.filter(d => v.dimensions.includes(d.no)).map(d => d.overlap).join('\n') }
  })
}
