import { ipcMain } from 'electron';
import { initDatabase, queryAll, queryOne, execute, saveDatabase } from '../database.js';
export function registerTaskHandlers(mainWindow) {
    // 获取所有任务
    ipcMain.handle('tasks:get-all', async () => {
        try {
            await initDatabase();
            const tasks = queryAll(`
        SELECT t.*, p.name as project_name, p.key as project_key
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        ORDER BY t.position
      `);
            return tasks;
        }
        catch (error) {
            console.error('Error fetching tasks:', error);
            throw error;
        }
    });
    // 获取单个任务
    ipcMain.handle('tasks:get-by-id', async (_event, id) => {
        try {
            await initDatabase();
            const task = queryOne(`
        SELECT t.*, p.name as project_name, p.key as project_key
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.id = ?
      `, [id]);
            return task;
        }
        catch (error) {
            console.error('Error fetching task:', error);
            throw error;
        }
    });
    // 创建任务
    ipcMain.handle('tasks:create', async (_event, taskData) => {
        try {
            await initDatabase();
            // 获取当前最大 position
            const maxPosResult = queryOne('SELECT MAX(position) as max_pos FROM tasks WHERE status = ?', [taskData.status || 'todo']);
            const newPosition = (maxPosResult?.max_pos || 0) + 1;
            const id = execute(`INSERT INTO tasks (title, description, project_id, parent_id, status, priority, start_date, end_date, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                taskData.title,
                taskData.description || '',
                taskData.project_id || 1,
                taskData.parent_id || null,
                taskData.status || 'todo',
                taskData.priority || 'medium',
                taskData.start_date || null,
                taskData.end_date || null,
                newPosition
            ]);
            const newTask = queryOne('SELECT * FROM tasks WHERE id = ?', [id]);
            // 通知渲染进程
            mainWindow.webContents.send('task-created', newTask);
            return newTask;
        }
        catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    });
    // 更新任务
    ipcMain.handle('tasks:update', async (_event, id, data) => {
        try {
            await initDatabase();
            const fields = [];
            const values = [];
            if (data.title !== undefined) {
                fields.push('title = ?');
                values.push(data.title);
            }
            if (data.description !== undefined) {
                fields.push('description = ?');
                values.push(data.description);
            }
            if (data.status !== undefined) {
                fields.push('status = ?');
                values.push(data.status);
            }
            if (data.priority !== undefined) {
                fields.push('priority = ?');
                values.push(data.priority);
            }
            if (data.start_date !== undefined) {
                fields.push('start_date = ?');
                values.push(data.start_date);
            }
            if (data.end_date !== undefined) {
                fields.push('end_date = ?');
                values.push(data.end_date);
            }
            if (data.parent_id !== undefined) {
                fields.push('parent_id = ?');
                values.push(data.parent_id);
            }
            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(id);
            execute(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
            const updatedTask = queryOne('SELECT * FROM tasks WHERE id = ?', [id]);
            // 通知渲染进程
            mainWindow.webContents.send('task-updated', updatedTask);
            return updatedTask;
        }
        catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    });
    // 删除任务
    ipcMain.handle('tasks:delete', async (_event, id) => {
        try {
            await initDatabase();
            execute('DELETE FROM tasks WHERE id = ?', [id]);
            // 通知渲染进程
            mainWindow.webContents.send('task-deleted', id);
        }
        catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    });
    // 重新排序任务（拖拽后）
    ipcMain.handle('tasks:reorder', async (_event, updates) => {
        try {
            await initDatabase();
            // 使用事务批量更新
            for (const update of updates) {
                execute('UPDATE tasks SET status = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [update.status, update.position, update.id]);
            }
            saveDatabase();
            // 通知渲染进程刷新
            mainWindow.webContents.send('tasks-reordered');
        }
        catch (error) {
            console.error('Error reordering tasks:', error);
            throw error;
        }
    });
}
