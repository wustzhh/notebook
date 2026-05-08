"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProjectHandlers = registerProjectHandlers;
const electron_1 = require("electron");
const database_js_1 = require("../database.js");
function registerProjectHandlers(mainWindow) {
    // 获取所有项目
    electron_1.ipcMain.handle('projects:get-all', async () => {
        try {
            await (0, database_js_1.initDatabase)();
            const projects = (0, database_js_1.queryAll)('SELECT * FROM projects ORDER BY created_at');
            return projects;
        }
        catch (error) {
            console.error('Error fetching projects:', error);
            throw error;
        }
    });
    // 获取单个项目
    electron_1.ipcMain.handle('projects:get-by-id', async (_event, id) => {
        try {
            await (0, database_js_1.initDatabase)();
            const project = (0, database_js_1.queryOne)('SELECT * FROM projects WHERE id = ?', [id]);
            return project;
        }
        catch (error) {
            console.error('Error fetching project:', error);
            throw error;
        }
    });
    // 创建项目
    electron_1.ipcMain.handle('projects:create', async (_event, projectData) => {
        try {
            await (0, database_js_1.initDatabase)();
            let id;
            if (projectData._remoteId) {
                id = projectData._remoteId;
                (0, database_js_1.execute)('INSERT INTO projects (id, name, key, color, description) VALUES (?, ?, ?, ?, ?)', [projectData._remoteId, projectData.name, projectData.key, projectData.color || '#4A90D9', projectData.description || '']);
            }
            else if (projectData._clientId) {
                id = projectData._clientId;
                (0, database_js_1.execute)('INSERT INTO projects (id, name, key, color, description) VALUES (?, ?, ?, ?, ?)', [id, projectData.name, projectData.key, projectData.color || '#4A90D9', projectData.description || '']);
            }
            else {
                id = (0, database_js_1.generateId)();
                (0, database_js_1.execute)('INSERT INTO projects (id, name, key, color, description) VALUES (?, ?, ?, ?, ?)', [id, projectData.name, projectData.key, projectData.color || '#4A90D9', projectData.description || '']);
            }
            const newProject = (0, database_js_1.queryOne)('SELECT * FROM projects WHERE id = ?', [id]);
            // 检查返回值是否有效
            if (!newProject) {
                throw new Error('创建项目后查询失败');
            }
            // 通知渲染进程
            mainWindow.webContents.send('project-created', newProject);
            return newProject;
        }
        catch (error) {
            console.error('Error creating project:', error);
            throw error;
        }
    });
    // 更新项目
    electron_1.ipcMain.handle('projects:update', async (_event, id, data) => {
        try {
            await (0, database_js_1.initDatabase)();
            const fields = [];
            const values = [];
            if (data.name !== undefined) {
                fields.push('name = ?');
                values.push(data.name);
            }
            if (data.color !== undefined) {
                fields.push('color = ?');
                values.push(data.color);
            }
            if (data.description !== undefined) {
                fields.push('description = ?');
                values.push(data.description);
            }
            if (data.status !== undefined) {
                fields.push('status = ?');
                values.push(data.status);
            }
            fields.push('sync_version = 0');
            fields.push('updated_at = ?');
            values.push(new Date().toISOString());
            values.push(id);
            (0, database_js_1.execute)(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, values);
            const updatedProject = (0, database_js_1.queryOne)('SELECT * FROM projects WHERE id = ?', [id]);
            // 检查返回值是否有效
            if (!updatedProject) {
                throw new Error('更新项目后查询失败');
            }
            // 通知渲染进程
            mainWindow.webContents.send('project-updated', updatedProject);
            return updatedProject;
        }
        catch (error) {
            console.error('Error updating project:', error);
            throw error;
        }
    });
    // 删除项目
    electron_1.ipcMain.handle('projects:delete', async (_event, id) => {
        try {
            await (0, database_js_1.initDatabase)();
            (0, database_js_1.execute)('DELETE FROM task_logs WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)', [id]);
            (0, database_js_1.execute)('DELETE FROM task_tags WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)', [id]);
            (0, database_js_1.execute)('DELETE FROM tasks WHERE project_id = ?', [id]);
            (0, database_js_1.execute)('DELETE FROM tags WHERE project_id = ?', [id]);
            (0, database_js_1.execute)('DELETE FROM projects WHERE id = ?', [id]);
            // 通知渲染进程
            mainWindow.webContents.send('project-deleted', id);
        }
        catch (error) {
            console.error('Error deleting project:', error);
            throw error;
        }
    });
    // 批量保存（同步下载的数据直接写入本地 DB）
    electron_1.ipcMain.handle('projects:save-all', async (_event, data) => {
        await (0, database_js_1.initDatabase)();
        for (const p of data) {
            const cols = ['id', 'name', 'key', 'color', 'description', 'status', 'sync_version', 'created_at', 'updated_at'];
            const vals = [p.id, p.name, p.key, p.color || '#4A90D9', p.description || '', p.status || 'active', p.sync_version || 0, p.created_at || new Date().toISOString(), p.updated_at || new Date().toISOString()];
            const existing = (0, database_js_1.queryOne)('SELECT id FROM projects WHERE id = ?', [p.id]);
            if (existing) {
                (0, database_js_1.execute)(`UPDATE projects SET ${cols.map(c => `${c}=?`).join(',')} WHERE id=?`, [...vals, p.id]);
            }
            else {
                (0, database_js_1.execute)(`INSERT INTO projects (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, vals);
            }
        }
        console.log('saveAll projects done:', data.length, 'items');
    });
    electron_1.ipcMain.handle('projects:clear-all', async () => {
        await (0, database_js_1.initDatabase)();
        (0, database_js_1.execute)('DELETE FROM task_logs');
        (0, database_js_1.execute)('DELETE FROM task_tags');
        (0, database_js_1.execute)('DELETE FROM tasks');
        (0, database_js_1.execute)('DELETE FROM tags');
        (0, database_js_1.execute)('DELETE FROM projects');
    });
}
