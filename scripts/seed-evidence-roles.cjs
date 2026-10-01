// Add optional evidence roles without reseeding the existing matrix or rates.
require('./load-env.cjs')
const path = require('node:path')
const Database = require('better-sqlite3')
const roles = require('../src/lib/db/historical-roles.json')
const sqlite = new Database(path.resolve(process.env.DATABASE_PATH || './data/estmanday.db'), { fileMustExist: true })
try {
  const insert = sqlite.prepare(`INSERT INTO roles(code,name,rate_per_md,scope,sort_order) VALUES(@code,@name,0,'item',@sortOrder) ON CONFLICT(code) DO NOTHING`)
  const count = sqlite.transaction(() => roles.reduce((sum, role) => sum + insert.run(role).changes, 0))()
  console.log(`Added ${count} optional evidence roles; existing matrix and rates preserved.`)
} finally { sqlite.close() }
