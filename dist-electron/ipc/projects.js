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
            const id = (0, database_js_1.execute)('INSERT INTO projects (name, key, color, description) VALUES (?, ?, ?, ?)', [
                projectData.name,
                projectData.key,
                projectData.color || '#4A90D9',
                projectData.description || ''
            ]);
            const newProject = (0, database_js_1.queryOne)('SELECT * FROM projects WHERE id = ?', [id]);
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
            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(id);
            (0, database_js_1.execute)(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, values);
            const updatedProject = (0, database_js_1.queryOne)('SELECT * FROM projects WHERE id = ?', [id]);
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
            (0, database_js_1.execute)('DELETE FROM projects WHERE id = ?', [id]);
            // 通知渲染进程
            mainWindow.webContents.send('project-deleted', id);
        }
        catch (error) {
            console.error('Error deleting project:', error);
            throw error;
        }
    });
}
