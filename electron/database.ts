import initSqlJs, { Database } from 'sql.js'
import { app } from 'electron'
import fs from 'fs'
import path from 'path'

let db: Database | null = null
const DB_PATH = path.join(app.getPath('userData'), 'tasktracker.db')

// 初始化数据库
export async function initDatabase(): Promise<Database> {
  if (db) return db

  const SQL = await initSqlJs()

  // 如果数据库文件存在，加载它
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  // 创建表结构
  createTables()
  saveDatabase()

  return db
}

// 创建数据表
function createTables() {
  if (!db) return

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      key TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#4A90D9',
      description TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      project_id INTEGER NOT NULL,
      parent_id INTEGER,
      status TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'medium',
      start_date TEXT,
      end_date TEXT,
      position INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `)

  // 创建索引以提升查询性能
  db.run('CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)')
  db.run('CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id)')

  // 插入默认项目（如果不存在）
  const projectCount = db.exec('SELECT COUNT(*) as count FROM projects')[0]
  if (!projectCount || projectCount.values[0][0] === 0) {
    db.run(`INSERT INTO projects (name, key, color, description)
            VALUES ('Default Project', 'DEF', '#4A90D9', '默认项目')`)
  }

  // 插入示例任务（如果不存在）
  const taskCount = db.exec('SELECT COUNT(*) as count FROM tasks')[0]
  if (!taskCount || taskCount.values[0][0] === 0) {
    db.run(`INSERT INTO tasks (title, description, project_id, status, priority, position) VALUES
      ('完成项目需求文档', '编写详细的项目需求文档', 1, 'done', 'high', 0),
      ('设计数据库架构', '设计任务管理系统的数据库架构', 1, 'in_progress', 'high', 1),
      ('实现用户认证', '实现用户登录和注册功能', 1, 'todo', 'medium', 2),
      ('前端页面开发', '使用 Vue3 和 Element Plus 开发前端页面', 1, 'todo', 'medium', 3),
      ('测试和部署', '进行单元测试并部署应用', 1, 'todo', 'low', 4)
    `)
  }
}

// 保存数据库到文件
export function saveDatabase() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(DB_PATH, buffer)
}

// 获取数据库实例
export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

// 序列化值，确保可通过 Electron IPC 克隆
function serializeValue(value: any): any {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  if (value instanceof Uint8Array) {
    // 转换为普通数组
    const arr: number[] = []
    for (let i = 0; i < value.length; i++) {
      arr.push(value[i])
    }
    return arr
  }
  if (value instanceof ArrayBuffer) {
    return { type: 'ArrayBuffer', byteLength: value.byteLength }
  }
  if (Array.isArray(value)) {
    return value.map(v => serializeValue(v))
  }
  if (typeof value === 'object') {
    // 处理 Date 对象
    if (value instanceof Date) {
      return value.toISOString()
    }
    // 处理其他对象，递归序列化
    const result: any = {}
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        result[key] = serializeValue(value[key])
      }
    }
    return result
  }
  // 其他类型（如函数）返回 null
  return null
}

// 序列化查询结果，确保可通过 Electron IPC 克隆
function serializeResult(obj: any): any {
  if (obj === null || obj === undefined) {
    return null
  }
  const result: any = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = serializeValue(obj[key])
    }
  }
  return result
}

// 将查询结果转换为对象数组
export function queryToObjects(stmt: any): any[] {
  const columns = stmt.getColumnNames()
  const values = stmt.getAsObject({})
  const results: any[] = []

  while (stmt.step()) {
    const row = stmt.get()
    const obj: any = {}
    columns.forEach((col: string, idx: number) => {
      obj[col] = row[idx]
    })
    results.push(obj)
  }

  return results
}

// 辅助函数：执行查询并返回对象数组
export function queryAll(sql: string, params: any[] = []): any[] {
  const database = getDatabase()
  const stmt = database.prepare(sql)
  stmt.bind(params)

  const columns = stmt.getColumnNames()
  const results: any[] = []

  while (stmt.step()) {
    const row = stmt.get()
    const obj: any = {}
    columns.forEach((col: string, idx: number) => {
      obj[col] = row[idx]
    })
    // 序列化结果，确保可通过 Electron IPC 克隆
    results.push(serializeResult(obj))
  }

  stmt.free()
  return results
}

// 辅助函数：执行单行查询
export function queryOne(sql: string, params: any[] = []): any | null {
  const results = queryAll(sql, params)
  // results 已经是序列化过的
  return results.length > 0 ? results[0] : null
}

// 辅助函数：执行插入/更新/删除
export function execute(sql: string, params: any[] = []): number {
  const database = getDatabase()
  database.run(sql, params)

  // 如果是 INSERT，立即获取 ID（在 saveDatabase 之前）
  if (sql.trim().toUpperCase().startsWith('INSERT')) {
    const result = database.exec('SELECT last_insert_rowid() as id')
    const id = result[0]?.values[0]?.[0] || 0
    saveDatabase()
    return id
  }

  saveDatabase()
  return 0
}
