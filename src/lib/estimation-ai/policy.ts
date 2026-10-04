import { createHash } from 'node:crypto'
import { LEVEL_DEF } from '../work-level-criteria'
import { STANDARD } from '../standard'
import { reviewedCriterion, criterionText } from '../estimation/catalog'

export const CRITERIA_VERSION = 'level-def-2026-10-04-v2'
export const CRUD_CRITERIA_VERSION = 'matrix-v3-crud-2026-10-01-v1'
export type Level = 'L' | 'M' | 'H'
export type Facts = Record<string, number | boolean | undefined>
type Factor = { key: string; label: string; limits?: readonly [number, number, number?]; yes?: Level; no?: Level }
const count = (key: string, label: string, low: number, medium: number, high?: number): Factor =>
  ({ key, label, limits: [low, medium, high] })
const flag = (key: string, label: string, yes: Level, no: Level = 'L'): Factor => ({ key, label, yes, no })
const crud = [count('fields', 'จำนวนฟิลด์', 5, 10), count('tables', 'จำนวนตาราง', 1, 1), flag('complex', 'มี Popup Search หรือ Workflow ที่ซับซ้อน', 'H')]
const sap = [count('fields', 'จำนวนฟิลด์', 10, 20), flag('twoWay', 'มีทั้งขาส่งและขารับ', 'M')]
const change = [count('changes', 'จำนวนจุดที่แก้ไข', 5, 20), flag('complex', 'การแก้ไขซับซ้อน', 'H')]

/** Independent factors; select the highest. Numeric upper bounds are inclusive.
 * Uncovered combinations stay unresolved rather than inventing company policy. */
export const CRITERIA: Record<string, readonly Factor[]> = {
  'matrix-v3-crud': [
    flag('existingPattern', 'ทุก action รวม Import ใช้ library/pattern ที่มีอยู่ได้ทันที', 'L'),
    flag('businessLogic', 'มี business rule, workflow หรือ validation เพิ่มเติมใน action ใด', 'M'),
    flag('complexLogic', 'มีเงื่อนไขซ้อนกันซับซ้อน หรือหลาย state/role รวมถึง Import', 'H'),
    count('externalSystems', 'จำนวนระบบอื่นที่เชื่อมต่อในรายการนี้', 0, 1),
    flag('multiStepApproval', 'มีการอนุมัติหลายขั้น', 'H'),
    flag('securityCritical', 'งาน security-critical', 'H'),
  ],
  '1.1': [count('fields', 'จำนวนเงื่อนไขค้นหา', 5, 10), count('tables', 'จำนวนตาราง', 1, 1), flag('excel', 'Export Excel', 'H')],
  '1.2': crud, '1.3': crud,
  '2': [count('charts', 'จำนวน Chart', 1, 2, 4), count('drillDown', 'ระดับ Drill Down', 0, 1, 2)],
  '3': [count('fields', 'จำนวนเงื่อนไขค้นหา', 5, 10), count('tables', 'จำนวนตาราง', 1, 1), flag('simpleExcel', 'Export Excel แบบ Simple', 'M'), flag('complexExport', 'Export Excel แบบ Complex หรือ PDF', 'H')],
  '4': [flag('external', 'เชื่อมต่อระบบภายนอก', 'M'), flag('complexExternal', 'การเชื่อมต่อภายนอกซับซ้อน เช่น FTP/E-mail', 'H'), count('records', 'จำนวนข้อมูล', 100000, 100000)],
  '5.1': sap, '5.2': [count('tables', 'จำนวนตาราง SAP Master', 2, 4)], '5.3': sap,
  '10.1': [count('changes', 'จำนวน Issue', 5, 20), flag('complex', 'Issue ซับซ้อน', 'H')],
  '10.2': [count('changes', 'จำนวน Issue', 5, 20), flag('complex', 'Issue ซับซ้อน', 'H')],
  '10.3': change, '10.4': change,
  '11.1': [count('scenarios', 'จำนวน Scenario', 2, 5), count('testCases', 'จำนวน Test case สูงสุดต่อ Scenario', 3, 5)],
  '11.2': [count('userRoles', 'จำนวน User Role ของคู่มือ', 2, 5)],
  '11.3': [count('rounds', 'จำนวนครั้ง SIT', 2, 4, 6)],
  '11.4': [count('rounds', 'จำนวนครั้ง UAT', 2, 4, 6)],
}
const rank = { L: 0, M: 1, H: 2 }

