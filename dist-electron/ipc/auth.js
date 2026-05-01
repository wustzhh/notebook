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
function registerAuthHandlers() {
    electron_1.ipcMain.handle('auth:save-token', async (_event, token) => {
        try {
            if (electron_1.safeStorage.isEncryptionAvailable()) {
                const encrypted = electron_1.safeStorage.encryptString(token);
                fs_1.default.writeFileSync(TOKEN_PATH, encrypted);
            }
            else {
                fs_1.default.writeFileSync(TOKEN_PATH, token, 'utf-8');
            }
        }
        catch (e) {
            console.error('Save token error:', e);
            throw e;
        }
    });
    electron_1.ipcMain.handle('auth:get-token', async () => {
        try {
            if (!fs_1.default.existsSync(TOKEN_PATH))
                return null;
            const data = fs_1.default.readFileSync(TOKEN_PATH);
            if (electron_1.safeStorage.isEncryptionAvailable()) {
                return electron_1.safeStorage.decryptString(data);
            }
            return data.toString('utf-8');
        }
        catch (e) {
            console.error('Get token error:', e);
            return null;
        }
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
        try {
            const data = JSON.stringify({ email, password });
            if (electron_1.safeStorage.isEncryptionAvailable()) {
                const encrypted = electron_1.safeStorage.encryptString(data);
                fs_1.default.writeFileSync(CRED_PATH, encrypted);
            }
            else {
                fs_1.default.writeFileSync(CRED_PATH, data, 'utf-8');
            }
        }
        catch (e) {
            console.error('Save credentials error:', e);
            throw e;
        }
    });
    electron_1.ipcMain.handle('auth:get-credentials', async () => {
        try {
            if (!fs_1.default.existsSync(CRED_PATH))
                return null;
            const data = fs_1.default.readFileSync(CRED_PATH);
            let raw;
            if (electron_1.safeStorage.isEncryptionAvailable()) {
                raw = electron_1.safeStorage.decryptString(data);
            }
            else {
                raw = data.toString('utf-8');
            }
            return JSON.parse(raw);
        }
        catch (e) {
            console.error('Get credentials error:', e);
            return null;
        }
    });
}
