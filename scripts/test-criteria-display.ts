import assert from 'node:assert/strict'
import { test } from 'node:test'
import { criteriaSnapshot } from '../src/lib/estimation-ai/policy'

test('dashboard display matches inclusive AI boundaries', () => {
  const source = criteriaSnapshot('2').source!
  assert.match(source.low!, /จำนวน Chart: 1/)
  assert.match(source.medium!, /จำนวน Chart: 2/)
  assert.match(source.high!, /จำนวน Chart: 3–4/)
})

test('test scenario ranges do not overlap and manual uses current mapping', () => {
  assert.match(criteriaSnapshot('11.1').source!.medium!, /จำนวน Scenario: 3–5/)
  assert.match(criteriaSnapshot('15.1').source!.medium!, /จำนวน User Role ของคู่มือ: 3–5/)
  assert.equal(criteriaSnapshot('11.2').integrationReady, false)
})
