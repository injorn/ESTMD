import 'server-only'

import {
  buildMatrixLookup,
  defaultItemDetail,
  round2,
  standardManday,
} from './estimate'
import { ONCE_PER_PROJECT_UNIT } from './db/schema'
import type { ProjectDetail } from './queries'
import { isMatrixProfile, profileLabel, type DeliveryProfile } from './delivery-profiles'

/** Roles whose man-days are the sizing basis every ratio is measured against. */
const DEV_CODES = ['DEV', 'DEV_SR']

export type SummaryRole = {
  id: number
  code: string
  name: string
  seniority: 'senior' | 'junior'
  scope: 'item' | 'phase'
  resourceLabel: string | null
  personName: string | null
  ratePerMd: number
  manday: number
  cost: number
  billableManday: number
  /** Share of Developer man-days this role actually came out at. */
  actualRatio: number | null
  /** Share the standard expects, or null when the standard sets none. */
  targetRatio: number | null
}

export type SummaryItem = {
  id: number
  pendingEstimation: boolean
  detail: string
  activityLabel: string | null
  activityCode?: string | null
  countUnit: string | null
  complexity: 'L' | 'M' | 'H'
  qty: number
  dueDatePlan: string | null
  deliverables: string | null
  /** roleId -> manday, only for the roles being exported. */
  mandayByRole: Map<number, number>
  billableByRole: Map<number, number>
  commercialByRole: Map<number, number | null>
  actualByRole: Map<number, number | null>
  billingStatusByRole: Map<number, boolean>
  sourceReference: string | null
  baselineConfirmed: boolean
  complexityFacts: string | null
  total: number
}

export type SummaryPhase = {
  id: number
  name: string
  deliveryProfile: DeliveryProfile
  items: SummaryItem[]
  /** roleId -> manday for the phase-scoped roles, derived from the ratio. */
  derivedByRole: Map<number, number>
  /** Developer man-days keyed in this phase; the basis of the derivation. */
  devManday: number
  total: number
}

/**
 * The single model behind the summary screen and the Excel export, so the
 * numbers on screen are exactly the numbers in the file. Positive survey
 * answers without a saved item are represented as in-memory estimate rows.
 *
 * Item-scoped roles are added up from the keyed line items (bottom-up). Roles
 * an admin switched to phase scope are instead derived once per phase as a
 * share of that phase's Developer man-days (top-down), which is how the PSM
 * estimate treats PM / BA / Tester.
 */
export type SurveyRow = {
  code: string
  name: string
  groupName: string | null
  countUnit: string
  /** complexity -> quantity answered, 0 when left blank. */
  qty: Record<'L' | 'M' | 'H', number>
  total: number
  /** The wordings the estimator typed, one line per level that has one. */
  details: string[]
}

/**
 * The survey as answered, so the export can show how the line items were
 * derived: which topics were asked, and how many units at which level.
 * Topics left blank are kept, because "we asked and the answer was none" is
 * part of the basis of the estimate.
 */
function buildSurvey(detail: ProjectDetail) {
  const survey = detail.survey
  if (!survey) return null

  const rows: SurveyRow[] = survey.topics.map((topic) => {
    const qty = { L: 0, M: 0, H: 0 }
    const details: string[] = []
    for (const complexity of ['L', 'M', 'H'] as const) {
      const cell = detail.activityQty.get(`${topic.activityId}_${complexity}`)
      if (!cell) continue
      qty[complexity] = cell.qty
      if (cell.detail?.trim()) {
        details.push(`${complexity}: ${cell.detail.trim()}`)
      }
    }
    return {
      code: topic.code,
      name: topic.name,
      groupName: topic.groupName,
      countUnit: topic.countUnit,
      qty,
      total: round2(qty.L + qty.M + qty.H),
      details,
    }
  })

  const answered = rows.filter((r) => r.total > 0)

  return {
    name: survey.name,
    description: survey.description,
    rows,
    answeredTopics: answered.length,
    totalTopics: rows.length,
    totalQty: round2(answered.reduce((sum, r) => sum + r.total, 0)),
  }
}

