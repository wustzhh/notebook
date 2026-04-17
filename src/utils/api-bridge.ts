/**
 * API 桥接层
 * 在浏览器环境下模拟 Electron IPC 调用
 * 在 Electron 环境下使用真实的 IPC
 */

// 内存存储（用于浏览器环境）
let mockTasks: any[] = [
  { id: 1, title: '完成项目需求文档', description: '编写详细的项目需求文档', project_id: 1, project_name: 'Default Project', project_key: 'DEF', status: 'done', priority: 'high', start_date: null, end_date: null, position: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 2, title: '设计数据库架构', description: '设计任务管理系统的数据库架构', project_id: 1, project_name: 'Default Project', project_key: 'DEF', status: 'in_progress', priority: 'high', start_date: null, end_date: null, position: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 3, title: '实现用户认证', description: '实现用户登录和注册功能', project_id: 1, project_name: 'Default Project', project_key: 'DEF', status: 'todo', priority: 'medium', start_date: null, end_date: null, position: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 4, title: '前端页面开发', description: '使用 Vue3 和 Element Plus 开发前端页面', project_id: 1, project_name: 'Default Project', project_key: 'DEF', status: 'todo', priority: 'medium', start_date: null, end_date: null, position: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 5, title: '测试和部署', description: '进行单元测试并部署应用', project_id: 1, project_name: 'Default Project', project_key: 'DEF', status: 'todo', priority: 'low', start_date: null, end_date: null, position: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
]

let mockProjects: any[] = [
  { id: 1, name: 'Default Project', key: 'DEF', color: '#4A90D9', description: '默认项目', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
]

let nextTaskId = 6
let nextProjectId = 2

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
      project_name: 'Default Project',
      project_key: 'DEF',
      position: mockTasks.filter(t => t.status === (data.status || 'todo')).length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    mockTasks.push(newTask)
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
      return mockTasks[index]
    }
    return null
  },

  async delete(id: number) {
    await delay(200)
    mockTasks = mockTasks.filter(t => t.id !== id)
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    mockProjects.push(newProject)
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
      return mockProjects[index]
    }
    return null
  },

  async delete(id: number) {
    await delay(200)
    mockProjects = mockProjects.filter(p => p.id !== id)
  }
}

// 判断是否在 Electron 环境中（通过检测 window.taskAPI 是否存在）
const isElectron = typeof window !== 'undefined' && 
  (window as any).taskAPI !== undefined

// 导出 API - 浏览器环境用 mock，Electron 环境用真实 IPC
export const taskAPI = isElectron 
  ? (window as any).taskAPI 
  : mockTaskAPI

export const projectAPI = isElectron 
  ? (window as any).projectAPI 
  : mockProjectAPI
