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
    authAPI: AuthAPI
    syncAPI: SyncAPI
  }
}

interface AuthAPI {
  saveToken: (token: string) => Promise<void>
  getToken: () => Promise<string | null>
  clearToken: () => Promise<void>
  saveCredentials: (email: string, password: string) => Promise<void>
  getCredentials: () => Promise<{ email: string; password: string } | null>
}

interface SyncAPI {
  configure: (serverUrl: string, token: string) => Promise<void>
  push: (serverUrl: string, token: string, data: any) => Promise<any>
  pull: (serverUrl: string, token: string, since: string) => Promise<any>
  full: (serverUrl: string, token: string) => Promise<any>
  health: (serverUrl: string) => Promise<boolean>
  getLastTime: () => Promise<string>
}

const authAPI: AuthAPI = {
  saveToken: (token: string) => ipcRenderer.invoke('auth:save-token', token),
  getToken: () => ipcRenderer.invoke('auth:get-token'),
  clearToken: () => ipcRenderer.invoke('auth:clear-token'),
  saveCredentials: (email: string, password: string) => ipcRenderer.invoke('auth:save-credentials', email, password),
  getCredentials: () => ipcRenderer.invoke('auth:get-credentials')
}

const syncAPI: SyncAPI = {
  configure: (serverUrl: string, token: string) => ipcRenderer.invoke('sync:configure', serverUrl, token),
  push: (serverUrl: string, token: string, data: any) => ipcRenderer.invoke('sync:push', serverUrl, token, data),
  pull: (serverUrl: string, token: string, since: string) => ipcRenderer.invoke('sync:pull', serverUrl, token, since),
  full: (serverUrl: string, token: string) => ipcRenderer.invoke('sync:full', serverUrl, token),
  health: (serverUrl: string) => ipcRenderer.invoke('sync:health', serverUrl),
  getLastTime: () => ipcRenderer.invoke('sync:get-last-time')
}

contextBridge.exposeInMainWorld('authAPI', authAPI)
contextBridge.exposeInMainWorld('syncAPI', syncAPI)
