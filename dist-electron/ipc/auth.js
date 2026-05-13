"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAuthHandlers = registerAuthHandlers;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const electron_2 = require("electron");
const TOKEN_PATH = path_1.default.join(electron_2.app.getPath('userData'), '.auth_token');
const CRED_PATH = path_1.default.join(electron_2.app.getPath('userData'), '.auth_cred');
function safeWrite(filePath, data) {
    try {
        fs_1.default.writeFileSync(filePath, data, 'utf-8');
    }
    catch (e) {
        console.error('Write file error:', filePath, e);
        throw e;
    }
}
function safeRead(filePath) {
    try {
        if (!fs_1.default.existsSync(filePath))
            return null;
        return fs_1.default.readFileSync(filePath, 'utf-8');
    }
    catch (e) {
        console.error('Read file error:', filePath, e);
        return null;
    }
}
function registerAuthHandlers() {
    electron_1.ipcMain.handle('auth:save-token', async (_event, token) => {
        safeWrite(TOKEN_PATH, token);
    });
    electron_1.ipcMain.handle('auth:get-token', async () => {
        return safeRead(TOKEN_PATH);
    });
    electron_1.ipcMain.handle('auth:clear-token', async () => {
        try {
            if (fs_1.default.existsSync(TOKEN_PATH))
                fs_1.default.unlinkSync(TOKEN_PATH);
            if (fs_1.default.existsSync(CRED_PATH))
                fs_1.default.unlinkSync(CRED_PATH);
        }
        catch (e) {
            console.error('Clear token error:', e);
        }
    });
    electron_1.ipcMain.handle('auth:save-credentials', async (_event, email, password) => {
        safeWrite(CRED_PATH, JSON.stringify({ email, password }));
    });
    electron_1.ipcMain.handle('auth:get-credentials', async () => {
        const raw = safeRead(CRED_PATH);
        if (!raw)
            return null;
        try {
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    });
}
