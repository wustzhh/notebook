import { ipcMain, BrowserWindow } from 'electron'
import { initDatabase, queryAll, queryOne, execute, generateId } from '../database.js'

export function registerProjectHandlers(mainWindow: BrowserWindow) {
  // 获取所有项目
  ipcMain.handle('projects:get-all', async () => {
    try {
      await initDatabase()
      const projects = queryAll('SELECT * FROM projects ORDER BY created_at')
      return projects
    } catch (error) {
      console.error('Error fetching projects:', error)
      throw error
    }
  })

  // 获取单个项目
  ipcMain.handle('projects:get-by-id', async (_event, id: number) => {
    try {
      await initDatabase()
      const project = queryOne('SELECT * FROM projects WHERE id = ?', [id])
      return project
    } catch (error) {
      console.error('Error fetching project:', error)
      throw error
    }
  })

  // 创建项目
  ipcMain.handle('projects:create', async (_event, projectData: any) => {
    try {
      await initDatabase()

      let id: number
      if (projectData._remoteId) {
        id = projectData._remoteId
        execute(
          'INSERT INTO projects (id, name, key, color, description) VALUES (?, ?, ?, ?, ?)',
          [projectData._remoteId, projectData.name, projectData.key, projectData.color || '#4A90D9', projectData.description || '']
        )
      } else if (projectData._clientId) {
        id = projectData._clientId
        execute(
          'INSERT INTO projects (id, name, key, color, description) VALUES (?, ?, ?, ?, ?)',
          [id, projectData.name, projectData.key, projectData.color || '#4A90D9', projectData.description || '']
        )
      } else {
        id = generateId()
        execute(
          'INSERT INTO projects (id, name, key, color, description) VALUES (?, ?, ?, ?, ?)',
          [id, projectData.name, projectData.key, projectData.color || '#4A90D9', projectData.description || '']
        )
      }

      const newProject = queryOne('SELECT * FROM projects WHERE id = ?', [id])

      // 检查返回值是否有效
      if (!newProject) {
        throw new Error('创建项目后查询失败')
      }

      // 通知渲染进程
      mainWindow.webContents.send('project-created', newProject)

      return newProject
    } catch (error) {
      console.error('Error creating project:', error)
      throw error
    }
  })

  // 更新项目
  ipcMain.handle('projects:update', async (_event, id: number, data: any) => {
    try {
      await initDatabase()

      const fields: string[] = []
      const values: any[] = []

      if (data.name !== undefined) {
        fields.push('name = ?')
        values.push(data.name)
      }
      if (data.color !== undefined) {
        fields.push('color = ?')
        values.push(data.color)
      }
      if (data.description !== undefined) {
        fields.push('description = ?')
        values.push(data.description)
      }
      if (data.status !== undefined) {
        fields.push('status = ?')
        values.push(data.status)
      }

      fields.push('sync_version = 0')
      fields.push('updated_at = ?')
      values.push(new Date().toISOString())
      values.push(id)

      execute(
        `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`,
        values
      )

      const updatedProject = queryOne('SELECT * FROM projects WHERE id = ?', [id])

      // 检查返回值是否有效
      if (!updatedProject) {
        throw new Error('更新项目后查询失败')
      }

      // 通知渲染进程
      mainWindow.webContents.send('project-updated', updatedProject)

      return updatedProject
    } catch (error) {
      console.error('Error updating project:', error)
      throw error
    }
  })

  // 删除项目
  ipcMain.handle('projects:delete', async (_event, id: number) => {
    try {
      await initDatabase()
      execute('DELETE FROM task_logs WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)', [id])
      execute('DELETE FROM task_tags WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)', [id])
      execute('DELETE FROM tasks WHERE project_id = ?', [id])
      execute('DELETE FROM tags WHERE project_id = ?', [id])
      execute('DELETE FROM projects WHERE id = ?', [id])

      // 通知渲染进程
      mainWindow.webContents.send('project-deleted', id)
    } catch (error) {
      console.error('Error deleting project:', error)
      throw error
    }
  })

  // 批量保存（同步下载的数据直接写入本地 DB）
  ipcMain.handle('projects:save-all', async (_event, data: any[]) => {
    await initDatabase()
    for (const p of data) {
      const cols = ['id', 'name', 'key', 'color', 'description', 'status', 'sync_version', 'created_at', 'updated_at']
      const vals = [p.id, p.name, p.key, p.color || '#4A90D9', p.description || '', p.status || 'active', p.sync_version || 0, p.created_at || new Date().toISOString(), p.updated_at || new Date().toISOString()]
      const existing = queryOne('SELECT id FROM projects WHERE id = ?', [p.id])
      if (existing) {
        execute(`UPDATE projects SET ${cols.map(c => `${c}=?`).join(',')} WHERE id=?`, [...vals, p.id])
      } else {
        execute(`INSERT INTO projects (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, vals)
      }
    }
    console.log('saveAll projects done:', data.length, 'items')
  })

  ipcMain.handle('projects:clear-all', async () => {
    await initDatabase()
    execute('DELETE FROM task_logs')
    execute('DELETE FROM task_tags')
    execute('DELETE FROM tasks')
    execute('DELETE FROM tags')
    execute('DELETE FROM projects')
  })
}
