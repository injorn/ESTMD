import { z } from 'zod'
import { round2 } from '../estimate'

const level = z.enum(['L', 'M', 'H'])
export const evaluationCase = z.object({
  id: z.string().min(1), expectedLevel: level, qty: z.number().positive(),
  rates: z.array(z.object({ L: z.number().nonnegative(), M: z.number().nonnegative(), H: z.number().nonnegative(), multiplier: z.number().positive() })).min(1),
})
export const prediction = z.object({ id: z.string().min(1), level: level.nullable() })
type Case = z.infer<typeof evaluationCase>
type Prediction = z.infer<typeof prediction>
export type EvaluationSnapshot = Case & {
  projectId: number
  projectName: string
  itemId: number
  detail: string
  activityCode: string
  activityName: string
  countUnit: string
  criteria: Record<string, unknown>
}

export function evaluatePredictions(rawCases: unknown, rawPredictions: unknown) {
  const cases: Case[] = z.array(evaluationCase).parse(rawCases)
  const predictions: Prediction[] = z.array(prediction).parse(rawPredictions)
  const ids = new Set(cases.map(c => c.id))
  if (ids.size !== cases.length) throw new Error('Duplicate case id')
  const byId = new Map(predictions.map(p => [p.id, p.level]))
  if (byId.size !== predictions.length) throw new Error('Duplicate prediction id')
  for (const id of byId.keys()) if (!ids.has(id)) throw new Error(`Unknown prediction id: ${id}`)
  let answered = 0, correct = 0, underestimated = 0, absoluteError = 0
  const confusion = { L: { L: 0, M: 0, H: 0 }, M: { L: 0, M: 0, H: 0 }, H: { L: 0, M: 0, H: 0 } }
  const rows = cases.map(c => {
    const predicted = byId.get(c.id)
    if (!predicted) return { id: c.id, expected: c.expectedLevel, predicted: null, mdDelta: null }
    answered++
    if (predicted === c.expectedLevel) correct++
    confusion[c.expectedLevel][predicted]++
    const md = (l: Case['expectedLevel']) => round2(c.rates.reduce((sum, r) => sum + round2(r[l] * c.qty * r.multiplier), 0))
    const mdDelta = round2(md(predicted) - md(c.expectedLevel))
    if (mdDelta < 0) underestimated++
    absoluteError += Math.abs(mdDelta)
    return { id: c.id, expected: c.expectedLevel, predicted, mdDelta }
  })
  return { total: cases.length, answered, abstained: cases.length - answered, coverage: cases.length ? answered / cases.length : 0,
    accuracy: answered ? correct / answered : null, underestimated, meanAbsoluteMdError: answered ? round2(absoluteError / answered) : null, confusion, rows }
}
