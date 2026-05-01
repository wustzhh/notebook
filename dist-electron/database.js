"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
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
    catch (e) {
        // 列已存在，忽略错误
    }
    // 兼容旧数据库：添加 sync_version 列（如果不存在）
    try {
        db.run("ALTER TABLE projects ADD COLUMN sync_version INTEGER DEFAULT 0");
    }
    catch (e) {
        // 列已存在，忽略错误
    }
    try {
        db.run("ALTER TABLE tasks ADD COLUMN sync_version INTEGER DEFAULT 0");
    }
    catch (e) {
        // 列已存在，忽略错误
    }
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
      sync_version INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);
    // 创建索引以提升查询性能
    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id)');
    // 插入默认项目（如果不存在）
    const projectCount = db.exec('SELECT COUNT(*) as count FROM projects')[0];
    if (!projectCount || projectCount.values[0][0] === 0) {
        db.run(`INSERT INTO projects (name, key, color, description)
            VALUES ('Default Project', 'DEF', '#4A90D9', '默认项目')`);
    }
    // 插入示例任务（如果不存在）
    const taskCount = db.exec('SELECT COUNT(*) as count FROM tasks')[0];
    if (!taskCount || taskCount.values[0][0] === 0) {
        db.run(`INSERT INTO tasks (title, description, project_id, status, priority, position) VALUES
      ('完成项目需求文档', '编写详细的项目需求文档', 1, 'done', 'high', 0),
      ('设计数据库架构', '设计任务管理系统的数据库架构', 1, 'in_progress', 'high', 1),
      ('实现用户认证', '实现用户登录和注册功能', 1, 'todo', 'medium', 2),
      ('前端页面开发', '使用 Vue3 和 Element Plus 开发前端页面', 1, 'todo', 'medium', 3),
      ('测试和部署', '进行单元测试并部署应用', 1, 'todo', 'low', 4)
    `);
    }
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
    database.run(sql, params);
    // 如果是 INSERT，立即获取 ID（在 saveDatabase 之前）
    if (sql.trim().toUpperCase().startsWith('INSERT')) {
        const result = database.exec('SELECT last_insert_rowid() as id');
        const id = result[0]?.values[0]?.[0] || 0;
        saveDatabase();
        return id;
    }
    saveDatabase();
    return 0;
}
