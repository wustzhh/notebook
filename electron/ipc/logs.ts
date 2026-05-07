import { ipcMain } from 'electron'
import { initDatabase, queryAll, queryOne, execute, generateId } from '../database.js'

export function registerLogHandlers() {
  ipcMain.handle('logs:get-by-task', async (_event, taskId: number) => {
    try {
      await initDatabase()
      return queryAll('SELECT * FROM task_logs WHERE task_id = ? ORDER BY created_at DESC', [taskId])
    } catch (error) {
      console.error('Error fetching logs:', error)
      throw error
    }
  })

  ipcMain.handle('logs:create', async (_event, data: any) => {
    try {
      await initDatabase()
      let id: number
      if (data._remoteId) {
        id = data._remoteId
      } else if (data._clientId) {
        id = data._clientId
      } else if (data.id) {
        id = data.id
      } else {
        id = generateId()
      }
      execute(
        'INSERT INTO task_logs (id, task_id, type, content, old_value, new_value, field, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, data.task_id, data.type, data.content, data.old_value || null, data.new_value || null, data.field || null, data.created_at || new Date().toISOString()]
      )
      return id
    } catch (error) {
      console.error('Error creating log:', error)
      throw error
    }
  })

  ipcMain.handle('logs:update', async (_event, id: number, content: string) => {
    try {
      await initDatabase()
      execute('UPDATE task_logs SET content = ? WHERE id = ?', [content, id])
    } catch (error) {
      console.error('Error updating log:', error)
      throw error
    }
  })

  ipcMain.handle('logs:delete', async (_event, id: number) => {
    try {
      await initDatabase()
      execute('DELETE FROM task_logs WHERE id = ?', [id])
    } catch (error) {
      console.error('Error deleting log:', error)
      throw error
    }
  })

  ipcMain.handle('logs:save-all', async (_event, data: any[]) => {
    await initDatabase()
    const cols = ['id', 'task_id', 'type', 'content', 'old_value', 'new_value', 'field', 'created_at']
    for (const l of data) {
      if (l.type !== 'comment') continue
      const vals = [l.id, l.task_id, l.type, l.content, l.old_value || null, l.new_value || null, l.field || null, l.created_at || new Date().toISOString()]
      const existing = queryOne('SELECT id FROM task_logs WHERE id = ?', [l.id])
      if (!existing) {
        try {
          execute(`INSERT INTO task_logs (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, vals)
        } catch (e: any) { console.error('saveAll log failed:', l.id, e.message) }
      }
    }
  })
}
