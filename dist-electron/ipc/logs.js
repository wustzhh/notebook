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
            (0, database_js_1.execute)('INSERT INTO task_logs (task_id, type, content, old_value, new_value, field) VALUES (?, ?, ?, ?, ?, ?)', [data.task_id, data.type, data.content, data.old_value || null, data.new_value || null, data.field || null]);
        }
        catch (error) {
            console.error('Error creating log:', error);
            throw error;
        }
    });
}
