const express = require("express")
const { initDb, queryAll, queryOne, execute } = require("../database")

const router = express.Router()

function upsertProject(project, userId) {
  const existing = queryOne("SELECT * FROM projects WHERE id = ? AND user_id = ?", [project.id, userId])
  if (!existing) {
    execute("INSERT INTO projects (id, name, key, color, description, status, user_id, sync_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [project.id, project.name, project.key, project.color || "#4A90D9", project.description || "", project.status || "active", userId, project.sync_version || 1, project.created_at || new Date().toISOString(), project.updated_at || new Date().toISOString()])
    return
  }
  if (new Date(project.updated_at) > new Date(existing.updated_at)) {
    execute("UPDATE projects SET name=?, key=?, color=?, description=?, status=?, sync_version=?, updated_at=? WHERE id=? AND user_id=?",
      [project.name, project.key, project.color, project.description || "", project.status || "active", project.sync_version || 1, project.updated_at, project.id, userId])
  }
}

function upsertTask(task, userId) {
  const existing = queryOne("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [task.id, userId])
  if (!existing) {
    execute("INSERT INTO tasks (id, title, description, project_id, parent_id, status, priority, start_date, end_date, position, user_id, sync_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [task.id, task.title || "", task.description || "", task.project_id, task.parent_id || null, task.status || "todo", task.priority || "medium", task.start_date, task.end_date, task.position || 0, userId, task.sync_version || 1, task.created_at || new Date().toISOString(), task.updated_at || new Date().toISOString()])
    return
  }
  if (new Date(task.updated_at) > new Date(existing.updated_at)) {
    execute("UPDATE tasks SET title=?, description=?, project_id=?, parent_id=?, status=?, priority=?, start_date=?, end_date=?, position=?, sync_version=?, updated_at=? WHERE id=? AND user_id=?",
      [task.title, task.description || "", task.project_id, task.parent_id || null, task.status, task.priority, task.start_date, task.end_date, task.position, task.sync_version || 1, task.updated_at, task.id, userId])
  }
}

function upsertTag(tag, userId) {
  const existing = queryOne("SELECT * FROM tags WHERE id = ?", [tag.id])
  if (!existing) {
    execute("INSERT INTO tags (id, name, color, project_id) VALUES (?, ?, ?, ?)",
      [tag.id, tag.name, tag.color || "#409EFF", tag.project_id])
  } else if (tag.name) {
    execute("UPDATE tags SET name=?, color=? WHERE id=?", [tag.name, tag.color || "#409EFF", tag.id])
  }
}

function upsertTaskTag(taskTag) {
  const existing = queryOne("SELECT 1 FROM task_tags WHERE task_id=? AND tag_id=?", [taskTag.task_id, taskTag.tag_id])
  if (existing) return
  execute("INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)", [taskTag.task_id, taskTag.tag_id])
}

function deleteTaskTags(taskId) {
  execute("DELETE FROM task_tags WHERE task_id = ?", [taskId])
}

function upsertLog(log, userId) {
  const existing = queryOne("SELECT id FROM task_logs WHERE id = ?", [log.id])
  if (existing) return
  execute("INSERT INTO task_logs (id, task_id, type, content, old_value, new_value, field, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [log.id, log.task_id, log.type, log.content, log.old_value || null, log.new_value || null, log.field || null, log.created_at || new Date().toISOString()])
}

router.get("/pull", async (req, res) => {
  try {
    await initDb()
    const since = req.query.since || "1970-01-01T00:00:00Z"
    const projects = queryAll("SELECT * FROM projects WHERE user_id = ? AND updated_at > ?", [req.userId, since])
    const tasks = queryAll("SELECT * FROM tasks WHERE user_id = ? AND updated_at > ?", [req.userId, since])
    // 拉取所有标签（属于该用户项目的）
    const projectIds = projects.map(p => p.id)
    let tags = [], taskTags = [], logs = []
    if (projectIds.length > 0) {
      const placeholders = projectIds.map(() => "?").join(",")
      tags = queryAll(`SELECT * FROM tags WHERE project_id IN (${placeholders})`, projectIds)
      const taskIds = tasks.map(t => t.id)
      if (taskIds.length > 0) {
        const tPlaceholders = taskIds.map(() => "?").join(",")
        taskTags = queryAll(`SELECT * FROM task_tags WHERE task_id IN (${tPlaceholders})`, taskIds)
        logs = queryAll(`SELECT * FROM task_logs WHERE task_id IN (${tPlaceholders}) AND type='comment' AND created_at > ?`, [...taskIds, since])
      }
    }
    res.json({ projects, tasks, tags, task_tags: taskTags, task_logs: logs, server_time: new Date().toISOString() })
  } catch (err) {
    console.error("Pull error:", err)
    res.status(500).json({ error: "同步失败" })
  }
})

router.post("/push", async (req, res) => {
  try {
    await initDb()
    const { projects, tasks, tags, task_tags, task_logs } = req.body
    if (projects) { for (const p of projects) upsertProject(p, req.userId) }
    if (tasks) { for (const t of tasks) upsertTask(t, req.userId) }
    if (tags) { for (const t of tags) upsertTag(t, req.userId) }
    if (task_tags) {
      // 删除这些任务的所有旧标签关联
      const taskIds = task_tags.map((tt) => tt.task_id).filter((v, i, a) => a.indexOf(v) === i)
      for (const tid of taskIds) {
        execute("DELETE FROM task_tags WHERE task_id = ?", [tid])
      }
      for (const tt of task_tags) {
        if (!tt._deleted) upsertTaskTag(tt)
      }
    }
    // 只同步人工评论
    if (task_logs) {
      for (const l of task_logs) {
        if (l.type === 'comment') upsertLog(l, req.userId)
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
    const projectIds = projects.map(p => p.id)
    let tags = [], taskTags = [], logs = []
    if (projectIds.length > 0) {
      const placeholders = projectIds.map(() => "?").join(",")
      tags = queryAll(`SELECT * FROM tags WHERE project_id IN (${placeholders})`, projectIds)
      const taskIds = tasks.map(t => t.id)
      if (taskIds.length > 0) {
        const tPlaceholders = taskIds.map(() => "?").join(",")
        taskTags = queryAll(`SELECT * FROM task_tags WHERE task_id IN (${tPlaceholders})`, taskIds)
        logs = queryAll(`SELECT * FROM task_logs WHERE task_id IN (${tPlaceholders}) AND type='comment'`, taskIds)
      }
    }
    res.json({ projects, tasks, tags, task_tags: taskTags, task_logs: logs, server_time: new Date().toISOString() })
  } catch (err) {
    console.error("Full sync error:", err)
    res.status(500).json({ error: "获取全量数据失败" })
  }
})

module.exports = router
