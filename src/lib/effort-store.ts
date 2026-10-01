import { and, eq, sql } from 'drizzle-orm'
import type { Db } from './db/connect'
import { projectItemMandays, projectItems, projectPhases, projects, roles, techStacks, projectModifiers, stackModifiers, matrixCells } from './db/schema'
import { DELIVERY_PROFILES, effortCellSchema, isMatrixProfile, itemEvidenceSchema } from './delivery-profiles'
import { z } from 'zod'
import { round2, effectiveMultiplier, buildMatrixLookup, standardManday } from './estimate'

type Actor = { userId: number; role: 'admin' | 'estimator' | 'viewer' }
type Connection = Pick<Db, 'select' | 'update'>
function requireWrite(actor: Actor) {
  if (!Number.isInteger(actor.userId) || actor.userId <= 0) throw new Error('ไม่มีสิทธิ์ทำรายการ')
  if (actor.role !== 'admin' && actor.role !== 'estimator') throw new Error('บัญชีนี้ดูข้อมูลได้อย่างเดียว')
}
function requireItem(db: Connection, projectId: number, itemId: number) {
  const item = db.select().from(projectItems).where(and(eq(projectItems.id, itemId), eq(projectItems.projectId, projectId))).get()
  if (!item) throw new Error('ไม่พบรายการในโครงการนี้')
  return item
}
function touch(db: Connection, projectId: number) {
  db.update(projects).set({ updatedAt: sql`(unixepoch())` }).where(eq(projects.id, projectId)).run()
}

export function updateGeneratedItem(db: Db, actor: Actor, input: { projectId: number; itemId: number; detail: string; qty: number }) {
  requireWrite(actor)
  const v = z.object({ projectId: z.number().int().positive(), itemId: z.number().int().positive(), detail: z.string().trim().min(1), qty: z.number().finite().min(0) }).parse(input)
  return db.transaction(tx => {
    const item = requireItem(tx, v.projectId, v.itemId)
    tx.update(projectItems).set({ detail: v.detail, qty: v.qty,
      baselineConfirmed: item.detail === v.detail && item.qty === v.qty ? item.baselineConfirmed : false,
    }).where(eq(projectItems.id, item.id)).run()
    touch(tx, v.projectId)
  })
}

export function saveEffortCell(db: Db, actor: Actor, input: z.input<typeof effortCellSchema>) {
  requireWrite(actor)
  const v = effortCellSchema.parse(input)
  return db.transaction(tx => {
    requireItem(tx, v.projectId, v.itemId)
    const previous = tx.select().from(projectItemMandays).where(and(eq(projectItemMandays.itemId, v.itemId), eq(projectItemMandays.roleId, v.roleId))).get()
    if (previous?.manday !== round2(v.manday)) tx.update(projectItems).set({ baselineConfirmed: false }).where(eq(projectItems.id, v.itemId)).run()
    if (!tx.select({ id: roles.id }).from(roles).where(and(eq(roles.id, v.roleId), eq(roles.active, true))).get()) {
      throw new Error('ไม่พบบทบาท')
    }
    const values = { manday: round2(v.manday), commercialManday: v.commercialManday == null ? null : round2(v.commercialManday),
      actualManday: v.actualManday == null ? null : round2(v.actualManday), billable: v.billable, overridden: true, explicitEffort: true }
    tx.insert(projectItemMandays).values({ itemId: v.itemId, roleId: v.roleId, ...values }).onConflictDoUpdate({
      target: [projectItemMandays.itemId, projectItemMandays.roleId], set: values,
    }).run()
    touch(tx, v.projectId)
  })
}

