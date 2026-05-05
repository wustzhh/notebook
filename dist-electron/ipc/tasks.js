"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTaskHandlers = registerTaskHandlers;
const electron_1 = require("electron");
const database_js_1 = require("../database.js");
function registerTaskHandlers(mainWindow) {
    // 获取所有任务
    electron_1.ipcMain.handle('tasks:get-all', async () => {
        try {
            await (0, database_js_1.initDatabase)();
            const tasks = (0, database_js_1.queryAll)(`
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
    electron_1.ipcMain.handle('tasks:get-by-id', async (_event, id) => {
        try {
            await (0, database_js_1.initDatabase)();
            const task = (0, database_js_1.queryOne)(`
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
    electron_1.ipcMain.handle('tasks:create', async (_event, taskData) => {
        try {
            await (0, database_js_1.initDatabase)();
            // 获取当前最大 position
            const maxPosResult = (0, database_js_1.queryOne)('SELECT MAX(position) as max_pos FROM tasks WHERE status = ?', [taskData.status || 'todo']);
            const newPosition = (maxPosResult?.max_pos || 0) + 1;
            let id;
            if (taskData._remoteId) {
                id = (0, database_js_1.execute)(`INSERT OR REPLACE INTO tasks (id, title, description, project_id, parent_id, status, priority, start_date, end_date, position)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [taskData._remoteId, taskData.title, taskData.description || '', taskData.project_id || 1, taskData.parent_id || null, taskData.status || 'todo', taskData.priority || 'medium', taskData.start_date || null, taskData.end_date || null, newPosition]);
            }
            else {
                id = (0, database_js_1.generateId)();
                (0, database_js_1.execute)(`INSERT INTO tasks (id, title, description, project_id, parent_id, status, priority, start_date, end_date, position)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, taskData.title, taskData.description || '', taskData.project_id || 1, taskData.parent_id || null, taskData.status || 'todo', taskData.priority || 'medium', taskData.start_date || null, taskData.end_date || null, newPosition]);
            }
            const newTask = (0, database_js_1.queryOne)(`
        SELECT t.*, p.name as project_name, p.key as project_key
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.id = ?
      `, [id]);
            // 检查返回值是否有效
            if (!newTask) {
                throw new Error('创建任务后查询失败');
            }
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
    electron_1.ipcMain.handle('tasks:update', async (_event, id, data) => {
        try {
            await (0, database_js_1.initDatabase)();
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
            fields.push('sync_version = 0');
            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(id);
            (0, database_js_1.execute)(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
            const updatedTask = (0, database_js_1.queryOne)(`
        SELECT t.*, p.name as project_name, p.key as project_key
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.id = ?
      `, [id]);
            // 检查返回值是否有效
            if (!updatedTask) {
                throw new Error('更新任务后查询失败');
            }
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
    electron_1.ipcMain.handle('tasks:delete', async (_event, id) => {
        try {
            await (0, database_js_1.initDatabase)();
            (0, database_js_1.execute)('DELETE FROM tasks WHERE id = ?', [id]);
            // 通知渲染进程
            mainWindow.webContents.send('task-deleted', id);
        }
        catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    });
    // 重新排序任务（拖拽后）
    electron_1.ipcMain.handle('tasks:reorder', async (_event, updates) => {
        try {
            await (0, database_js_1.initDatabase)();
            // 使用事务批量更新
            for (const update of updates) {
                (0, database_js_1.execute)('UPDATE tasks SET status = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [update.status, update.position, update.id]);
            }
            (0, database_js_1.saveDatabase)();
            // 通知渲染进程刷新
            mainWindow.webContents.send('tasks-reordered');
        }
        catch (error) {
            console.error('Error reordering tasks:', error);
            throw error;
        }
    });
    // 批量保存（同步下载的数据）
    electron_1.ipcMain.handle('tasks:save-all', async (_event, data) => {
        await (0, database_js_1.initDatabase)();
        const cols = ['id', 'title', 'description', 'project_id', 'parent_id', 'status', 'priority', 'start_date', 'end_date', 'position', 'sync_version', 'created_at', 'updated_at'];
        for (const t of data) {
            try {
                const vals = [t.id, t.title, t.description || '', t.project_id, t.parent_id ?? null, t.status || 'todo', t.priority || 'medium', t.start_date ?? null, t.end_date ?? null, t.position || 0, t.sync_version || 0, t.created_at || new Date().toISOString(), t.updated_at || new Date().toISOString()];
                const existing = (0, database_js_1.queryOne)('SELECT id FROM tasks WHERE id = ?', [t.id]);
                if (existing) {
                    (0, database_js_1.execute)(`UPDATE tasks SET ${cols.map(c => `${c}=?`).join(',')} WHERE id=?`, [...vals, t.id]);
                }
                else {
                    (0, database_js_1.execute)(`INSERT INTO tasks (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, vals);
                }
            }
            catch (e) {
                console.error('saveAll task failed:', t.id, e.message);
            }
        }
        console.log('saveAll tasks done:', data.length);
    });
}
