"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSyncHandlers = registerSyncHandlers;
const electron_1 = require("electron");
function registerSyncHandlers() {
    let baseUrl = '';
    let authToken = '';
    electron_1.ipcMain.handle('sync:configure', async (_event, serverUrl, token) => {
        baseUrl = serverUrl;
        authToken = token;
    });
    electron_1.ipcMain.handle('sync:push', async (_event, serverUrl, token, data) => {
        const url = serverUrl || baseUrl;
        const t = token || authToken;
        if (!url || !t)
            throw new Error('未配置同步服务器');
        const response = await fetch(`${url}/sync/push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${t}`
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            if (response.status === 401)
                throw new Error('TOKEN_EXPIRED');
            throw new Error(err.error || '同步失败');
        }
        return await response.json();
    });
    electron_1.ipcMain.handle('sync:pull', async (_event, serverUrl, token, since) => {
        const url = serverUrl || baseUrl;
        const t = token || authToken;
        if (!url || !t)
            throw new Error('未配置同步服务器');
        const response = await fetch(`${url}/sync/pull?since=${encodeURIComponent(since)}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${t}` }
        });
        if (!response.ok) {
            if (response.status === 401)
                throw new Error('TOKEN_EXPIRED');
            throw new Error('同步失败');
        }
        return await response.json();
    });
    electron_1.ipcMain.handle('sync:full', async (_event, serverUrl, token) => {
        const url = serverUrl || baseUrl;
        const t = token || authToken;
        if (!url || !t)
            throw new Error('未配置同步服务器');
        const response = await fetch(`${url}/sync/full`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${t}` }
        });
        if (!response.ok)
            throw new Error('获取全量数据失败');
        return await response.json();
    });
    electron_1.ipcMain.handle('sync:health', async (_event, serverUrl) => {
        try {
            const response = await fetch(`${serverUrl}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            return response.ok;
        }
        catch {
            return false;
        }
    });
    electron_1.ipcMain.handle('sync:get-last-time', async () => {
        return '';
    });
}
