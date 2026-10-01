import type { ProjectDetail } from './queries'
import { isMatrixProfile } from './delivery-profiles'
import { buildMatrixLookup, round2, standardManday } from './estimate'

export type CalibrationSample = {
  projectId: number; itemId: number; source: string; profile: string; activity: string;
  role: string; level: string; unit: string; qty: number; baseline: number; predicted: number;
  normalizedMdPerUnit: number; actual: number | null
}
const quantile = (values: number[], q: number) => {
  const ordered = [...values].sort((a, b) => a - b)
  const position = (ordered.length - 1) * q
  const lower = Math.floor(position)
  return ordered[lower] + (ordered[Math.ceil(position)] - ordered[lower]) * (position - lower)
}

/** Review-gated evidence report; never writes suggested rates to the matrix. */
export function buildCalibrationReport(details: ProjectDetail[]) {
  const samples: CalibrationSample[] = []
  const excluded: { projectId: number; itemId: number; reason: string }[] = []
  const seen = new Set<string>()
  for (const detail of details) {
    const matrix = buildMatrixLookup(detail.matrixCells)
    for (const item of detail.items) {
      const phase = detail.phases.find(p => p.id === item.phaseId)
      const activity = detail.activities.find(a => a.id === item.activityId)
      const reason = !phase || !isMatrixProfile(phase.deliveryProfile) ? 'direct profile: ไม่เทียบกับ generic Matrix'
        : !item.baselineConfirmed || !item.sourceReference?.trim() ? 'ยังไม่ยืนยัน Baseline/แหล่งอ้างอิง'
        : !item.complexityFacts?.trim() ? 'ยังไม่มีข้อเท็จจริงรองรับระดับ'
        : !activity || item.qty <= 0 ? 'ไม่มี activity/หน่วยนับ/จำนวนที่ใช้เทียบได้' : null
      if (reason) { excluded.push({ projectId: detail.project.id, itemId: item.id, reason }); continue }
      for (const cell of detail.mandays.filter(c => c.itemId === item.id && c.overridden)) {
        const role = detail.roles.find(r => r.id === cell.roleId)
        if (!role || role.scope !== 'item') continue
        if (!detail.matrixCells.some(c => c.activityId === activity!.id && c.roleId === role.id && c.complexity === item.complexity)) {
          excluded.push({ projectId: detail.project.id, itemId: item.id, reason: `ไม่มี Matrix สำหรับบทบาท ${role.code}` })
          continue
        }
        const key = `${item.sourceReference!.trim().toLowerCase()}|${activity!.code}|${role.code}|${item.complexity}`
        if (seen.has(key)) { excluded.push({ projectId: detail.project.id, itemId: item.id, reason: `แหล่งข้อมูลซ้ำ: ${role.code}` }); continue }
        seen.add(key)
        const multiplier = role.stackMultiplied ? detail.effectiveMultiplier : 1
        samples.push({ projectId: detail.project.id, itemId: item.id, source: item.sourceReference!,
          profile: phase!.deliveryProfile, activity: activity!.code, role: role.code, level: item.complexity,
          unit: activity!.countUnit, qty: item.qty, baseline: cell.manday,
          predicted: standardManday({ matrix, activityId: activity!.id, role, complexity: item.complexity, qty: item.qty, stackMultiplier: detail.effectiveMultiplier }),
          normalizedMdPerUnit: cell.manday / item.qty / multiplier, actual: cell.actualManday })
      }
    }
  }
  const byGroup = Map.groupBy(samples, s => `${s.profile}|${s.activity}|${s.role}|${s.level}|${s.unit}`)
  const groups = [...byGroup].map(([key, rows]) => ({ key, sampleCount: rows.length,
    projectCount: new Set(rows.map(r => r.projectId)).size,
    median: round2(quantile(rows.map(r => r.normalizedMdPerUnit), 0.5)),
    q1: round2(quantile(rows.map(r => r.normalizedMdPerUnit), 0.25)),
    q3: round2(quantile(rows.map(r => r.normalizedMdPerUnit), 0.75)),
    meanAbsoluteError: round2(rows.reduce((sum, r) => sum + Math.abs(r.predicted - r.baseline), 0) / rows.length),
    signedBias: round2(rows.reduce((sum, r) => sum + r.predicted - r.baseline, 0) / rows.length),
    projectErrors: [...Map.groupBy(rows, r => r.projectId)].map(([projectId, items]) => ({ projectId,
      baseline: round2(items.reduce((s, r) => s + r.baseline, 0)), predicted: round2(items.reduce((s, r) => s + r.predicted, 0)) })),
    status: 'review_only' as const,
  }))
  return { basis: 'confirmed_pre_budget_effort', groups, samples, excluded,
    note: 'สถิติเพื่อทบทวน ยังไม่ได้ fit ค่าหรือทำ validation บนโครงการที่กันไว้; Actual แยกจาก Baseline' }
}
