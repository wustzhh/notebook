import { ipcMain } from 'electron'
import { initDatabase, queryAll, queryOne, execute } from '../database.js'
import { getServerConfig } from './serverConfig.js'

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
      if (data._remoteLog) {
        execute(
          'INSERT INTO task_logs (id, task_id, type, content, old_value, new_value, field, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [data.id, data.task_id, data.type, data.content, data.old_value || null, data.new_value || null, data.field || null, data.created_at || new Date().toISOString()]
        )
        return
      }
      const { serverUrl, token } = getServerConfig()
      if (!serverUrl || !token) throw new Error('未连接服务器，请先登录')
      const resp = await fetch(`${serverUrl}/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ task_id: data.task_id, type: data.type, content: data.content })
      })
      if (!resp.ok) throw new Error('服务器创建评论失败')
      const result: any = await resp.json()
      execute(
        'INSERT INTO task_logs (id, task_id, type, content, field, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [result.id, data.task_id, data.type, data.content, data.field || null, data.old_value || null, data.new_value || null]
      )
      return result.id
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
