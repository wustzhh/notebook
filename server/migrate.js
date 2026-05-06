const initSqlJs = require('sql.js')
const path = require('path')
const fs = require('fs')

const DATA_DIR = path.join(__dirname, 'data')
const OLD_DB_PATH = path.join(DATA_DIR, 'app.db')

async function main() {
  if (!fs.existsSync(OLD_DB_PATH)) {
    console.log('❌ 未找到 data/app.db，无需迁移')
    process.exit(0)
  }

  const SQL = await initSqlJs()
  const oldBuffer = fs.readFileSync(OLD_DB_PATH)
  const oldDb = new SQL.Database(oldBuffer)

  // 获取所有用户
  const users = []
  let stmt = oldDb.prepare('SELECT id, email FROM users')
  while (stmt.step()) {
    const row = stmt.get()
    users.push({ id: row[0], email: row[1] })
  }
  stmt.free()

  if (users.length === 0) {
    console.log('⚠️ 旧数据库中没有用户')
    console.log('迁移完成，旧 app.db 已备份为 app.db.bak')
    fs.renameSync(OLD_DB_PATH, OLD_DB_PATH + '.bak')
    process.exit(0)
  }

  console.log(`找到 ${users.length} 个用户，开始迁移...\n`)

  for (const user of users) {
    const newDbPath = path.join(DATA_DIR, `${user.id}.db`)
    const newDb = new SQL.Database()

    // 建表（与 database.js 一致，无 user_id）
    newDb.run(`CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, key TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#4A90D9', description TEXT DEFAULT '', status TEXT DEFAULT 'active',
      sync_version INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT
    )`)

    newDb.run(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT DEFAULT '',
      project_id INTEGER NOT NULL, parent_id INTEGER,
      status TEXT DEFAULT 'todo', priority TEXT DEFAULT 'medium',
      start_date TEXT, end_date TEXT, position INTEGER DEFAULT 0,
      seq_number INTEGER DEFAULT 0, seq_assigned INTEGER DEFAULT 0,
      sync_version INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT
    )`)

    newDb.run(`CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, color TEXT DEFAULT '#409EFF',
      project_id INTEGER NOT NULL
    )`)

    newDb.run(`CREATE TABLE IF NOT EXISTS task_tags (
      task_id INTEGER NOT NULL, tag_id INTEGER NOT NULL,
      PRIMARY KEY (task_id, tag_id)
    )`)

    newDb.run(`CREATE TABLE IF NOT EXISTS task_logs (
      id INTEGER PRIMARY KEY, task_id INTEGER NOT NULL,
      type TEXT NOT NULL, content TEXT NOT NULL,
      old_value TEXT, new_value TEXT, field TEXT, created_at TEXT
    )`)

    // 迁移 projects
    let count = 0
    let pstmt = oldDb.prepare('SELECT * FROM projects WHERE user_id = ?', [user.id])
    while (pstmt.step()) {
      const row = pstmt.getAsObject()
      newDb.run(
        'INSERT INTO projects (id, name, key, color, description, status, sync_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [row.id, row.name, row.key, row.color, row.description, row.status || 'active', row.sync_version || 0, row.created_at, row.updated_at]
      )
      count++
    }
    pstmt.free()
    console.log(`[${user.email}] projects: ${count}`)

    // 迁移 tasks
    count = 0
    let tstmt = oldDb.prepare('SELECT * FROM tasks WHERE user_id = ?', [user.id])
    while (tstmt.step()) {
      const row = tstmt.getAsObject()
      newDb.run(
        'INSERT INTO tasks (id, title, description, project_id, parent_id, status, priority, start_date, end_date, position, seq_number, seq_assigned, sync_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [row.id, row.title, row.description, row.project_id, row.parent_id || null, row.status, row.priority, row.start_date || null, row.end_date || null, row.position || 0, row.seq_number || 0, row.seq_assigned || 0, row.sync_version || 0, row.created_at, row.updated_at]
      )
      count++
    }
    tstmt.free()
    console.log(`[${user.email}] tasks: ${count}`)

    // 获取该用户的 project IDs 来筛选 tags
    const userProjects = []
    let upstmt = oldDb.prepare('SELECT id FROM projects WHERE user_id = ?', [user.id])
    while (upstmt.step()) userProjects.push(upstmt.getAsObject().id)
    upstmt.free()

    // 迁移 tags
    count = 0
    if (userProjects.length > 0) {
      const ph = userProjects.map(() => '?').join(',')
      let gstmt = oldDb.prepare(`SELECT * FROM tags WHERE project_id IN (${ph})`, userProjects)
      while (gstmt.step()) {
        const row = gstmt.getAsObject()
        newDb.run('INSERT INTO tags (id, name, color, project_id) VALUES (?, ?, ?, ?)',
          [row.id, row.name, row.color || '#409EFF', row.project_id])
        count++
      }
      gstmt.free()
    }
    console.log(`[${user.email}] tags: ${count}`)

    // 获取该用户的 task IDs
    const userTasks = []
    let utstmt = oldDb.prepare('SELECT id FROM tasks WHERE user_id = ?', [user.id])
    while (utstmt.step()) userTasks.push(utstmt.getAsObject().id)
    utstmt.free()

    // 迁移 task_tags
    count = 0
    if (userTasks.length > 0) {
      const tph = userTasks.map(() => '?').join(',')
      let ttstmt = oldDb.prepare(`SELECT * FROM task_tags WHERE task_id IN (${tph})`, userTasks)
      while (ttstmt.step()) {
        const row = ttstmt.getAsObject()
        newDb.run('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)', [row.task_id, row.tag_id])
        count++
      }
      ttstmt.free()
    }
    console.log(`[${user.email}] task_tags: ${count}`)

    // 迁移 task_logs
    count = 0
    if (userTasks.length > 0) {
      const tph = userTasks.map(() => '?').join(',')
      let lstmt = oldDb.prepare(`SELECT * FROM task_logs WHERE task_id IN (${tph})`, userTasks)
      while (lstmt.step()) {
        const row = lstmt.getAsObject()
        newDb.run('INSERT INTO task_logs (id, task_id, type, content, old_value, new_value, field, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [row.id, row.task_id, row.type, row.content, row.old_value || null, row.new_value || null, row.field || null, row.created_at])
        count++
      }
      lstmt.free()
    }
    console.log(`[${user.email}] task_logs: ${count}`)

    // 保存新 DB 文件
    fs.writeFileSync(newDbPath, Buffer.from(newDb.export()))
    newDb.close()
    console.log(`✅ 已生成 data/${user.id}.db\n`)
  }

  oldDb.close()

  // 备份旧 DB
  fs.renameSync(OLD_DB_PATH, OLD_DB_PATH + '.bak')
  console.log('✅ 全量迁移完成！旧 app.db 已备份为 app.db.bak')
  console.log('现在可以 pm2 restart tasktracker')
}

main().catch(err => { console.error(err); process.exit(1) })
