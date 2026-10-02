import { and, eq } from 'drizzle-orm'
import type { Db } from '../db/connect'
import { activities, matrixCells, ONCE_PER_PROJECT_UNIT, projectItemMandays, projectItems, projectPhases, projectRoles, projects, roles, techStacks } from '../db/schema'
import { isMatrixProfile } from '../delivery-profiles'
import { buildMatrixLookup, standardManday } from '../estimate'
import { columnLabel, importProjectSchema, ImportInputError } from './model'

type Actor = { userId: number; role: 'admin' | 'estimator' | 'viewer' }

/** Accepts reviewed tasks, never historical MD. All writes succeed or roll back together. */
export function createImportedProject(db: Db, actor: Actor, input: unknown): number {
  if (!Number.isInteger(actor.userId) || actor.userId <= 0 || !['admin', 'estimator'].includes(actor.role)) throw new Error('ไม่มีสิทธิ์นำเข้าโครงการ')
  const values = importProjectSchema.parse(input)
  return db.transaction(tx => {
    const stack = values.techStackId == null ? null : tx.select().from(techStacks)
      .where(and(eq(techStacks.id, values.techStackId), eq(techStacks.active, true))).get()
    if (values.techStackId != null && !stack) throw new ImportInputError('ไม่พบ Technology Stack ที่ใช้งานอยู่')
    const activeActivities = new Map(tx.select().from(activities).where(eq(activities.active, true)).all().map(a => [a.id, a]))
    for (const row of values.rows) if (row.activityId != null && !activeActivities.has(row.activityId)) throw new ImportInputError(`ไม่พบกิจกรรม Matrix ของแถว ${row.sourceRow}`)
    const activeRoles = tx.select().from(roles).where(eq(roles.active, true)).all()
    const matrix = buildMatrixLookup(tx.select().from(matrixCells).all())
    const project = tx.insert(projects).values({ name: values.name, code: values.code || null,
      techStackId: values.techStackId, ownerId: actor.userId, wizardStep: 3 }).returning({ id: projects.id }).get()
    if (activeRoles.length) tx.insert(projectRoles).values(activeRoles.map(role => ({ projectId: project.id,
      roleId: role.id, ratePerMd: role.ratePerMd, sortOrder: role.sortOrder,
      included: ['SA', 'BA', 'DEV_SR', 'DEV', 'TESTER'].includes(role.code),
    }))).run()
    const phaseIds = new Map<string, number>()
    values.rows.forEach((row, index) => {
      const profile = values.profiles[row.phase]
      let phaseId = phaseIds.get(row.phase)
      if (phaseId == null) {
        const phase = tx.insert(projectPhases).values({ projectId: project.id, name: row.phase,
          deliveryProfile: profile, sortOrder: (phaseIds.size + 1) * 10 }).returning({ id: projectPhases.id }).get()
        phaseId = phase.id
        phaseIds.set(row.phase, phaseId)
      }
      const activity = row.activityId == null ? null : activeActivities.get(row.activityId)!
      const qty = isMatrixProfile(profile) && activity?.countUnit === ONCE_PER_PROJECT_UNIT ? 1 : row.qty
      const item = tx.insert(projectItems).values({ projectId: project.id, phaseId, detail: row.detail,
        activityId: row.activityId, complexity: row.complexity ?? 'M', qty,
        deliverables: row.deliverables || null, dueDatePlan: row.dueDatePlan || null,
        sourceReference: `${values.fileName} / ${values.sheetName}!${columnLabel(row.detailColumn)}${row.sourceRow} / SHA256:${values.sha256}`,
        baselineConfirmed: false, sortOrder: (index + 1) * 10,
      }).returning({ id: projectItems.id }).get()
      // Missing match and direct profiles remain unestimated, without fabricated MD cells.
      if (activity && isMatrixProfile(profile) && activeRoles.length) {
        tx.insert(projectItemMandays).values(activeRoles.map(role => ({ itemId: item.id, roleId: role.id,
          manday: standardManday({ matrix, activityId: activity.id, role, complexity: row.complexity!, qty, stackMultiplier: stack?.multiplier ?? 1 }),
        }))).run()
      }
    })
    return project.id
  })
}
