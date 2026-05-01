import { ipcMain } from 'electron'
import { initDatabase, queryAll, execute } from '../database.js'

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
      execute(
        'INSERT INTO task_logs (task_id, type, content, old_value, new_value, field) VALUES (?, ?, ?, ?, ?, ?)',
        [data.task_id, data.type, data.content, data.old_value || null, data.new_value || null, data.field || null]
      )
    } catch (error) {
      console.error('Error creating log:', error)
      throw error
    }
  })
}