/** Stack changes preserve overrides; a requested reset affects only matrix profiles. */
export function rebuildProjectMandays(db: Db, actor: Actor, projectId: number, resetOverrides = false) {
  requireWrite(actor)
  return db.transaction(tx => {
    const project = tx.select().from(projects).where(eq(projects.id, projectId)).get()
    if (!project) throw new Error('ไม่พบโครงการ')
    const stack = project.techStackId == null ? null : tx.select().from(techStacks).where(eq(techStacks.id, project.techStackId)).get()
    const modifiers = tx.select({ multiplier: stackModifiers.multiplier }).from(projectModifiers).innerJoin(stackModifiers, eq(stackModifiers.id, projectModifiers.modifierId)).where(eq(projectModifiers.projectId, projectId)).all()
    const multiplier = effectiveMultiplier(stack?.multiplier, modifiers.map(m => m.multiplier))
    const matrix = buildMatrixLookup(tx.select().from(matrixCells).all())
    const roleRows = tx.select().from(roles).where(eq(roles.active, true)).all()
    const phaseById = new Map(tx.select().from(projectPhases).where(eq(projectPhases.projectId, projectId)).all().map(p => [p.id, p]))
    for (const item of tx.select().from(projectItems).where(eq(projectItems.projectId, projectId)).all()) {
      const phase = phaseById.get(item.phaseId)
      if (!phase || !isMatrixProfile(phase.deliveryProfile)) continue
      for (const role of roleRows) {
        const existing = tx.select().from(projectItemMandays).where(and(eq(projectItemMandays.itemId, item.id), eq(projectItemMandays.roleId, role.id))).get()
        if (existing?.overridden && !resetOverrides) continue
        const manday = standardManday({ matrix, activityId: item.activityId, role, complexity: item.complexity, qty: item.qty, stackMultiplier: multiplier })
        if (existing?.manday !== manday) tx.update(projectItems).set({ baselineConfirmed: false }).where(eq(projectItems.id, item.id)).run()
        tx.insert(projectItemMandays).values({ itemId: item.id, roleId: role.id, manday }).onConflictDoUpdate({
          target: [projectItemMandays.itemId, projectItemMandays.roleId], set: { manday, overridden: false, explicitEffort: false },
        }).run()
      }
    }
    touch(tx, projectId)
  })
}

export function saveItemEvidence(db: Db, actor: Actor, input: z.input<typeof itemEvidenceSchema>) {
  requireWrite(actor)
  const v = itemEvidenceSchema.parse(input)
  return db.transaction(tx => {
    const item = requireItem(tx, v.projectId, v.itemId)
    const phase = tx.select().from(projectPhases).where(eq(projectPhases.id, item.phaseId)).get()!
    tx.update(projectItems).set({ sourceReference: v.sourceReference || null, baselineConfirmed: v.baselineConfirmed,
      complexityFacts: v.complexityFacts || null,
      // Matrix units are governed by the activity; manual units only apply to direct effort.
      countUnit: isMatrixProfile(phase.deliveryProfile) ? null : v.countUnit || null,
    }).where(eq(projectItems.id, item.id)).run()
    touch(tx, v.projectId)
  })
}

export function changeDeliveryProfile(db: Db, actor: Actor, input: { projectId: number; phaseId: number; profile: string }) {
  requireWrite(actor)
  const profile = z.enum(DELIVERY_PROFILES).parse(input.profile)
  return db.transaction(tx => {
    const phase = tx.select().from(projectPhases).where(and(eq(projectPhases.id, input.phaseId), eq(projectPhases.projectId, input.projectId))).get()
    if (!phase) throw new Error('ไม่พบกลุ่มงานในโครงการนี้')
    if (phase.deliveryProfile === profile) return false
    tx.update(projectPhases).set({ deliveryProfile: profile }).where(eq(projectPhases.id, phase.id)).run()
    tx.update(projectItems).set({ baselineConfirmed: false }).where(eq(projectItems.phaseId, phase.id)).run()
    if (!isMatrixProfile(profile)) {
      const items = tx.select({ id: projectItems.id }).from(projectItems).where(eq(projectItems.phaseId, phase.id)).all()
      for (const item of items) tx.update(projectItemMandays).set({ manday: 0 }).where(and(eq(projectItemMandays.itemId, item.id), eq(projectItemMandays.overridden, false))).run()
    }
    touch(tx, input.projectId)
    return true
  })
}
