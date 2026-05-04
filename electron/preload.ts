import { contextBridge, ipcRenderer } from 'electron'

// 定义 IPC 通道类型
interface TaskAPI {
  getAll: () => Promise<any[]>
  getById: (id: number) => Promise<any>
  create: (task: any) => Promise<any>
  update: (id: number, data: any) => Promise<any>
  delete: (id: number) => Promise<void>
  reorder: (updates: Array<{ id: number; status: string; position: number }>) => Promise<void>
  saveAll: (data: any[]) => Promise<void>
}

interface ProjectAPI {
  getAll: () => Promise<any[]>
  getById: (id: number) => Promise<any>
  create: (project: any) => Promise<any>
  update: (id: number, data: any) => Promise<any>
  delete: (id: number) => Promise<void>
  saveAll: (data: any[]) => Promise<void>
  clearAll: () => Promise<void>
}

// 安全的 API 暴露
const taskAPI: TaskAPI = {
  getAll: () => ipcRenderer.invoke('tasks:get-all'),
  getById: (id: number) => ipcRenderer.invoke('tasks:get-by-id', id),
  create: (task: any) => ipcRenderer.invoke('tasks:create', task),
  update: (id: number, data: any) => ipcRenderer.invoke('tasks:update', id, data),
  delete: (id: number) => ipcRenderer.invoke('tasks:delete', id),
  reorder: (updates) => ipcRenderer.invoke('tasks:reorder', updates),
  saveAll: (data: any[]) => ipcRenderer.invoke('tasks:save-all', data)
}

const projectAPI: ProjectAPI = {
  getAll: () => ipcRenderer.invoke('projects:get-all'),
  getById: (id: number) => ipcRenderer.invoke('projects:get-by-id', id),
  create: (project: any) => ipcRenderer.invoke('projects:create', project),
  update: (id: number, data: any) => ipcRenderer.invoke('projects:update', id, data),
  delete: (id: number) => ipcRenderer.invoke('projects:delete', id),
  saveAll: (data: any[]) => ipcRenderer.invoke('projects:save-all', data),
  clearAll: () => ipcRenderer.invoke('projects:clear-all')
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
    tagAPI: TagAPI
    logAPI: LogAPI
  }
}

interface TagAPI {
  getByProject: (projectId: number) => Promise<any[]>
  getForTask: (taskId: number) => Promise<any[]>
  create: (data: any) => Promise<any>
  delete: (id: number) => Promise<void>
  setTaskTags: (taskId: number, tagIds: number[]) => Promise<void>
  saveAll: (tags: any[], taskTags: any[]) => Promise<void>
}

interface LogAPI {
  getByTask: (taskId: number) => Promise<any[]>
  create: (data: any) => Promise<void>
  update: (id: number, content: string) => Promise<void>
  delete: (id: number) => Promise<void>
  saveAll: (data: any[]) => Promise<void>
}

const logAPI: LogAPI = {
  getByTask: (taskId: number) => ipcRenderer.invoke('logs:get-by-task', taskId),
  create: (data: any) => ipcRenderer.invoke('logs:create', data),
  update: (id: number, content: string) => ipcRenderer.invoke('logs:update', id, content),
  delete: (id: number) => ipcRenderer.invoke('logs:delete', id),
  saveAll: (data: any[]) => ipcRenderer.invoke('logs:save-all', data)
}

const tagAPI: TagAPI = {
  getByProject: (projectId: number) => ipcRenderer.invoke('tags:get-by-project', projectId),
  getForTask: (taskId: number) => ipcRenderer.invoke('tags:get-for-task', taskId),
  create: (data: any) => ipcRenderer.invoke('tags:create', data),
  delete: (id: number) => ipcRenderer.invoke('tags:delete', id),
  setTaskTags: (taskId: number, tagIds: number[]) => ipcRenderer.invoke('tags:set-task-tags', taskId, tagIds),
  saveAll: (tags: any[], taskTags: any[]) => ipcRenderer.invoke('tags:save-all', tags, taskTags)
}

contextBridge.exposeInMainWorld('tagAPI', tagAPI)
contextBridge.exposeInMainWorld('logAPI', logAPI)

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
