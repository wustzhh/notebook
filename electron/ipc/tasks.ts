import { ipcMain, BrowserWindow } from 'electron'
import { initDatabase, queryAll, queryOne, execute, saveDatabase, generateId } from '../database.js'

export function registerTaskHandlers(mainWindow: BrowserWindow) {
  // 获取所有任务
  ipcMain.handle('tasks:get-all', async () => {
    try {
      await initDatabase()
      const tasks = queryAll(`
        SELECT t.*, p.name as project_name, p.key as project_key
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        ORDER BY t.position
      `)
      return tasks
    } catch (error) {
      console.error('Error fetching tasks:', error)
      throw error
    }
  })

  // 获取单个任务
  ipcMain.handle('tasks:get-by-id', async (_event, id: number) => {
    try {
      await initDatabase()
      const task = queryOne(`
        SELECT t.*, p.name as project_name, p.key as project_key
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.id = ?
      `, [id])
      return task
    } catch (error) {
      console.error('Error fetching task:', error)
      throw error
    }
  })

  // 创建任务
  ipcMain.handle('tasks:create', async (_event, taskData: any) => {
    try {
      await initDatabase()

      // 获取当前最大 position
      const maxPosResult = queryOne(
        'SELECT MAX(position) as max_pos FROM tasks WHERE status = ?',
        [taskData.status || 'todo']
      )
      const newPosition = (maxPosResult?.max_pos || 0) + 1

      let id: number
      if (taskData._remoteId) {
        id = taskData._remoteId
        execute(
          `INSERT OR REPLACE INTO tasks (id, title, description, project_id, parent_id, status, priority, start_date, end_date, position, seq_number, seq_assigned, images)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [taskData._remoteId, taskData.title, taskData.description || '', taskData.project_id || 1, taskData.parent_id || null,
           taskData.status || 'todo', taskData.priority || 'medium', taskData.start_date || null, taskData.end_date || null,
           newPosition, taskData.seq_number || 0, taskData.seq_assigned || 0, taskData.images || '[]']
        )
      } else if (taskData._clientId) {
        id = taskData._clientId
        execute(
          `INSERT INTO tasks (id, title, description, project_id, parent_id, status, priority, start_date, end_date, position, seq_number, seq_assigned, images)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, taskData.title, taskData.description || '', taskData.project_id || 1, taskData.parent_id || null,
           taskData.status || 'todo', taskData.priority || 'medium', taskData.start_date || null, taskData.end_date || null,
           newPosition, taskData.seq_number || 0, taskData.seq_assigned || 0, taskData.images || '[]']
        )
      } else {
        id = generateId()
        execute(
          `INSERT INTO tasks (id, title, description, project_id, parent_id, status, priority, start_date, end_date, position, seq_number, seq_assigned, images)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, taskData.title, taskData.description || '', taskData.project_id || 1, taskData.parent_id || null,
           taskData.status || 'todo', taskData.priority || 'medium', taskData.start_date || null, taskData.end_date || null,
           newPosition, taskData.seq_number || 0, taskData.seq_assigned || 0, taskData.images || '[]']
        )
      }

      const newTask = queryOne(`
        SELECT t.*, p.name as project_name, p.key as project_key
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.id = ?
      `, [id])

      // 检查返回值是否有效
      if (!newTask) {
        throw new Error('创建任务后查询失败')
      }

      // 通知渲染进程
      mainWindow.webContents.send('task-created', newTask)

      return newTask
    } catch (error) {
      console.error('Error creating task:', error)
      throw error
    }
  })

  // 更新任务
  ipcMain.handle('tasks:update', async (_event, id: number, data: any) => {
    try {
      await initDatabase()

      const fields: string[] = []
      const values: any[] = []

      if (data.title !== undefined) {
        fields.push('title = ?')
        values.push(data.title)
      }
      if (data.description !== undefined) {
        fields.push('description = ?')
        values.push(data.description)
      }
      if (data.status !== undefined) {
        fields.push('status = ?')
        values.push(data.status)
      }
      if (data.priority !== undefined) {
        fields.push('priority = ?')
        values.push(data.priority)
      }
      if (data.start_date !== undefined) {
        fields.push('start_date = ?')
        values.push(data.start_date)
      }
      if (data.end_date !== undefined) {
        fields.push('end_date = ?')
        values.push(data.end_date)
      }
      if (data.parent_id !== undefined) {
        fields.push('parent_id = ?')
        values.push(data.parent_id)
      }
      if (data.images !== undefined) {
        fields.push('images = ?')
        values.push(data.images)
      }

      fields.push('sync_version = 0')
      fields.push('updated_at = ?')
      values.push(new Date().toISOString())
      values.push(id)

      execute(
        `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`,
        values
      )

      const updatedTask = queryOne(`
        SELECT t.*, p.name as project_name, p.key as project_key
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.id = ?
      `, [id])

      // 检查返回值是否有效
      if (!updatedTask) {
        throw new Error('更新任务后查询失败')
      }

      // 通知渲染进程
      mainWindow.webContents.send('task-updated', updatedTask)

      return updatedTask
    } catch (error) {
      console.error('Error updating task:', error)
      throw error
    }
  })

  // 删除任务
  ipcMain.handle('tasks:delete', async (_event, id: number) => {
    try {
      await initDatabase()
      execute('DELETE FROM task_logs WHERE task_id IN (SELECT id FROM tasks WHERE parent_id = ?)', [id])
      execute('DELETE FROM task_logs WHERE task_id = ?', [id])
      execute('DELETE FROM task_tags WHERE task_id = ?', [id])
      execute('DELETE FROM tasks WHERE parent_id = ?', [id])
      execute('DELETE FROM tasks WHERE id = ?', [id])

      // 通知渲染进程
      mainWindow.webContents.send('task-deleted', id)
    } catch (error) {
      console.error('Error deleting task:', error)
      throw error
    }
  })

  // 重新排序任务（拖拽后）
  ipcMain.handle('tasks:reorder', async (_event, updates: Array<{ id: number; status: string; position: number }>) => {
    try {
      await initDatabase()

      const now = new Date().toISOString()
      for (const update of updates) {
        execute(
          'UPDATE tasks SET status = ?, position = ?, sync_version = 0, updated_at = ? WHERE id = ?',
          [update.status, update.position, now, update.id]
        )
      }

      saveDatabase()
      mainWindow.webContents.send('tasks-reordered')
    } catch (error) {
      console.error('Error reordering tasks:', error)
      throw error
    }
  })

  // 批量保存（同步下载的数据）
  ipcMain.handle('tasks:save-all', async (_event, data: any[]) => {
    await initDatabase()
    const cols = ['id', 'title', 'description', 'project_id', 'parent_id', 'status', 'priority', 'start_date', 'end_date', 'position', 'seq_number', 'seq_assigned', 'images', 'sync_version', 'created_at', 'updated_at']
    for (const t of data) {
      try {
        const vals = [t.id, t.title, t.description || '', t.project_id, t.parent_id ?? null, t.status || 'todo', t.priority || 'medium', t.start_date ?? null, t.end_date ?? null, t.position || 0, t.seq_number || 0, t.seq_assigned || 0, t.images || '[]', t.sync_version || 0, t.created_at || new Date().toISOString(), t.updated_at || new Date().toISOString()]
        const existing = queryOne('SELECT id FROM tasks WHERE id = ?', [t.id])
        if (existing) {
          execute(`UPDATE tasks SET ${cols.map(c => `${c}=?`).join(',')} WHERE id=?`, [...vals, t.id])
        } else {
          execute(`INSERT INTO tasks (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, vals)
        }
      } catch (e: any) {
        console.error('saveAll task failed:', t.id, e.message)
      }
    }
    console.log('saveAll tasks done:', data.length)
  })
}
