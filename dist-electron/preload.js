import { contextBridge, ipcRenderer } from 'electron';
// 安全的 API 暴露
const taskAPI = {
    getAll: () => ipcRenderer.invoke('tasks:get-all'),
    getById: (id) => ipcRenderer.invoke('tasks:get-by-id', id),
    create: (task) => ipcRenderer.invoke('tasks:create', task),
    update: (id, data) => ipcRenderer.invoke('tasks:update', id, data),
    delete: (id) => ipcRenderer.invoke('tasks:delete', id),
    reorder: (updates) => ipcRenderer.invoke('tasks:reorder', updates)
};
const projectAPI = {
    getAll: () => ipcRenderer.invoke('projects:get-all'),
    getById: (id) => ipcRenderer.invoke('projects:get-by-id', id),
    create: (project) => ipcRenderer.invoke('projects:create', project),
    update: (id, data) => ipcRenderer.invoke('projects:update', id, data),
    delete: (id) => ipcRenderer.invoke('projects:delete', id)
};
// 暴露到 window 对象
contextBridge.exposeInMainWorld('taskAPI', taskAPI);
contextBridge.exposeInMainWorld('projectAPI', projectAPI);
