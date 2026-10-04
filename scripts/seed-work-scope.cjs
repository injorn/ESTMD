// Additive upgrade: never overwrite existing matrix cells or project estimates.
require('./load-env.cjs')
const Database = require('better-sqlite3')
const path = require('node:path')
const drafts = require('../src/lib/estimation/proposedMD.json')
const definitions = [['19.1', 'Performance Tuning', 'Performance'], ['19.2', 'Performance / Load Test', 'Performance'], ['15.2', 'Training / Knowledge Transfer', 'Documentation & Training']]
function register(db) {
  db.transaction(() => {
    for (const [index, [code, name, group]] of definitions.entries()) {
      const draft = drafts[name]
      db.prepare('INSERT INTO activities(code,name,group_name,unit,count_unit,notes,sort_order) VALUES(?,?,?,\'MD\',?,?,?) ON CONFLICT(code) DO NOTHING').run(code, name, group, draft.unit, `ค่าเริ่มต้นเสนอจากการทบทวนขอบเขต; ${draft.assumptions}; ฐานคิด: ${draft.basis}`, 600 + index)
      const activity = db.prepare('SELECT id FROM activities WHERE code=?').get(code)
      for (const questionnaire of db.prepare('SELECT id FROM questionnaires WHERE name IN (?,?)').all('ทุกหัวข้อ (ค่าเริ่มต้น)', 'งานพัฒนาระบบใหม่ (Greenfield)')) {
        db.prepare('INSERT INTO questionnaire_activities(questionnaire_id,activity_id,sort_order) VALUES(?,?,?) ON CONFLICT(questionnaire_id,activity_id) DO NOTHING').run(questionnaire.id, activity.id, 600 + index)
      }
      for (const role of db.prepare('SELECT id,code FROM roles WHERE active=1').all()) {
        for (const [i, level] of ['L', 'M', 'H'].entries()) {
          db.prepare('INSERT INTO matrix_cells(activity_id,role_id,complexity,manday) VALUES(?,?,?,?) ON CONFLICT(activity_id,role_id,complexity) DO NOTHING').run(activity.id, role.id, level, draft.roles[role.code]?.[i] ?? 0)
        }
      }
    }
  })()
}
module.exports = { register }
if (require.main === module) {
  const db = new Database(path.resolve(process.env.DATABASE_PATH || './data/estmanday.db'), { fileMustExist: true })
  db.pragma('foreign_keys = ON')
  register(db)
  db.close()
  console.log('Registered 3 scope activities; existing matrix and project MD preserved.')
}
