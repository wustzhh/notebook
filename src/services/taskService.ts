import type { Task, TaskCreateData, TaskUpdateData } from '@/types/task'
import { taskAPI } from '@/utils/api-bridge'

export const taskService = {
  // 获取所有任务
  async getAll(): Promise<Task[]> {
    return await taskAPI.getAll()
  },

  // 获取单个任务
  async getById(id: number): Promise<Task> {
    return await taskAPI.getById(id)
  },

  // 创建任务
  async create(data: TaskCreateData): Promise<Task> {
    return await taskAPI.create(data)
  },

  // 更新任务
  async update(id: number, data: TaskUpdateData): Promise<Task> {
    return await taskAPI.update(id, data)
  },

  // 删除任务
  async delete(id: number): Promise<void> {
    return await taskAPI.delete(id)
  },

  // 重新排序任务
  async reorder(updates: Array<{ id: number; status: string; position: number }>): Promise<void> {
    return await taskAPI.reorder(updates)
  }
}
