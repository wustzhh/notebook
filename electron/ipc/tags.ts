import { ipcMain, BrowserWindow } from 'electron'
import { initDatabase, queryAll, queryOne, execute, generateId } from '../database.js'

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
      const existing = queryOne('SELECT * FROM tags WHERE name = ? AND project_id = ?', [data.name, data.project_id])
      if (existing) return existing

      let id: number
      if (data._remoteId) {
        id = data._remoteId
      } else if (data._clientId) {
        id = data._clientId
      } else {
        id = generateId()
      }

      execute(
        'INSERT INTO tags (id, name, color, project_id) VALUES (?, ?, ?, ?)',
        [id, data.name, data.color || '#409EFF', data.project_id]
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

  ipcMain.handle('tags:save-all', async (_event, tagsData: any[], taskTagsData: any[]) => {
    await initDatabase()
    if (tagsData && tagsData.length > 0) {
      const tCols = ['id', 'name', 'color', 'project_id']
      for (const t of tagsData) {
        try {
          const tVals = [t.id, t.name, t.color || '#409EFF', t.project_id]
          const existing = queryOne('SELECT id FROM tags WHERE id = ?', [t.id])
          if (existing) {
            execute(`UPDATE tags SET ${tCols.map(c => `${c}=?`).join(',')} WHERE id=?`, [...tVals, t.id])
          } else {
            execute(`INSERT INTO tags (${tCols.join(',')}) VALUES (${tCols.map(() => '?').join(',')})`, tVals)
          }
        } catch (e: any) {
          console.error('saveAll tag failed:', t.id, e.message)
        }
      }
    }
    if (taskTagsData && taskTagsData.length > 0) {
      const taskIds = [...new Set(taskTagsData.map((tt: any) => tt.task_id))]
      for (const tid of taskIds) {
        execute('DELETE FROM task_tags WHERE task_id = ?', [tid])
      }
      for (const tt of taskTagsData) {
        execute('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)', [tt.task_id, tt.tag_id])
      }
    }
  })
}
