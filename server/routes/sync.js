const express = require("express")
const { initDb, queryAll, queryOne, execute } = require("../database")

const router = express.Router()

function upsertProject(project, userId) {
  const existing = queryOne("SELECT * FROM projects WHERE id = ? AND user_id = ?", [project.id, userId])
  if (!existing) {
    execute(
      "INSERT INTO projects (id, name, key, color, description, status, user_id, sync_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [project.id, project.name, project.key, project.color || "#4A90D9", project.description || "", project.status || "active", userId, project.sync_version || 1, project.created_at || new Date().toISOString(), project.updated_at || new Date().toISOString()]
    )
    return
  }
  if (new Date(project.updated_at) > new Date(existing.updated_at)) {
    execute(
      "UPDATE projects SET name=?, key=?, color=?, description=?, status=?, sync_version=?, updated_at=? WHERE id=? AND user_id=?",
      [project.name, project.key, project.color, project.description || "", project.status || "active", project.sync_version || 1, project.updated_at, project.id, userId]
    )
  }
}

function upsertTask(task, userId) {
  const existing = queryOne("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [task.id, userId])
  if (!existing) {
    execute(
      "INSERT INTO tasks (id, title, description, project_id, parent_id, status, priority, start_date, end_date, position, user_id, sync_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [task.id, task.title || "", task.description || "", task.project_id, task.parent_id || null, task.status || "todo", task.priority || "medium", task.start_date, task.end_date, task.position || 0, userId, task.sync_version || 1, task.created_at || new Date().toISOString(), task.updated_at || new Date().toISOString()]
    )
    return
  }
  if (new Date(task.updated_at) > new Date(existing.updated_at)) {
    execute(
      "UPDATE tasks SET title=?, description=?, project_id=?, parent_id=?, status=?, priority=?, start_date=?, end_date=?, position=?, sync_version=?, updated_at=? WHERE id=? AND user_id=?",
      [task.title, task.description || "", task.project_id, task.parent_id || null, task.status, task.priority, task.start_date, task.end_date, task.position, task.sync_version || 1, task.updated_at, task.id, userId]
    )
  }
}

router.get("/pull", async (req, res) => {
  try {
    await initDb()
    const since = req.query.since || "1970-01-01T00:00:00Z"
    const projects = queryAll("SELECT * FROM projects WHERE user_id = ? AND updated_at > ?", [req.userId, since])
    const tasks = queryAll("SELECT * FROM tasks WHERE user_id = ? AND updated_at > ?", [req.userId, since])
    res.json({ projects, tasks, server_time: new Date().toISOString() })
  } catch (err) {
    console.error("Pull error:", err)
    res.status(500).json({ error: "同步失败" })
  }
})

router.post("/push", async (req, res) => {
  try {
    await initDb()
    const { projects, tasks } = req.body
    if (projects && projects.length > 0) {
      for (const project of projects) {
        upsertProject(project, req.userId)
      }
    }
    if (tasks && tasks.length > 0) {
      for (const task of tasks) {
        upsertTask(task, req.userId)
      }
    }
    const updatedProjects = queryAll("SELECT id, updated_at, sync_version FROM projects WHERE user_id = ?", [req.userId])
    const updatedTasks = queryAll("SELECT id, updated_at, sync_version FROM tasks WHERE user_id = ?", [req.userId])
    res.json({ ok: true, projects: updatedProjects, tasks: updatedTasks, server_time: new Date().toISOString() })
  } catch (err) {
    console.error("Push error:", err)
    res.status(500).json({ error: "同步失败" })
  }
})

router.get("/full", async (req, res) => {
  try {
    await initDb()
    const projects = queryAll("SELECT * FROM projects WHERE user_id = ?", [req.userId])
    const tasks = queryAll("SELECT * FROM tasks WHERE user_id = ?", [req.userId])
    res.json({ projects, tasks, server_time: new Date().toISOString() })
  } catch (err) {
    console.error("Full sync error:", err)
    res.status(500).json({ error: "获取全量数据失败" })
  }
})

module.exports = router
