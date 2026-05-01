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
const tagAPI = {
    getByProject: (projectId) => electron_1.ipcRenderer.invoke('tags:get-by-project', projectId),
    getForTask: (taskId) => electron_1.ipcRenderer.invoke('tags:get-for-task', taskId),
    create: (data) => electron_1.ipcRenderer.invoke('tags:create', data),
    delete: (id) => electron_1.ipcRenderer.invoke('tags:delete', id),
    setTaskTags: (taskId, tagIds) => electron_1.ipcRenderer.invoke('tags:set-task-tags', taskId, tagIds)
};
const logAPI = {
    getByTask: (taskId) => electron_1.ipcRenderer.invoke('logs:get-by-task', taskId),
    create: (data) => electron_1.ipcRenderer.invoke('logs:create', data)
};
electron_1.contextBridge.exposeInMainWorld('tagAPI', tagAPI);
electron_1.contextBridge.exposeInMainWorld('logAPI', logAPI);
const authAPI = {
    saveToken: (token) => electron_1.ipcRenderer.invoke('auth:save-token', token),
    getToken: () => electron_1.ipcRenderer.invoke('auth:get-token'),
    clearToken: () => electron_1.ipcRenderer.invoke('auth:clear-token'),
    saveCredentials: (email, password) => electron_1.ipcRenderer.invoke('auth:save-credentials', email, password),
    getCredentials: () => electron_1.ipcRenderer.invoke('auth:get-credentials')
};
const syncAPI = {
    configure: (serverUrl, token) => electron_1.ipcRenderer.invoke('sync:configure', serverUrl, token),
    push: (serverUrl, token, data) => electron_1.ipcRenderer.invoke('sync:push', serverUrl, token, data),
    pull: (serverUrl, token, since) => electron_1.ipcRenderer.invoke('sync:pull', serverUrl, token, since),
    full: (serverUrl, token) => electron_1.ipcRenderer.invoke('sync:full', serverUrl, token),
    health: (serverUrl) => electron_1.ipcRenderer.invoke('sync:health', serverUrl),
    getLastTime: () => electron_1.ipcRenderer.invoke('sync:get-last-time')
};
electron_1.contextBridge.exposeInMainWorld('authAPI', authAPI);
electron_1.contextBridge.exposeInMainWorld('syncAPI', syncAPI);