export function evaluateCriteria(code: string, facts: Facts) {
  let factors = CRITERIA[code]
  const unresolved: string[] = []
  if (code.startsWith('10.')) {
    if (facts.newProject === undefined) unresolved.push('newProject: ระบุว่าเป็นโครงการใหม่หรือการแก้ไข')
    if (facts.newProject === true) factors = [count('forms', 'จำนวน Form ของโครงการใหม่', 0, 10)]
  }
  if (!factors) return { status: 'needs_review' as const, level: null, unresolved: ['ไม่มีเกณฑ์สำหรับกิจกรรมนี้'], evidence: [] }
  const evidence: { factor: string; value: number | boolean; level: Level }[] = []
  for (const factor of factors) {
    const value = facts[factor.key]
    if (value === undefined) { unresolved.push(`${factor.key}: ${factor.label}`); continue }
    let level: Level
    if (factor.limits) {
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw new Error(`Invalid ${factor.key}`)
      const [low, medium, high] = factor.limits
      if (high !== undefined && value > high) { unresolved.push(`${factor.key}: เกินช่วงเกณฑ์`); continue }
      // Zero charts/tables/forms/scenarios are not an estimable unit.
      if (value === 0 && !['drillDown', 'fields', 'records', 'changes', 'externalSystems'].includes(factor.key)) { unresolved.push(`${factor.key}: ไม่มีหน่วยงานให้ประเมิน`); continue }
      level = value <= low ? 'L' : value <= medium ? 'M' : 'H'
    } else {
      if (typeof value !== 'boolean') throw new Error(`Invalid ${factor.key}`)
      level = (value ? factor.yes : factor.no)!
    }
    evidence.push({ factor: factor.key, value, level })
  }
  if (['5.1', '5.3'].includes(code) && facts.twoWay === false && typeof facts.fields === 'number' && facts.fields > 10)
    unresolved.push('One-way มากกว่า 10 ฟิลด์ยังไม่มีเกณฑ์ใน LEVEL_DEF')
  if (code === '4' && facts.external === false && (facts.complexExternal === true || (typeof facts.records === 'number' && facts.records > 100000)))
    unresolved.push('งานภายในที่ซับซ้อนหรือข้อมูลมากยังไม่มีเกณฑ์ใน LEVEL_DEF')
  const level = unresolved.length ? null : evidence.reduce<Level>((best, e) => rank[e.level] > rank[best] ? e.level : best, 'L')
  return { status: level ? 'resolved' as const : 'needs_review' as const, level, unresolved, evidence }
}

/** Render the inclusive ranges used by evaluation, without overlapping levels. */
function describeFactors(factors: readonly Factor[], level: Level) {
  return factors.flatMap(factor => {
    if (!factor.limits) return factor.yes === level ? [`- ${factor.label}`] : []
    const [low, medium, high] = factor.limits
    const start = level === 'L' ? (['drillDown', 'fields', 'records', 'changes', 'externalSystems'].includes(factor.key) ? 0 : 1) : level === 'M' ? low + 1 : medium + 1
    const end = level === 'L' ? low : level === 'M' ? medium : high
    if (end !== undefined && start > end) return []
    const range = end === undefined ? `มากกว่า ${medium}` : start === end ? `${start}` : `${start}–${end}`
    return [`- ${factor.label}: ${range}`]
  }).join('\n') || 'ไม่มีปัจจัยเฉพาะระดับนี้'
}

