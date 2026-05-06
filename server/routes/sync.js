const express = require("express")
const { initUserDb, saveUserDb, allocateIds, queryAll, queryOne, execute } = require("../database")

const router = express.Router()

function nextSeqNumber(db, projectId) {
  const row = queryOne(db,
    "SELECT MAX(seq_number) as m FROM tasks WHERE project_id = ? AND seq_assigned = 1",
    [projectId]
  )
  return ((row && row.m) || 0) + 1
}

function findExisting(db, table, id) {
  let row = queryOne(db, `SELECT * FROM ${table} WHERE id = ?`, [id])
  if (!row && id >= 1000000000000) {
    row = queryOne(db, `SELECT * FROM ${table} WHERE client_id = ?`, [id])
  }
  return row
}

function upsertProject(db, project, idRemap) {
  const existing = findExisting(db, 'projects', project.id)
  if (!existing) {
    let pid = project.id
    if (pid >= 1000000000000) {
      pid = allocateIds(db, 'projects')[0]
      idRemap[project.id] = pid
    }
    execute(db, "INSERT INTO projects (id, name, key, color, description, status, client_id, sync_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [pid, project.name, project.key, project.color || "#4A90D9", project.description || "", project.status || "active",
       pid !== project.id ? project.id : null, project.sync_version || 1,
       project.created_at || new Date().toISOString(), project.updated_at || new Date().toISOString()])
    return
  }
  if (new Date(project.updated_at) >= new Date(existing.updated_at)) {
    execute(db, "UPDATE projects SET name=?, key=?, color=?, description=?, status=?, sync_version=?, updated_at=? WHERE id=?",
      [project.name, project.key, project.color, project.description || "", project.status || "active",
       project.sync_version || 1, new Date(project.updated_at).toISOString(), existing.id])
  }
  if (existing.id !== project.id) idRemap[project.id] = existing.id
}

function upsertTask(db, task, idRemap) {
  const existing = findExisting(db, 'tasks', task.id)
  if (!existing) {
    let tid = task.id
    let cid = null
    if (tid >= 1000000000000) {
      cid = tid
      tid = allocateIds(db, 'tasks')[0]
      idRemap[task.id] = tid
    }
    // Remap project_id and parent_id
    let pid = idRemap[task.project_id] || task.project_id
    let parentId = task.parent_id ? (idRemap[task.parent_id] || task.parent_id) : null
    const sn = nextSeqNumber(db, pid)
    execute(db, "INSERT INTO tasks (id, title, description, project_id, parent_id, status, priority, start_date, end_date, position, seq_number, seq_assigned, client_id, sync_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [tid, task.title || "", task.description || "", pid, parentId, task.status || "todo", task.priority || "medium",
       task.start_date, task.end_date, task.position || 0, sn, 1, cid, task.sync_version || 1,
       task.created_at || new Date().toISOString(), task.updated_at || new Date().toISOString()])
    return
  }
  if (new Date(task.updated_at) >= new Date(existing.updated_at)) {
    let pid = idRemap[task.project_id] || task.project_id || existing.project_id
    let parentId = task.parent_id !== undefined ? (idRemap[task.parent_id] || task.parent_id) : existing.parent_id
    let sn = existing.seq_number || 0
    let sa = existing.seq_assigned || 0
    if (!sa) {
      sn = nextSeqNumber(db, pid)
      sa = 1
    }
    execute(db, "UPDATE tasks SET title=?, description=?, project_id=?, parent_id=?, status=?, priority=?, start_date=?, end_date=?, position=?, seq_number=?, seq_assigned=?, sync_version=?, updated_at=? WHERE id=?",
      [task.title, task.description || "", pid, parentId, task.status, task.priority, task.start_date, task.end_date,
       task.position, sn, sa, task.sync_version || 1, new Date(task.updated_at).toISOString(), existing.id])
  }
  if (existing.id !== task.id) idRemap[task.id] = existing.id
}

function upsertTag(db, tag, idRemap) {
  const existing = findExisting(db, 'tags', tag.id)
  if (!existing) {
    let gid = tag.id
    if (gid >= 1000000000000) {
      gid = allocateIds(db, 'tags')[0]
      idRemap[tag.id] = gid
    }
    let pid = idRemap[tag.project_id] || tag.project_id
    execute(db, "INSERT INTO tags (id, name, color, project_id) VALUES (?, ?, ?, ?)",
      [gid, tag.name, tag.color || "#409EFF", pid])
    return
  }
  if (tag.name) {
    execute(db, "UPDATE tags SET name=?, color=? WHERE id=?", [tag.name, tag.color || "#409EFF", existing.id])
  }
  if (existing.id !== tag.id) idRemap[tag.id] = existing.id
}

function upsertTaskTag(db, taskTag, idRemap) {
  const tid = idRemap[taskTag.task_id] || taskTag.task_id
  const gid = idRemap[taskTag.tag_id] || taskTag.tag_id
  const existing = queryOne(db, "SELECT 1 FROM task_tags WHERE task_id=? AND tag_id=?", [tid, gid])
  if (existing) return
  execute(db, "INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)", [tid, gid])
}

function upsertLog(db, log, idRemap) {
  const existing = queryOne(db, "SELECT id FROM task_logs WHERE id = ?", [log.id])
  if (existing) {
    execute(db, "UPDATE task_logs SET content=? WHERE id=?", [log.content, existing.id])
  } else {
    let lid = log.id
    if (lid >= 1000000000000) lid = allocateIds(db, 'logs')[0]
    let tid = idRemap[log.task_id] || log.task_id
    execute(db, "INSERT INTO task_logs (id, task_id, type, content, old_value, new_value, field, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [lid, tid, log.type, log.content, log.old_value || null, log.new_value || null, log.field || null,
       log.created_at || new Date().toISOString()])
  }
}

