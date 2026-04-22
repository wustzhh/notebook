"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// 安全的 API 暴露
const taskAPI = {
    getAll: () => electron_1.ipcRenderer.invoke('tasks:get-all'),
    getById: (id) => electron_1.ipcRenderer.invoke('tasks:get-by-id', id),
    create: (task) => electron_1.ipcRenderer.invoke('tasks:create', task),
    update: (id, data) => electron_1.ipcRenderer.invoke('tasks:update', id, data),
    delete: (id) => electron_1.ipcRenderer.invoke('tasks:delete', id),
    reorder: (updates) => electron_1.ipcRenderer.invoke('tasks:reorder', updates)
};
const projectAPI = {
    getAll: () => electron_1.ipcRenderer.invoke('projects:get-all'),
    getById: (id) => electron_1.ipcRenderer.invoke('projects:get-by-id', id),
    create: (project) => electron_1.ipcRenderer.invoke('projects:create', project),
    update: (id, data) => electron_1.ipcRenderer.invoke('projects:update', id, data),
    delete: (id) => electron_1.ipcRenderer.invoke('projects:delete', id)
};
// 暴露到 window 对象
electron_1.contextBridge.exposeInMainWorld('taskAPI', taskAPI);
electron_1.contextBridge.exposeInMainWorld('projectAPI', projectAPI);