export function criteriaSnapshot(code: string) {
  if (['1.1', '1.2', '1.3'].includes(code)) return {
    version: CRUD_CRITERIA_VERSION, code, sourceCode: 'matrix-v3-crud', integrationReady: true,
    source: { topic: 'CRUD รวมทุก action ในรายการ', low: STANDARD.complexityLegend[0].description,
      medium: STANDARD.complexityLegend[1].description, high: STANDARD.complexityLegend[2].description },
    factors: CRITERIA['matrix-v3-crud'], decision: 'highest-factor; all-actions-including-import; missing-needs-review', newProject: null,
  }
  const sourceCode = code === '15.1' ? '11.2' : code
  const reviewed = reviewedCriterion(code)
  if (!CRITERIA[sourceCode] && reviewed && code !== '11.2') return {
    version: 'reviewed-scope-2026-10-04', code, sourceCode: code, integrationReady: true,
    source: { topic: reviewed.title, low: criterionText(code, 'L')!, medium: criterionText(code, 'M')!, high: criterionText(code, 'H')! },
    factors: [] as Factor[], decision: 'qualitative-review-with-evidence; no-automatic-level', newProject: null,
  }
  const legacySource = LEVEL_DEF.find(row => (row.num !== null ? String(row.num) : row.topic.split(' ')[0]) === sourceCode)
  const integrationReady = !['1.1', '1.2', '1.3', '11.2'].includes(code) && !!CRITERIA[sourceCode]
  const source = integrationReady && legacySource ? {
    ...legacySource, low: describeFactors(CRITERIA[sourceCode], 'L'),
    medium: describeFactors(CRITERIA[sourceCode], 'M'), high: describeFactors(CRITERIA[sourceCode], 'H'),
  } : undefined
  return { version: CRITERIA_VERSION, code, sourceCode, source, integrationReady,
    factors: integrationReady ? CRITERIA[sourceCode] : [], decision: 'highest-factor; missing-or-uncovered-needs-review',
    newProject: code.startsWith('10.') ? { forms: { M: '1–10', H: '>10' } } : null }
}

/** Entry point for current matrix codes. evaluateCriteria uses legacy source codes only. */
export function evaluateActivity(code: string, facts: Facts) {
  const snapshot = criteriaSnapshot(code)
  if (!snapshot.integrationReady) return { status: 'needs_review' as const, level: null, evidence: [], unresolved: ['ยังไม่มีเกณฑ์ที่ตรงกับกิจกรรมใน Matrix รุ่นปัจจุบัน'] }
  const result = evaluateCriteria(snapshot.sourceCode, facts)
  if (snapshot.sourceCode === 'matrix-v3-crud' && facts.existingPattern === false && result.level === 'L')
    return { ...result, status: 'needs_review' as const, level: null, unresolved: ['ไม่ใช้ pattern เดิมและยังไม่มีหลักฐานพอระบุระดับ M/H'] }
  return result
}

/** Caller passes a fixed-shape snapshot (detail, activity, qty, criteria, matrix, multipliers). */
export function inputHash(snapshot: unknown) {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')
}

export function validateReview(suggestion: { inputHash: string; suggestedLevel: Level | null }, currentHash: string, confirmedLevel: Level, reason: string) {
  if (suggestion.inputHash !== currentHash) throw new Error('รายละเอียดหรือเกณฑ์เปลี่ยนแล้ว ต้องประเมินใหม่')
  if (!['L', 'M', 'H'].includes(confirmedLevel)) throw new Error('Invalid confirmed level')
  if (suggestion.suggestedLevel !== confirmedLevel && !reason.trim()) throw new Error('กรุณาระบุเหตุผลเมื่อแก้ระดับหรือยืนยันกรณีข้อมูลไม่พอ')
}
