const express = require("express")
const { initUserDb, allocateIds, execute, queryOne, saveUserDb } = require("../database")

const router = express.Router()

router.post("/projects", async (req, res) => {
  try {
    const db = await initUserDb(req.userId)
    const { name, key, color, description } = req.body
    if (!name || !key) return res.status(400).json({ error: "缺少项目名称" })
    const [id] = allocateIds(db, "projects", 1)
    execute(db, "INSERT INTO projects (id, name, key, color, description, status) VALUES (?, ?, ?, ?, ?, 'active')",
      [id, name, key, color || "#4A90D9", description || ""])
    saveUserDb(req.userId)
    const project = queryOne(db, "SELECT * FROM projects WHERE id = ?", [id])
    res.json({ project, id })
  } catch (err) {
    console.error("Create project error:", err)
    res.status(500).json({ error: "创建项目失败" })
  }
})

router.post("/tasks", async (req, res) => {
  try {
    const db = await initUserDb(req.userId)
    const { title, description, project_id, parent_id, status, priority } = req.body
    if (!title) return res.status(400).json({ error: "缺少任务标题" })
    const pos = queryOne(db, "SELECT MAX(position) as mp FROM tasks WHERE status=?", [status || 'todo'])
    const [id] = allocateIds(db, "tasks", 1)
    execute(db, "INSERT INTO tasks (id, title, description, project_id, parent_id, status, priority, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, title, description || "", project_id || 1, parent_id || null, status || "todo", priority || "medium", (pos?.mp || 0) + 1])
    saveUserDb(req.userId)
    const task = queryOne(db, "SELECT t.*, p.name as project_name, p.key as project_key FROM tasks t LEFT JOIN projects p ON t.project_id=p.id WHERE t.id=?", [id])
    res.json({ task, id })
  } catch (err) {
    console.error("Create task error:", err)
    res.status(500).json({ error: "创建任务失败" })
  }
})

router.post("/tags", async (req, res) => {
  try {
    const db = await initUserDb(req.userId)
    const { name, color, project_id } = req.body
    if (!name) return res.status(400).json({ error: "缺少标签名" })
    const existing = queryOne(db, "SELECT * FROM tags WHERE name=? AND project_id=?", [name, project_id])
    if (existing) return res.json({ tag: existing, id: existing.id })
    const [id] = allocateIds(db, "tags", 1)
    execute(db, "INSERT INTO tags (id, name, color, project_id) VALUES (?, ?, ?, ?)", [id, name, color || "#409EFF", project_id])
    saveUserDb(req.userId)
    const tag = queryOne(db, "SELECT * FROM tags WHERE id=?", [id])
    res.json({ tag, id })
  } catch (err) {
    console.error("Create tag error:", err)
    res.status(500).json({ error: "创建标签失败" })
  }
})

router.post("/comments", async (req, res) => {
  try {
    const db = await initUserDb(req.userId)
    const { task_id, type, content } = req.body
    if (!task_id || !content) return res.status(400).json({ error: "缺少参数" })
    const [id] = allocateIds(db, "logs", 1)
    execute(db, "INSERT INTO task_logs (id, task_id, type, content) VALUES (?, ?, ?, ?)", [id, task_id, type || "comment", content])
    saveUserDb(req.userId)
    const log = queryOne(db, "SELECT * FROM task_logs WHERE id=?", [id])
    res.json({ log, id })
  } catch (err) {
    console.error("Create comment error:", err)
    res.status(500).json({ error: "创建评论失败" })
  }
})

module.exports = router
