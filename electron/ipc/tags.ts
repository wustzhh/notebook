import { ipcMain, BrowserWindow } from 'electron'
import { initDatabase, queryAll, queryOne, execute } from '../database.js'

export function registerTagHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle('tags:get-by-project', async (_event, projectId: number) => {
    try {
      await initDatabase()
      return queryAll('SELECT * FROM tags WHERE project_id = ? ORDER BY id', [projectId])
    } catch (error) {
      console.error('Error fetching tags:', error)
      throw error
    }
  })

  ipcMain.handle('tags:get-for-task', async (_event, taskId: number) => {
    try {
      await initDatabase()
      return queryAll(
        'SELECT t.* FROM tags t INNER JOIN task_tags tt ON t.id = tt.tag_id WHERE tt.task_id = ?',
        [taskId]
      )
    } catch (error) {
      console.error('Error fetching task tags:', error)
      throw error
    }
  })

  ipcMain.handle('tags:create', async (_event, data: any) => {
    try {
      await initDatabase()
      // 检查同名标签是否已存在
      const existing = queryOne('SELECT * FROM tags WHERE name = ? AND project_id = ?', [data.name, data.project_id])
      if (existing) return existing
      const id = execute(
        'INSERT INTO tags (name, color, project_id) VALUES (?, ?, ?)',
        [data.name, data.color || '#409EFF', data.project_id]
      )
      const tag = queryOne('SELECT * FROM tags WHERE id = ?', [id])
      mainWindow.webContents.send('tag-created', tag)
      return tag
    } catch (error) {
      console.error('Error creating tag:', error)
      throw error
    }
  })

  ipcMain.handle('tags:delete', async (_event, id: number) => {
    try {
      await initDatabase()
      execute('DELETE FROM tags WHERE id = ?', [id])
      mainWindow.webContents.send('tag-deleted', id)
    } catch (error) {
      console.error('Error deleting tag:', error)
      throw error
    }
  })

  ipcMain.handle('tags:set-task-tags', async (_event, taskId: number, tagIds: number[]) => {
    try {
      await initDatabase()
      execute('DELETE FROM task_tags WHERE task_id = ?', [taskId])
      for (const tagId of tagIds) {
        execute('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)', [taskId, tagId])
      }
    } catch (error) {
      console.error('Error setting task tags:', error)
      throw error
    }
  })
}
