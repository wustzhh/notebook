import { contextBridge, ipcRenderer } from 'electron'

// 定义 IPC 通道类型
interface TaskAPI {
  getAll: () => Promise<any[]>
  getById: (id: number) => Promise<any>
  create: (task: any) => Promise<any>
  update: (id: number, data: any) => Promise<any>
  delete: (id: number) => Promise<void>
  reorder: (updates: Array<{ id: number; status: string; position: number }>) => Promise<void>
}

interface ProjectAPI {
  getAll: () => Promise<any[]>
  getById: (id: number) => Promise<any>
  create: (project: any) => Promise<any>
  update: (id: number, data: any) => Promise<any>
  delete: (id: number) => Promise<void>
}

// 安全的 API 暴露
const taskAPI: TaskAPI = {
  getAll: () => ipcRenderer.invoke('tasks:get-all'),
  getById: (id: number) => ipcRenderer.invoke('tasks:get-by-id', id),
  create: (task: any) => ipcRenderer.invoke('tasks:create', task),
  update: (id: number, data: any) => ipcRenderer.invoke('tasks:update', id, data),
  delete: (id: number) => ipcRenderer.invoke('tasks:delete', id),
  reorder: (updates) => ipcRenderer.invoke('tasks:reorder', updates)
}

const projectAPI: ProjectAPI = {
  getAll: () => ipcRenderer.invoke('projects:get-all'),
  getById: (id: number) => ipcRenderer.invoke('projects:get-by-id', id),
  create: (project: any) => ipcRenderer.invoke('projects:create', project),
  update: (id: number, data: any) => ipcRenderer.invoke('projects:update', id, data),
  delete: (id: number) => ipcRenderer.invoke('projects:delete', id)
}

// 暴露到 window 对象
contextBridge.exposeInMainWorld('taskAPI', taskAPI)
contextBridge.exposeInMainWorld('projectAPI', projectAPI)

// TypeScript 类型声明
declare global {
  interface Window {
    taskAPI: TaskAPI
    projectAPI: ProjectAPI
  }
}
