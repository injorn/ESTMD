import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import './load-env.cjs'
import { criteriaSnapshot, CRITERIA_VERSION } from '../src/lib/estimation-ai/policy'
import { effectiveMultiplier } from '../src/lib/estimate'

// Read-only local export. Requirement text is never sent to an external service.
const [output] = process.argv.slice(2)
if (!output) throw new Error('Usage: npx tsx scripts/export-estimation-ai-cases.ts output.json (DATABASE_PATH optional)')
const file = path.resolve(process.env.DATABASE_PATH ?? './data/estmanday.db')
if (path.resolve(output) === file) throw new Error('Output must not overwrite database')
if (fs.existsSync(output)) throw new Error('Output exists; choose another file to preserve reviewed labels')
const db = new Database(file, { readonly: true })
try {
  const items = db.prepare(`SELECT i.*, a.code activity_code, a.count_unit, p.tech_stack_id
    FROM project_items i JOIN activities a ON a.id=i.activity_id JOIN projects p ON p.id=i.project_id
    WHERE i.qty > 0 ORDER BY i.id`).all() as { id: number; project_id: number; detail: string; activity_id: number; activity_code: string; complexity: 'L' | 'M' | 'H'; qty: number; count_unit: string; tech_stack_id: number | null }[]
  const cases = items.map(item => {
    const stack = db.prepare('SELECT multiplier FROM tech_stacks WHERE id=?').get(item.tech_stack_id) as { multiplier: number } | undefined
    const modifiers = db.prepare('SELECT m.multiplier FROM project_modifiers p JOIN stack_modifiers m ON m.id=p.modifier_id WHERE p.project_id=? ORDER BY m.id').all(item.project_id) as { multiplier: number }[]
    const multiplier = effectiveMultiplier(stack?.multiplier, modifiers.map(m => m.multiplier))
    const roles = db.prepare(`SELECT r.id, r.code, r.stack_multiplied FROM roles r JOIN project_roles pr ON pr.role_id=r.id
      WHERE pr.project_id=? AND pr.included=1 AND r.scope='item' ORDER BY r.id`).all(item.project_id) as { id: number; code: string; stack_multiplied: number }[]
    const rates = roles.map(role => {
      const rows = db.prepare('SELECT complexity, manday FROM matrix_cells WHERE activity_id=? AND role_id=?').all(item.activity_id, role.id) as { complexity: 'L' | 'M' | 'H'; manday: number }[]
      return { roleCode: role.code, L: rows.find(r => r.complexity === 'L')?.manday ?? 0, M: rows.find(r => r.complexity === 'M')?.manday ?? 0, H: rows.find(r => r.complexity === 'H')?.manday ?? 0, multiplier: role.stack_multiplied ? multiplier : 1 }
    })
    return { id: String(item.id), projectId: item.project_id, detail: item.detail, activityCode: item.activity_code,
      expectedLevel: item.complexity, reviewed: false, reviewNote: '', qty: item.count_unit === 'ต่อโครงการ' ? 1 : item.qty,
      criteria: criteriaSnapshot(item.activity_code), rates }
  })
  fs.writeFileSync(output, JSON.stringify({ criteriaVersion: CRITERIA_VERSION, exportedAt: new Date().toISOString(), cases }, null, 2), { flag: 'wx' })
  console.log(`Exported ${cases.length} unreviewed candidates to ${output}`)
} finally { db.close() }
