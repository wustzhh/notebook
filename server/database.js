const initSqlJs = require('sql.js')
const path = require('path')
const fs = require('fs')

const DATA_DIR = path.join(__dirname, 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const AUTH_DB_PATH = path.join(DATA_DIR, 'users.db')

let authDb = null
const userDbs = {}
const pendingInits = {}

function saveAuthDb() {
  if (!authDb) return
  fs.writeFileSync(AUTH_DB_PATH, Buffer.from(authDb.export()))
}

function saveUserDb(userId) {
  const db = userDbs[userId]
  if (!db) return
  const dbPath = path.join(DATA_DIR, `${userId}.db`)
  fs.writeFileSync(dbPath, Buffer.from(db.export()))
}

// --- 认证数据库 (users.db) ---

async function initAuthDb() {
  if (authDb) return authDb

  const SQL = await initSqlJs()
  authDb = fs.existsSync(AUTH_DB_PATH)
    ? new SQL.Database(fs.readFileSync(AUTH_DB_PATH))
    : new SQL.Database()

  authDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  saveAuthDb()
  return authDb
}

// --- 用户数据数据库 ({userId}.db) ---

async function initUserDb(userId) {
  if (userDbs[userId]) return userDbs[userId]
  if (pendingInits[userId]) return pendingInits[userId]

  pendingInits[userId] = (async () => {
    const SQL = await initSqlJs()
    const dbPath = path.join(DATA_DIR, `${userId}.db`)
    const db = fs.existsSync(dbPath)
      ? new SQL.Database(fs.readFileSync(dbPath))
      : new SQL.Database()

    db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        key TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#4A90D9',
        description TEXT DEFAULT '',
        status TEXT DEFAULT 'active',
        client_id INTEGER,
        sync_version INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    try { db.run("ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'active'") } catch {}
    try { db.run("ALTER TABLE projects ADD COLUMN sync_version INTEGER DEFAULT 0") } catch {}
    try { db.run("ALTER TABLE projects ADD COLUMN client_id INTEGER") } catch {}

    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        project_id INTEGER NOT NULL,
        parent_id INTEGER,
        status TEXT DEFAULT 'todo',
        priority TEXT DEFAULT 'medium',
        start_date TEXT,
        end_date TEXT,
        position INTEGER DEFAULT 0,
        seq_number INTEGER DEFAULT 0,
        seq_assigned INTEGER DEFAULT 0,
        client_id INTEGER,
        sync_version INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `)

    try { db.run("ALTER TABLE tasks ADD COLUMN sync_version INTEGER DEFAULT 0") } catch {}
    try { db.run("ALTER TABLE tasks ADD COLUMN seq_number INTEGER DEFAULT 0") } catch {}
    try { db.run("ALTER TABLE tasks ADD COLUMN seq_assigned INTEGER DEFAULT 0") } catch {}
    try { db.run("ALTER TABLE tasks ADD COLUMN client_id INTEGER") } catch {}

    const unassigned = queryAll(db, "SELECT id, project_id FROM tasks WHERE seq_assigned = 0 ORDER BY created_at")
    if (unassigned.length > 0) {
      const counters = {}
      for (const t of unassigned) {
        counters[t.project_id] = (counters[t.project_id] || 0) + 1
        execute(db, "UPDATE tasks SET seq_number = ?, seq_assigned = 1, updated_at = ? WHERE id = ?",
          [counters[t.project_id], new Date().toISOString(), t.id])
      }
      console.log(`[user ${userId}] Batch assigned seq_number to ${unassigned.length} tasks`)
    }

    db.run(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#409EFF',
        project_id INTEGER NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS task_tags (
        task_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (task_id, tag_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS task_logs (
        id INTEGER PRIMARY KEY,
        task_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        field TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `)

    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)')
    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id)')

    db.run(`CREATE TABLE IF NOT EXISTS id_sequences (
      entity TEXT PRIMARY KEY,
      next_val INTEGER NOT NULL DEFAULT 1
    )`)

    // ID 重映射：把时间戳ID(>=1万亿)换成顺序ID
    remapUserDb(db, userId)

    userDbs[userId] = db
    saveUserDb(userId)
    return db
  })()

  const db = await pendingInits[userId]
  delete pendingInits[userId]
  return db
}

function deleteUserDb(userId) {
  if (userDbs[userId]) {
    userDbs[userId].close()
    delete userDbs[userId]
  }
  const dbPath = path.join(DATA_DIR, `${userId}.db`)
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
}

// --- ID 分配与重映射 ---

function allocateIds(db, entity, count = 1) {
  const row = queryOne(db, "SELECT next_val FROM id_sequences WHERE entity = ?", [entity])
  let start = 1
  if (row) {
    start = row.next_val
    execute(db, "UPDATE id_sequences SET next_val = ? WHERE entity = ?", [start + count, entity])
  } else {
    execute(db, "INSERT INTO id_sequences (entity, next_val) VALUES (?, ?)", [entity, 1 + count])
  }
  const ids = []
  for (let i = 0; i < count; i++) ids.push(start + i)
  return ids
}

