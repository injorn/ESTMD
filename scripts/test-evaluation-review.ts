import assert from 'node:assert/strict'
import { test } from 'node:test'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from '../src/lib/db/schema'

test('baseline capture is frozen, deduplicated and reviewed independently of estimates', async () => {
  const service = await import('../src/lib/estimation-ai/case-store')
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys=ON')
  const db = drizzle(sqlite, { schema })
  try {
    migrate(db, { migrationsFolder: './drizzle' })
    sqlite.exec(`INSERT INTO users(id,email,name,password_hash,role) VALUES(1,'test@local','Test','unused','admin');
      INSERT INTO activities(id,code,name,count_unit) VALUES(1,'1.2','CRUD with Import','ต่อหน้าจอ');
      INSERT INTO roles(id,code,name,stack_multiplied) VALUES(1,'DEV','Developer',1);
      INSERT INTO tech_stacks(id,name,multiplier) VALUES(1,'Test stack',1.5);
      INSERT INTO projects(id,name,owner_id,tech_stack_id) VALUES(1,'Test',1,1);
      INSERT INTO project_phases(id,project_id,name) VALUES(1,1,'Development');
      INSERT INTO project_roles(project_id,role_id,included) VALUES(1,1,1);
      INSERT INTO project_items(id,project_id,phase_id,activity_id,detail,complexity,qty) VALUES(1,1,1,1,'Import using existing template','L',2);
      INSERT INTO matrix_cells(activity_id,role_id,complexity,manday) VALUES(1,1,'L',4),(1,1,'M',8),(1,1,'H',10);`)
    const actor = { userId: 1, role: 'admin' as const }
    assert.throws(() => service.captureCases(db, { ...actor, role: 'viewer' }), /ดูอย่างเดียว/)
    assert.equal(service.captureCases(db, actor), 1)
    assert.equal(service.captureCases(db, actor), 0)
    const [row] = service.listCases(db)
    assert.equal(row.snapshot.rates[0].multiplier, 1.5)
    assert.equal(row.status, 'pending')
    assert.throws(() => service.reviewCase(db, actor, { id: row.id, revision: 0, status: 'reviewed', level: 'H', note: '' }))
    service.reviewCase(db, actor, { id: row.id, revision: 0, status: 'reviewed', level: 'M', note: 'ต้องเพิ่ม validation' })
    assert.throws(() => service.reviewCase(db, actor, { id: row.id, revision: 0, status: 'reviewed', level: 'H', note: 'stale' }), /เปลี่ยน/)
    assert.equal(service.exportCases(db).cases[0].expectedLevel, 'M')
    assert.equal((sqlite.prepare('SELECT complexity FROM project_items WHERE id=1').get() as { complexity: string }).complexity, 'L')
    sqlite.exec('UPDATE tech_stacks SET multiplier=2; UPDATE project_items SET detail=\'Changed\' WHERE id=1')
    assert.equal(service.listCases(db)[0].snapshot.rates[0].multiplier, 1.5)
    assert.equal(service.captureCases(db, actor), 1)
    assert.equal(service.listCases(db).length, 2)
    assert.equal((sqlite.prepare('SELECT count(*) n FROM evaluation_case_reviews').get() as { n: number }).n, 1)
  } finally { sqlite.close() }
})
