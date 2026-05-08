"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
exports.generateId = generateId;
exports.saveDatabase = saveDatabase;
exports.getDatabase = getDatabase;
exports.queryToObjects = queryToObjects;
exports.queryAll = queryAll;
exports.queryOne = queryOne;
exports.execute = execute;
const sql_js_1 = __importDefault(require("sql.js"));
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let db = null;
const DB_PATH = path_1.default.join(electron_1.app.getPath('userData'), 'tasktracker.db');
// 初始化数据库
async function initDatabase() {
    if (db)
        return db;
    const SQL = await (0, sql_js_1.default)();
    // 如果数据库文件存在，加载它
    if (fs_1.default.existsSync(DB_PATH)) {
        const fileBuffer = fs_1.default.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
    }
    else {
        db = new SQL.Database();
    }
    // 创建表结构
    createTables();
    saveDatabase();
    return db;
}
// 创建数据表
function createTables() {
    if (!db)
        return;
    db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      key TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#4A90D9',
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      sync_version INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // 兼容旧数据库：添加 status 列（如果不存在）
    try {
        db.run("ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'active'");
    }
    catch { /* 列已存在 */ }
    // 兼容旧数据库：添加 sync_version 列（如果不存在）
    try {
        db.run("ALTER TABLE projects ADD COLUMN sync_version INTEGER DEFAULT 0");
    }
    catch { /* 列已存在 */ }
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
      seq_number INTEGER DEFAULT 0,
      seq_assigned INTEGER DEFAULT 0,
      sync_version INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);
    try {
        db.run("ALTER TABLE tasks ADD COLUMN sync_version INTEGER DEFAULT 0");
    }
    catch { /* 列已存在 */ }
    try {
        db.run("ALTER TABLE tasks ADD COLUMN seq_number INTEGER DEFAULT 0");
    }
    catch { /* 列已存在 */ }
    try {
        db.run("ALTER TABLE tasks ADD COLUMN seq_assigned INTEGER DEFAULT 0");
    }
    catch { /* 列已存在 */ }
    db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#409EFF',
      project_id INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);
    db.run(`
    CREATE TABLE IF NOT EXISTS task_tags (
      task_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (task_id, tag_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);
    db.run(`
    CREATE TABLE IF NOT EXISTS task_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      field TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);
    // 创建索引以提升查询性能
    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id)');
    // 清理孤儿数据
    try {
        db.run("DELETE FROM task_logs WHERE task_id NOT IN (SELECT id FROM tasks)");
        db.run("DELETE FROM task_tags WHERE task_id NOT IN (SELECT id FROM tasks)");
        db.run("DELETE FROM task_tags WHERE tag_id NOT IN (SELECT id FROM tags)");
        db.run("DELETE FROM tags WHERE project_id NOT IN (SELECT id FROM projects)");
        db.run("DELETE FROM tasks WHERE project_id NOT IN (SELECT id FROM projects)");
    }
    catch { /* ignore */ }
    // 清理重复标签
    try {
        const dupesStmt = db.prepare('SELECT name, project_id, min(id) as keep_id, count(*) as c FROM tags GROUP BY name, project_id HAVING c > 1');
        const dupes = [];
        while (dupesStmt.step()) {
            const row = dupesStmt.get();
            dupes.push({ name: row[0], project_id: row[1], keep_id: row[2] });
        }
        dupesStmt.free();
        for (const d of dupes) {
            const badStmt = db.prepare('SELECT id FROM tags WHERE name=? AND project_id=? AND id!=?');
            badStmt.bind([d.name, d.project_id, d.keep_id]);
            while (badStmt.step()) {
                const badId = badStmt.get()[0];
                db.run('UPDATE task_tags SET tag_id=? WHERE tag_id=?', [d.keep_id, badId]);
                db.run('DELETE FROM tags WHERE id=?', [badId]);
            }
            badStmt.free();
        }
    }
    catch (e) { /* tags table may not exist yet */ }
}
// 生成全局唯一 ID（毫秒时间戳 + 随机数，不同客户端不碰撞）
function generateId() {
    return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}
// 保存数据库到文件
function saveDatabase() {
    if (!db)
        return;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs_1.default.writeFileSync(DB_PATH, buffer);
}
// 获取数据库实例
function getDatabase() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}
// 序列化值，确保可通过 Electron IPC 克隆
function serializeValue(value) {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    if (value instanceof Uint8Array) {
        // 转换为普通数组
        const arr = [];
        for (let i = 0; i < value.length; i++) {
            arr.push(value[i]);
        }
        return arr;
    }
    if (value instanceof ArrayBuffer) {
        return { type: 'ArrayBuffer', byteLength: value.byteLength };
    }
    if (Array.isArray(value)) {
        return value.map(v => serializeValue(v));
    }
    if (typeof value === 'object') {
        // 处理 Date 对象
        if (value instanceof Date) {
            return value.toISOString();
        }
        // 处理其他对象，递归序列化
        const result = {};
        for (const key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                result[key] = serializeValue(value[key]);
            }
        }
        return result;
    }
    // 其他类型（如函数）返回 null
    return null;
}
// 序列化查询结果，确保可通过 Electron IPC 克隆
function serializeResult(obj) {
    if (obj === null || obj === undefined) {
        return null;
    }
    const result = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result[key] = serializeValue(obj[key]);
        }
    }
    return result;
}
// 将查询结果转换为对象数组
function queryToObjects(stmt) {
    const columns = stmt.getColumnNames();
    const values = stmt.getAsObject({});
    const results = [];
    while (stmt.step()) {
        const row = stmt.get();
        const obj = {};
        columns.forEach((col, idx) => {
            obj[col] = row[idx];
        });
        results.push(obj);
    }
    return results;
}
// 辅助函数：执行查询并返回对象数组
function queryAll(sql, params = []) {
    const database = getDatabase();
    const stmt = database.prepare(sql);
    stmt.bind(params);
    const columns = stmt.getColumnNames();
    const results = [];
    while (stmt.step()) {
        const row = stmt.get();
        const obj = {};
        columns.forEach((col, idx) => {
            obj[col] = row[idx];
        });
        // 序列化结果，确保可通过 Electron IPC 克隆
        results.push(serializeResult(obj));
    }
    stmt.free();
    return results;
}
// 辅助函数：执行单行查询
function queryOne(sql, params = []) {
    const results = queryAll(sql, params);
    // results 已经是序列化过的
    return results.length > 0 ? results[0] : null;
}
// 辅助函数：执行插入/更新/删除
function execute(sql, params = []) {
    const database = getDatabase();
    const stmt = database.prepare(sql);
    try {
        if (params.length > 0)
            stmt.bind(params);
        stmt.step();
    }
    finally {
        stmt.free();
    }
    if (sql.trim().toUpperCase().startsWith('INSERT')) {
        const result = database.exec('SELECT last_insert_rowid() as id');
        const id = result[0]?.values[0]?.[0] || 0;
        saveDatabase();
        return id;
    }
    saveDatabase();
    return 0;
}