function remapUserDb(db, userId) {
  const maxP = queryOne(db, "SELECT MAX(id) as m FROM projects")
  if (!maxP || maxP.m < 1000000000000) return

  console.log(`[user ${userId}] Remapping timestamp IDs to sequential...`)

  const pidMap = {}
  let nextPid = 1
  const oldProjects = queryAll(db, "SELECT id FROM projects WHERE id >= 1000000000000 ORDER BY created_at")
  for (const p of oldProjects) { pidMap[p.id] = nextPid++; execute(db, "UPDATE projects SET id = ?, client_id = ? WHERE id = ?", [pidMap[p.id], p.id, p.id]) }

  const tidMap = {}
  let nextTid = 1
  const oldTasks = queryAll(db, "SELECT id, project_id, parent_id FROM tasks WHERE id >= 1000000000000 ORDER BY created_at")
  for (const t of oldTasks) {
    tidMap[t.id] = nextTid++
    const newPid = pidMap[t.project_id] || t.project_id
    const newParent = t.parent_id ? (tidMap[t.parent_id] || t.parent_id) : null
    execute(db, "UPDATE tasks SET id = ?, client_id = ?, project_id = ?, parent_id = ? WHERE id = ?",
      [tidMap[t.id], t.id, newPid, newParent, t.id])
  }

  const tagIdMap = {}
  let nextTagId = 1
  const oldTags = queryAll(db, "SELECT id, project_id FROM tags WHERE id >= 1000000000000 ORDER BY id")
  for (const t of oldTags) {
    tagIdMap[t.id] = nextTagId++
    const newPid = pidMap[t.project_id] || t.project_id
    execute(db, "UPDATE tags SET id = ?, project_id = ? WHERE id = ?", [tagIdMap[t.id], newPid, t.id])
  }

  const taskTags = queryAll(db, "SELECT * FROM task_tags")
  for (const tt of taskTags) {
    const newTid = tidMap[tt.task_id] || tt.task_id
    const newTagId = tagIdMap[tt.tag_id] || tt.tag_id
    if (newTid !== tt.task_id || newTagId !== tt.tag_id) {
      execute(db, "DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?", [tt.task_id, tt.tag_id])
      execute(db, "INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)", [newTid, newTagId])
    }
  }

  const logIdMap = {}
  let nextLogId = 1
  const oldLogs = queryAll(db, "SELECT id, task_id FROM task_logs WHERE id >= 1000000000000 ORDER BY id")
  for (const l of oldLogs) {
    logIdMap[l.id] = nextLogId++
    const newTid = tidMap[l.task_id] || l.task_id
    execute(db, "UPDATE task_logs SET id = ?, task_id = ? WHERE id = ?", [logIdMap[l.id], newTid, l.id])
  }

  // 设置各实体 ID 序列为 max+1
  const maxSeqPid = Object.keys(pidMap).length > 0 ? nextPid : (queryOne(db, "SELECT MAX(id) as m FROM projects")?.m || 0) + 1
  const maxSeqTid = Object.keys(tidMap).length > 0 ? nextTid : (queryOne(db, "SELECT MAX(id) as m FROM tasks")?.m || 0) + 1
  const maxSeqTagId = Object.keys(tagIdMap).length > 0 ? nextTagId : (queryOne(db, "SELECT MAX(id) as m FROM tags")?.m || 0) + 1
  const maxSeqLogId = Object.keys(logIdMap).length > 0 ? nextLogId : (queryOne(db, "SELECT MAX(id) as m FROM task_logs")?.m || 0) + 1

  execute(db, "INSERT OR REPLACE INTO id_sequences (entity, next_val) VALUES ('projects', ?)", [maxSeqPid])
  execute(db, "INSERT OR REPLACE INTO id_sequences (entity, next_val) VALUES ('tasks', ?)", [maxSeqTid])
  execute(db, "INSERT OR REPLACE INTO id_sequences (entity, next_val) VALUES ('tags', ?)", [maxSeqTagId])
  execute(db, "INSERT OR REPLACE INTO id_sequences (entity, next_val) VALUES ('logs', ?)", [maxSeqLogId])

  console.log(`[user ${userId}] Remap done: ${Object.keys(pidMap).length}p ${Object.keys(tidMap).length}t ${Object.keys(tagIdMap).length}tag ${Object.keys(logIdMap).length}log`)
}

// --- 查询函数 ---

function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const results = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push(Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v === null ? null : v])))
  }
  stmt.free()
  return results
}

function queryOne(db, sql, params = []) {
  const results = queryAll(db, sql, params)
  return results.length > 0 ? results[0] : null
}

function execute(db, sql, params = []) {
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  stmt.step()
  stmt.free()
}

module.exports = { initAuthDb, initUserDb, deleteUserDb, saveAuthDb, saveUserDb, allocateIds, queryAll, queryOne, execute, getAuthDb: () => authDb }
