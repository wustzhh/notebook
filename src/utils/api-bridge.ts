/**
 * API 桥接层
 * 在浏览器环境下使用 localStorage 模拟 Electron IPC 调用
 * 在 Electron 环境下使用真实的 IPC
 */

const STORAGE_KEY = 'task-tracker-mock-data'

interface StoredData {
  tasks: any[]
  projects: any[]
  nextTaskId: number
  nextProjectId: number
}

// 从 localStorage 加载数据，如果没有则使用默认数据
function loadFromStorage(): StoredData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch (e) {
    console.warn('Failed to load from localStorage, using defaults:', e)
  }

  // 默认数据
  return {
    tasks: [],
    projects: [],
    nextTaskId: 1,
    nextProjectId: 1
  }
}

// 保存到 localStorage
function saveToStorage(data: StoredData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to save to localStorage:', e)
  }
}

// 加载初始数据
let store = loadFromStorage()

// 内存中的可变数据
let mockTasks: any[] = store.tasks
let mockProjects: any[] = store.projects
let nextTaskId = store.nextTaskId
let nextProjectId = store.nextProjectId

// 模拟延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 任务 API 模拟
const mockTaskAPI = {
  async getAll() {
    await delay(100)
    return [...mockTasks]
  },

  async getById(id: number) {
    await delay(100)
    return mockTasks.find(t => t.id === id) || null
  },

  async create(data: any) {
    await delay(200)
    const newTask = {
      id: nextTaskId++,
      ...data,
      project_name: data.project_id === 1 ? 'Default Project' : mockProjects.find(p => p.id === data.project_id)?.name || 'Unknown',
      project_key: data.project_id === 1 ? 'DEF' : mockProjects.find(p => p.id === data.project_id)?.key || 'UNK',
      position: mockTasks.filter(t => t.status === (data.status || 'todo')).length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    mockTasks.push(newTask)
    store = { tasks: mockTasks, projects: mockProjects, nextTaskId, nextProjectId }
    saveToStorage(store)
    return newTask
  },

  async update(id: number, data: any) {
    await delay(200)
    const index = mockTasks.findIndex(t => t.id === id)
    if (index !== -1) {
      mockTasks[index] = {
        ...mockTasks[index],
        ...data,
        updated_at: new Date().toISOString()
      }
      store = { tasks: mockTasks, projects: mockProjects, nextTaskId, nextProjectId }
      saveToStorage(store)
      return mockTasks[index]
    }
    return null
  },

  async delete(id: number) {
    await delay(200)
    mockTasks = mockTasks.filter(t => t.id !== id)
    store = { tasks: mockTasks, projects: mockProjects, nextTaskId, nextProjectId }
    saveToStorage(store)
  },

  async reorder(updates: Array<{ id: number; status: string; position: number }>) {
    await delay(300)
    for (const update of updates) {
      const task = mockTasks.find(t => t.id === update.id)
      if (task) {
        task.status = update.status
        task.position = update.position
        task.updated_at = new Date().toISOString()
      }
    }
    store = { tasks: mockTasks, projects: mockProjects, nextTaskId, nextProjectId }
    saveToStorage(store)
  }
}

// 项目 API 模拟
const mockProjectAPI = {
  async getAll() {
    await delay(100)
    return [...mockProjects]
  },

  async getById(id: number) {
    await delay(100)
    return mockProjects.find(p => p.id === id) || null
  },

  async create(data: any) {
    await delay(200)
    const newProject = {
      id: nextProjectId++,
      ...data,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    mockProjects.push(newProject)
    store = { tasks: mockTasks, projects: mockProjects, nextTaskId, nextProjectId }
    saveToStorage(store)
    return newProject
  },

  async update(id: number, data: any) {
    await delay(200)
    const index = mockProjects.findIndex(p => p.id === id)
    if (index !== -1) {
      mockProjects[index] = {
        ...mockProjects[index],
        ...data,
        updated_at: new Date().toISOString()
      }
      store = { tasks: mockTasks, projects: mockProjects, nextTaskId, nextProjectId }
      saveToStorage(store)
      return mockProjects[index]
    }
    return null
  },

  async delete(id: number) {
    await delay(200)
    mockProjects = mockProjects.filter(p => p.id !== id)
    store = { tasks: mockTasks, projects: mockProjects, nextTaskId, nextProjectId }
    saveToStorage(store)
  }
}

// 判断是否在 Electron 环境中（通过检测 window.taskAPI 是否存在）
const isElectron = typeof window !== 'undefined' &&
  (window as any).taskAPI !== undefined

// 导出 API - 浏览器环境用 mock（带 localStorage），Electron 环境用真实 IPC
export const taskAPI = isElectron
  ? (window as any).taskAPI
  : mockTaskAPI

export const projectAPI = isElectron
  ? (window as any).projectAPI
  : mockProjectAPI
