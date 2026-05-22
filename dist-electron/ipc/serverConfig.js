"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerServerConfigHandlers = registerServerConfigHandlers;
exports.setConfig = setConfig;
exports.getServerConfig = getServerConfig;
const electron_1 = require("electron");
let serverUrl = '';
let authToken = '';
function registerServerConfigHandlers() {
    electron_1.ipcMain.handle('server-config:set', async (_event, url, token) => {
        serverUrl = url;
        authToken = token;
    });
}
function setConfig(url, token) {
    serverUrl = url;
    authToken = token;
}
function getServerConfig() {
    return { serverUrl, token: authToken };
}
