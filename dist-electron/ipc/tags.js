"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTagHandlers = registerTagHandlers;
const electron_1 = require("electron");
const database_js_1 = require("../database.js");
function registerTagHandlers(mainWindow) {
    electron_1.ipcMain.handle('tags:get-by-project', async (_event, projectId) => {
        try {
            await (0, database_js_1.initDatabase)();
            return (0, database_js_1.queryAll)('SELECT * FROM tags WHERE project_id = ? ORDER BY id', [projectId]);
        }
        catch (error) {
            console.error('Error fetching tags:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('tags:get-for-task', async (_event, taskId) => {
        try {
            await (0, database_js_1.initDatabase)();
            return (0, database_js_1.queryAll)('SELECT t.* FROM tags t INNER JOIN task_tags tt ON t.id = tt.tag_id WHERE tt.task_id = ?', [taskId]);
        }
        catch (error) {
            console.error('Error fetching task tags:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('tags:create', async (_event, data) => {
        try {
            await (0, database_js_1.initDatabase)();
            // 检查同名标签是否已存在
            const existing = (0, database_js_1.queryOne)('SELECT * FROM tags WHERE name = ? AND project_id = ?', [data.name, data.project_id]);
            if (existing)
                return existing;
            const id = (0, database_js_1.execute)('INSERT INTO tags (name, color, project_id) VALUES (?, ?, ?)', [data.name, data.color || '#409EFF', data.project_id]);
            const tag = (0, database_js_1.queryOne)('SELECT * FROM tags WHERE id = ?', [id]);
            mainWindow.webContents.send('tag-created', tag);
            return tag;
        }
        catch (error) {
            console.error('Error creating tag:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('tags:delete', async (_event, id) => {
        try {
            await (0, database_js_1.initDatabase)();
            (0, database_js_1.execute)('DELETE FROM tags WHERE id = ?', [id]);
            mainWindow.webContents.send('tag-deleted', id);
        }
        catch (error) {
            console.error('Error deleting tag:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('tags:set-task-tags', async (_event, taskId, tagIds) => {
        try {
            await (0, database_js_1.initDatabase)();
            (0, database_js_1.execute)('DELETE FROM task_tags WHERE task_id = ?', [taskId]);
            for (const tagId of tagIds) {
                (0, database_js_1.execute)('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)', [taskId, tagId]);
            }
        }
        catch (error) {
            console.error('Error setting task tags:', error);
            throw error;
        }
    });
}
