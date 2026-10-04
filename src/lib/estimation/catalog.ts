import proposals from './proposals.json'
import mappings from './proposalActivities.json'
import proposedMD from './proposedMD.json'
import dimensions from './dimensions.json'

export const DIMENSIONS = dimensions.map(d => ({ ...d, activities: d.no === 9 ? [...d.activities, '19.1', '19.2'] : d.no === 11 ? [...d.activities, '15.2'] : d.activities }))
export const SCOPE_STATES = { needs_info: 'รอข้อมูล', in_scope: 'มีงานในขอบเขต', out_of_scope: 'ไม่มีงานในขอบเขต' } as const
export const PROFILE_GUIDANCE = proposals.filter(p => p.kind === 'profile')
export type ScopeStatus = keyof typeof SCOPE_STATES
export type ScopeRecord = { dimension: number; status: ScopeStatus; detail: string }
export type Assessment = { activityCode: string; level: 'L' | 'M' | 'H'; criterion: string; evidence: string; reason: string; dimensions: number[]; assessedBy: number; assessedAt: string; input: { detail: string; qty: number }; version: string }
const newCodes: Record<string, string> = { 'Performance Tuning': '19.1', 'Performance / Load Test': '19.2', 'Training / Knowledge Transfer': '15.2' }
export const NEW_ACTIVITIES = Object.entries(proposedMD).map(([name, draft], index) => ({
  code: newCodes[name], name, groupName: index === 2 ? 'Documentation & Training' : 'Performance',
  countUnit: draft.unit, assumptions: draft.assumptions, basis: draft.basis,
  roles: draft.roles as Record<string, number[]>, totals: [0, 1, 2].map(i => Object.values(draft.roles).reduce((sum, values) => sum + values[i], 0)),
}))
export function reviewedCriterion(code: string) {
  const proposal = proposals.find(p => p.kind !== 'profile' && (
    (mappings as Record<string, string[]>)[p.code]?.includes(code) || p.code === code || newCodes[p.title] === code
  ))
  if (!proposal) return undefined
  const draft = NEW_ACTIVITIES.find(a => a.code === code)
  return { ...proposal, assumptions: draft?.assumptions ?? '', basis: draft?.basis ?? '' }
}
export function criterionText(code: string, level: 'L' | 'M' | 'H') {
  return reviewedCriterion(code)?.levels[{ L: 0, M: 1, H: 2 }[level]].map(line => `- ${line}`).join('\n')
}
export function assessmentIsCurrent(assessment: Assessment | null | undefined, item: { detail: string; qty: number; complexity: string; complexityFacts?: string | null }, code: string | null) {
  return !!assessment && assessment.activityCode === code && assessment.level === item.complexity && assessment.input.detail === item.detail && assessment.input.qty === item.qty && (item.complexityFacts === undefined || item.complexityFacts === assessment.evidence)
}
