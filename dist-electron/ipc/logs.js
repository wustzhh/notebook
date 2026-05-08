"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLogHandlers = registerLogHandlers;
const electron_1 = require("electron");
const database_js_1 = require("../database.js");
function registerLogHandlers() {
    electron_1.ipcMain.handle('logs:get-by-task', async (_event, taskId) => {
        try {
            await (0, database_js_1.initDatabase)();
            return (0, database_js_1.queryAll)('SELECT * FROM task_logs WHERE task_id = ? ORDER BY created_at DESC', [taskId]);
        }
        catch (error) {
            console.error('Error fetching logs:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('logs:create', async (_event, data) => {
        try {
            await (0, database_js_1.initDatabase)();
            let id;
            if (data._remoteId) {
                id = data._remoteId;
            }
            else if (data._clientId) {
                id = data._clientId;
            }
            else if (data.id) {
                id = data.id;
            }
            else {
                id = (0, database_js_1.generateId)();
            }
            (0, database_js_1.execute)('INSERT INTO task_logs (id, task_id, type, content, old_value, new_value, field, images, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, data.task_id, data.type, data.content, data.old_value || null, data.new_value || null, data.field || null, data.images || '[]', data.created_at || new Date().toISOString()]);
            return id;
        }
        catch (error) {
            console.error('Error creating log:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('logs:update', async (_event, id, content) => {
        try {
            await (0, database_js_1.initDatabase)();
            (0, database_js_1.execute)('UPDATE task_logs SET content = ? WHERE id = ?', [content, id]);
        }
        catch (error) {
            console.error('Error updating log:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('logs:delete', async (_event, id) => {
        try {
            await (0, database_js_1.initDatabase)();
            (0, database_js_1.execute)('DELETE FROM task_logs WHERE id = ?', [id]);
        }
        catch (error) {
            console.error('Error deleting log:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('logs:save-all', async (_event, data) => {
        await (0, database_js_1.initDatabase)();
        const cols = ['id', 'task_id', 'type', 'content', 'old_value', 'new_value', 'field', 'images', 'created_at'];
        for (const l of data) {
            if (l.type !== 'comment')
                continue;
            const vals = [l.id, l.task_id, l.type, l.content, l.old_value || null, l.new_value || null, l.field || null, l.images || '[]', l.created_at || new Date().toISOString()];
            const existing = (0, database_js_1.queryOne)('SELECT id FROM task_logs WHERE id = ?', [l.id]);
            if (!existing) {
                try {
                    (0, database_js_1.execute)(`INSERT INTO task_logs (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, vals);
                }
                catch (e) {
                    console.error('saveAll log failed:', l.id, e.message);
                }
            }
        }
    });
}