export function buildSummary(detail: ProjectDetail) {
  const estimatedItemIds = new Set(detail.mandays.filter(m => m.explicitEffort || m.overridden || m.manday > 0).map(m => m.itemId))
  const includedRoleIds = new Set(
    detail.projectRoles.filter((pr) => pr.included).map((pr) => pr.roleId),
  )
  const projectRoleById = new Map(
    detail.projectRoles.map((pr) => [pr.roleId, pr]),
  )

  const exportRoles = detail.roles
    .filter((r) => includedRoleIds.has(r.id))
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const devRoleIds = new Set(
    detail.roles.filter((r) => DEV_CODES.includes(r.code)).map((r) => r.id),
  )

  const activityById = new Map(detail.activities.map((a) => [a.id, a]))
  const matrix = buildMatrixLookup(detail.matrixCells)
  const mandayOf = new Map(
    detail.mandays.map((m) => [`${m.itemId}_${m.roleId}`, m]),
  )

  const phases: SummaryPhase[] = detail.phases.map((phase) => {
    const matrixBacked = isMatrixProfile(phase.deliveryProfile)
    const explicitPhaseRoles = new Set(detail.mandays.filter(m => (m.explicitEffort || (phase.deliveryProfile === 'self_dev' && m.overridden)) && detail.items.some(i => i.id === m.itemId && i.phaseId === phase.id)).map(m => m.roleId))
    const items: SummaryItem[] = detail.items
      .filter((i) => i.phaseId === phase.id)
      .map((item) => {
        const activity = item.activityId
          ? activityById.get(item.activityId)
          : null
        const mandayByRole = new Map<number, number>()
        const billableByRole = new Map<number, number>()
        const commercialByRole = new Map<number, number | null>()
        const actualByRole = new Map<number, number | null>()
        const billingStatusByRole = new Map<number, boolean>()
        for (const role of exportRoles) {
          const cell = mandayOf.get(`${item.id}_${role.id}`)
          const phaseRole = matrixBacked && role.scope === 'phase'
          const explicit = cell?.explicitEffort || (phase.deliveryProfile === 'self_dev' && cell?.overridden)
          const md = phaseRole && (!explicitPhaseRoles.has(role.id) || !explicit) ? 0 : cell?.manday ?? 0
          mandayByRole.set(role.id, md)
          billableByRole.set(role.id, cell?.billable === false ? 0 : md)
          commercialByRole.set(role.id, cell?.commercialManday ?? null)
          actualByRole.set(role.id, cell?.actualManday ?? null)
          billingStatusByRole.set(role.id, cell?.billable ?? true)
        }
        return {
          id: item.id,
          pendingEstimation: (!matrixBacked || item.activityId == null) && !item.baselineConfirmed && !estimatedItemIds.has(item.id),
          detail: item.detail,
          activityLabel: activity ? `${activity.code} ${activity.name}` : null,
          activityCode: activity?.code ?? null,
          countUnit: matrixBacked ? activity?.countUnit ?? null : item.countUnit ?? activity?.countUnit ?? 'ต่อรายการ',
          complexity: item.complexity,
          qty: item.qty,
          dueDatePlan: item.dueDatePlan,
          deliverables: item.deliverables,
          mandayByRole,
          billableByRole, commercialByRole, actualByRole, billingStatusByRole,
          sourceReference: item.sourceReference,
          baselineConfirmed: item.baselineConfirmed,
          complexityFacts: item.complexityFacts,
          total: round2([...mandayByRole.values()].reduce((s, v) => s + v, 0)),
        }
      })

    return {
      id: phase.id,
      name: phase.name,
      deliveryProfile: phase.deliveryProfile,
      items,
      derivedByRole: new Map(),
      devManday: 0,
      total: 0,
    }
  })

  const representedAnswers = new Set(
    detail.items
      .filter((item) => item.activityId != null)
      .map((item) => `${item.activityId}_${item.complexity}`),
  )
  let nextVirtualPhaseId = -1
  let nextVirtualItemId = -1

  for (const topic of detail.survey?.topics ?? []) {
    const activity = activityById.get(topic.activityId)
    if (!activity) continue

    for (const complexity of ['L', 'M', 'H'] as const) {
      const answer = detail.activityQty.get(`${topic.activityId}_${complexity}`)
      if (!answer || answer.qty <= 0) continue

      const answerKey = `${topic.activityId}_${complexity}`
      if (representedAnswers.has(answerKey)) continue
      representedAnswers.add(answerKey)

      const qty =
        activity.countUnit === ONCE_PER_PROJECT_UNIT ? 1 : answer.qty
      const detailText =
        answer.detail?.trim() ||
        defaultItemDetail(activity.name, activity.countUnit, qty)
      const phaseName = activity.groupName ?? activity.name
      let phase = phases.find((candidate) => candidate.name === phaseName)

      if (!phase) {
        phase = {
          id: nextVirtualPhaseId--,
          name: phaseName,
          deliveryProfile: 'legacy',
          items: [],
          derivedByRole: new Map(),
          devManday: 0,
          total: 0,
        }
        phases.push(phase)
      }

      const mandayByRole = new Map<number, number>()
      for (const role of exportRoles) {
        mandayByRole.set(
          role.id,
          !isMatrixProfile(phase.deliveryProfile) || role.scope === 'phase'
            ? 0
            : standardManday({
                matrix,
                activityId: activity.id,
                role,
                complexity,
                qty,
                stackMultiplier: detail.effectiveMultiplier,
              }),
        )
      }

      phase.items.push({
        id: nextVirtualItemId--,
        detail: detailText,
        activityLabel: `${activity.code} ${activity.name}`,
        activityCode: activity.code,
        countUnit: activity.countUnit,
        complexity,
        qty,
        dueDatePlan: null,
        deliverables: null,
        mandayByRole,
        billableByRole: new Map(mandayByRole),
        commercialByRole: new Map(), actualByRole: new Map(),
        billingStatusByRole: new Map(),
        sourceReference: null, baselineConfirmed: false, complexityFacts: null, pendingEstimation: false,
        total: round2(
          [...mandayByRole.values()].reduce((sum, md) => sum + md, 0),
        ),
      })
    }
  }

  for (const phase of phases) {
    // Developer man-days of this phase drive every phase-scoped role.
    phase.devManday = round2(
      phase.items.reduce(
        (sum, item) =>
          sum +
          [...devRoleIds].reduce(
            (subtotal, id) => subtotal + (item.mandayByRole.get(id) ?? 0),
            0,
          ),
        0,
      ),
    )

    for (const role of exportRoles) {
      if (!isMatrixProfile(phase.deliveryProfile)) continue
      if (detail.mandays.some(m => m.roleId === role.id && (m.explicitEffort || (phase.deliveryProfile === 'self_dev' && m.overridden)) && detail.items.some(i => i.id === m.itemId && i.phaseId === phase.id))) continue
      if (role.scope !== 'phase' || !role.ratioOfDev) continue
      phase.derivedByRole.set(
        role.id,
        round2(phase.devManday * role.ratioOfDev),
      )
    }

    const itemTotal = phase.items.reduce((sum, item) => sum + item.total, 0)
    const derivedTotal = [...phase.derivedByRole.values()].reduce(
      (sum, manday) => sum + manday,
      0,
    )
    phase.total = round2(itemTotal + derivedTotal)
  }

  const devTotal = round2(phases.reduce((s, p) => s + p.devManday, 0))
  const hasDirectPhases = phases.some(p => !isMatrixProfile(p.deliveryProfile) && p.items.length > 0)

  const roles: SummaryRole[] = exportRoles.map((role) => {
    const pr = projectRoleById.get(role.id)
    const manday = round2(
      phases.reduce(
        (sum, phase) =>
          sum +
          (phase.derivedByRole.get(role.id) ?? 0) + phase.items.reduce(
                (s, i) => s + (i.mandayByRole.get(role.id) ?? 0),
                0,
              ),
        0,
      ),
    )
    const ratePerMd = pr?.ratePerMd ?? role.ratePerMd
    const billableManday = round2(phases.reduce((sum, p) => sum + (p.derivedByRole.get(role.id) ?? 0) + p.items.reduce((s, i) => s + (i.billableByRole.get(role.id) ?? 0), 0), 0))
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      seniority: role.seniority,
      scope: role.scope,
      resourceLabel: pr?.resourceLabel ?? null,
      personName: pr?.personName ?? null,
      ratePerMd,
      manday,
      billableManday,
      cost: round2(billableManday * ratePerMd),
      actualRatio:
        devTotal > 0 && !DEV_CODES.includes(role.code)
          ? Math.round((manday / devTotal) * 1000) / 1000
          : null,
      targetRatio: hasDirectPhases ? null : role.ratioOfDev,
    }
  })

  const totalManday = round2(roles.reduce((s, r) => s + r.manday, 0))
  const cost = round2(roles.reduce((s, r) => s + r.cost, 0))
  const bufferPercent = detail.project.bufferPercent
  const bufferAmount = round2((cost * bufferPercent) / 100)
  const warnings: string[] = []
  if (hasDirectPhases) warnings.push('กลุ่มงาน SAP / Vendor / Migration ลง MD รวมโดยตรง; ไม่ใช้เป้า ratio รวมทั้งโครงการ')
  for (const phase of phases) {
    for (const item of phase.items) {
      if (item.pendingEstimation) warnings.push(`${phase.name}: “${item.detail}” ยังไม่จับคู่ Matrix หรือประเมิน MD ตามบทบาท`)
    }
    if (!isMatrixProfile(phase.deliveryProfile) && phase.items.some(i => i.total === 0)) warnings.push(`${phase.name}: มีรายการยังไม่มี MD ที่ประเมิน (${profileLabel(phase.deliveryProfile)})`)
    const codes = new Set(detail.items.filter(i => i.phaseId === phase.id).map(i => activityById.get(i.activityId ?? 0)?.code))
    if (codes.has('1.2') && (codes.has('1.1') || codes.has('1.3'))) warnings.push(`${phase.name}: มีทั้ง CRUD + Import และ CRUD แยก; ตรวจว่าเป็นคนละขอบเขตงานเพื่อไม่ให้นับซ้ำ`)
    if (codes.has('2') && codes.has('6')) warnings.push(`${phase.name}: ตรวจขอบเขต Data preparation ที่รวมใน Dashboard และ Migration ไม่ให้นับซ้ำ`)
  }
  for (const role of roles) if (role.billableManday > 0 && role.ratePerMd === 0) warnings.push(`${role.name}: มีแรงงานคิดเงินแต่ยังไม่ได้ระบุอัตรา/MD`)

  return {
    project: detail.project,
    survey: buildSurvey(detail),
    stack: detail.stack,
    stackMultiplier: detail.stackMultiplier,
    modifiers: detail.modifiers,
    effectiveMultiplier: detail.effectiveMultiplier,
    phases,
    roles,
    devTotal,
    totalManday,
    billableManday: round2(roles.reduce((sum, r) => sum + r.billableManday, 0)),
    warnings,
    /** Cost before the contingency buffer. */
    cost,
    bufferPercent,
    bufferAmount,
    totalCost: round2(cost + bufferAmount),
    itemCount: phases.reduce((s, p) => s + p.items.length, 0),
  }
}

export type Summary = ReturnType<typeof buildSummary>