// --- ID 分配 ---

router.post("/gen-id", async (req, res) => {
  try {
    const db = await initUserDb(req.userId)
    const { entity, count = 1 } = req.body
    if (!['projects', 'tasks', 'tags', 'logs'].includes(entity)) {
      return res.status(400).json({ error: "无效的实体类型" })
    }
    const ids = allocateIds(db, entity, Number(count))
    saveUserDb(req.userId)
    res.json({ ids })
  } catch (err) {
    console.error("gen-id error:", err)
    res.status(500).json({ error: "获取ID失败" })
  }
})

// --- 同步 ---

router.get("/pull", async (req, res) => {
  try {
    const db = await initUserDb(req.userId)
    const sinceRaw = req.query.since || "1970-01-01T00:00:00Z"
    const since = sinceRaw.replace('T', ' ').substring(0, 19)
    const projects = queryAll(db, "SELECT * FROM projects")
    const tasks = queryAll(db, "SELECT * FROM tasks WHERE updated_at > ?", [since])
    const projectIds = projects.map(p => p.id)
    let tags = [], taskTags = [], logs = []
    if (projectIds.length > 0) {
      const placeholders = projectIds.map(() => "?").join(",")
      tags = queryAll(db, `SELECT * FROM tags WHERE project_id IN (${placeholders})`, projectIds)
      const allTasks = queryAll(db, "SELECT id FROM tasks")
      const allTaskIds = allTasks.map(t => t.id)
      if (allTaskIds.length > 0) {
        const tPlaceholders = allTaskIds.map(() => "?").join(",")
        taskTags = queryAll(db, `SELECT * FROM task_tags WHERE task_id IN (${tPlaceholders})`, allTaskIds)
        logs = queryAll(db, `SELECT * FROM task_logs WHERE task_id IN (${tPlaceholders}) AND type='comment'`, allTaskIds)
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
    const db = await initUserDb(req.userId)
    const { projects, tasks, tags, task_tags, task_logs, deleted_comment_ids, deleted_project_ids, deleted_task_ids } = req.body
    const idRemap = {}

    if (projects) { for (const p of projects) upsertProject(db, p, idRemap) }
    if (tasks) { for (const t of tasks) upsertTask(db, t, idRemap) }
    if (tags) { for (const t of tags) upsertTag(db, t, idRemap) }
    if (task_tags) {
      const taskIds = task_tags.map(tt => tt.task_id).filter((v, i, a) => a.indexOf(v) === i)
      for (const tid of taskIds) execute(db, "DELETE FROM task_tags WHERE task_id = ?", [idRemap[tid] || tid])
      for (const tt of task_tags) { if (!tt._deleted) upsertTaskTag(db, tt, idRemap) }
    }
    if (task_logs) {
      for (const l of task_logs) { if (l.type === 'comment') upsertLog(db, l, idRemap) }
    }
    if (deleted_comment_ids && deleted_comment_ids.length > 0) {
      for (const id of deleted_comment_ids) execute(db, "DELETE FROM task_logs WHERE id = ?", [id])
    }
    if (deleted_project_ids && deleted_project_ids.length > 0) {
      for (const id of deleted_project_ids) {
        const realId = idRemap[id] || id
        execute(db, "DELETE FROM projects WHERE id = ?", [realId])
      }
    }
    if (deleted_task_ids && deleted_task_ids.length > 0) {
      for (const id of deleted_task_ids) {
        const realId = idRemap[id] || id
        execute(db, "DELETE FROM tasks WHERE id = ?", [realId])
      }
    }

    saveUserDb(req.userId)

    const updatedProjects = queryAll(db, "SELECT id, updated_at, sync_version FROM projects")
    const updatedTasks = queryAll(db, "SELECT id, updated_at, sync_version FROM tasks")
    res.json({ ok: true, projects: updatedProjects, tasks: updatedTasks, id_remap: idRemap, server_time: new Date().toISOString() })
  } catch (err) {
    console.error("Push error:", err)
    res.status(500).json({ error: "同步失败" })
  }
})

router.get("/full", async (req, res) => {
  try {
    const db = await initUserDb(req.userId)
    const projects = queryAll(db, "SELECT * FROM projects")
    const tasks = queryAll(db, "SELECT * FROM tasks")
    const projectIds = projects.map(p => p.id)
    let tags = [], taskTags = [], logs = []
    if (projectIds.length > 0) {
      const placeholders = projectIds.map(() => "?").join(",")
      tags = queryAll(db, `SELECT * FROM tags WHERE project_id IN (${placeholders})`, projectIds)
      const taskIds = tasks.map(t => t.id)
      if (taskIds.length > 0) {
        const tPlaceholders = taskIds.map(() => "?").join(",")
        taskTags = queryAll(db, `SELECT * FROM task_tags WHERE task_id IN (${tPlaceholders})`, taskIds)
        logs = queryAll(db, `SELECT * FROM task_logs WHERE task_id IN (${tPlaceholders}) AND type='comment'`, taskIds)
      }
    }
    res.json({ projects, tasks, tags, task_tags: taskTags, task_logs: logs, server_time: new Date().toISOString() })
  } catch (err) {
    console.error("Full sync error:", err)
    res.status(500).json({ error: "获取全量数据失败" })
  }
})

module.exports = router
