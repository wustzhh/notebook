import type { Project, ProjectCreateData, ProjectUpdateData } from '@/types/project'
import { projectAPI } from '@/utils/api-bridge'

export const projectService = {
  // 获取所有项目
  async getAll(): Promise<Project[]> {
    return await projectAPI.getAll()
  },

  // 获取单个项目
  async getById(id: number): Promise<Project> {
    return await projectAPI.getById(id)
  },

  // 创建项目
  async create(data: ProjectCreateData): Promise<Project> {
    return await projectAPI.create(data)
  },

  // 更新项目
  async update(id: number, data: ProjectUpdateData): Promise<Project> {
    return await projectAPI.update(id, data)
  },

  // 删除项目
  async delete(id: number): Promise<void> {
    return await projectAPI.delete(id)
  }
}
