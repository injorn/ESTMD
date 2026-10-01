import assert from 'node:assert/strict'
import { test } from 'node:test'

const modulePath = '../src/lib/estimation-ai/policy'
test('criteria boundaries, highest factor and missing facts', async () => {
  const { evaluateCriteria } = await import(modulePath)
  assert.equal(evaluateCriteria('1.2', { fields: 5, tables: 1, complex: false }).level, 'L')
  assert.equal(evaluateCriteria('1.2', { fields: 6, tables: 1, complex: false }).level, 'M')
  assert.equal(evaluateCriteria('1.2', { fields: 5, tables: 1, complex: true }).level, 'H')
  assert.equal(evaluateCriteria('1.2', { fields: 5 }).status, 'needs_review')
  assert.equal(evaluateCriteria('11.3', { rounds: 7 }).status, 'needs_review')
  assert.equal(evaluateCriteria('5.1', { fields: 15, twoWay: false }).status, 'needs_review')
  assert.equal(evaluateCriteria('unknown', {}).status, 'needs_review')
  assert.throws(() => evaluateCriteria('1.2', { fields: -1, tables: 1, complex: false }))
})
test('review rejects stale inputs and requires an override reason', async () => {
  const { validateReview } = await import(modulePath)
  assert.throws(() => validateReview({ inputHash: 'old', suggestedLevel: 'L' }, 'new', 'L', ''))
  assert.throws(() => validateReview({ inputHash: 'same', suggestedLevel: 'L' }, 'same', 'H', ''))
  assert.doesNotThrow(() => validateReview({ inputHash: 'same', suggestedLevel: 'L' }, 'same', 'H', 'มี workflow'))
})
test('current matrix CRUD uses v3 semantic rules instead of legacy Add/Search code mapping', async () => {
  const { evaluateActivity, criteriaSnapshot } = await import(modulePath)
  const simple = { existingPattern: true, businessLogic: false, complexLogic: false, externalSystems: 0, multiStepApproval: false, securityCritical: false }
  assert.equal(evaluateActivity('1.2', simple).status, 'resolved')
  assert.equal(evaluateActivity('1.2', simple).level, 'L')
  assert.equal(evaluateActivity('1.1', { ...simple, businessLogic: true }).level, 'M')
  assert.equal(evaluateActivity('1.3', { ...simple, multiStepApproval: true }).level, 'H')
  assert.equal(evaluateActivity('1.2', { ...simple, externalSystems: 2 }).level, 'H')
  assert.equal(evaluateActivity('1.2', { ...simple, existingPattern: undefined }).status, 'needs_review')
  assert.equal(evaluateActivity('1.2', { ...simple, existingPattern: false }).status, 'needs_review')
  assert.equal(evaluateActivity('15.1', { userRoles: 3 }).level, 'M')
  assert.equal(criteriaSnapshot('2').source?.topic, 'Dashboard')
  assert.equal(criteriaSnapshot('1.2').integrationReady, true)
  assert.match(criteriaSnapshot('1.2').version, /matrix-v3/)
})
test('evaluation counts abstentions, low estimates and frozen per-role MD', async () => {
  const { evaluatePredictions } = await import('../src/lib/estimation-ai/evaluation')
  const cases = [{ id: 'a', expectedLevel: 'H', qty: 2, rates: [{ L: 1, M: 2, H: 4, multiplier: 1.5 }] },
    { id: 'b', expectedLevel: 'L', qty: 1, rates: [{ L: 1, M: 2, H: 4, multiplier: 1 }] }]
  const result = evaluatePredictions(cases, [{ id: 'a', level: 'M' }])
  assert.equal(result.coverage, 0.5)
  assert.equal(result.accuracy, 0)
  assert.equal(result.underestimated, 1)
  assert.equal(result.meanAbsoluteMdError, 6)
  assert.equal(result.abstained, 1)
  assert.throws(() => evaluatePredictions(cases, [{ id: 'a', level: 'M' }, { id: 'a', level: 'L' }]))
})
