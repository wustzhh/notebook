import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { projectService } from '@/services/projectService'
import type { Project, ProjectStatus, ProjectCreateData, ProjectUpdateData } from '@/types/project'
import { useTagStore } from './tagStore'

function markDirty() {
  try {
    const { useSyncStore } = require('./syncStore')
    useSyncStore().incrementDirty()
  } catch { /* store not available */ }
}

export const useProjectStore = defineStore('projects', () => {
  // State
  const projects = ref<Project[]>([])
  const currentProjectId = ref<number>(1)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const currentProject = computed(() =>
    projects.value.find(p => p.id === currentProjectId.value)
  )

  const activeProjects = computed(() =>
    projects.value.filter(p => p.status !== 'completed')
  )

  const completedProjects = computed(() =>
    projects.value.filter(p => p.status === 'completed')
  )

  // Actions
  async function loadProjects() {
    loading.value = true
    error.value = null
    try {
      projects.value = await projectService.getAll()
      if (projects.value.length > 0 && !currentProjectId.value) {
        currentProjectId.value = projects.value[0].id
      }
    } catch (e: any) {
      error.value = e.message
      console.error('Failed to load projects:', e)
    } finally {
      loading.value = false
    }
  }

  async function createProject(data: ProjectCreateData) {
    try {
      const newProject = await projectService.create(data)
      // 检查返回值是否有效
      if (!newProject) {
        throw new Error('创建项目失败：返回空值')
      }
      // 使用数组替换而非 push，确保触发响应式更新
      projects.value = [...projects.value, newProject]
      markDirty()
      return newProject
    } catch (e: any) {
      error.value = e.message
      console.error('Failed to create project:', e)
      throw e
    }
  }

  async function updateProject(id: number, data: ProjectUpdateData) {
    try {
      const updatedProject = await projectService.update(id, data)
      // 使用数组替换，确保触发响应式更新
      projects.value = projects.value.map(p => p.id === id ? updatedProject : p)
      markDirty()
      return updatedProject
    } catch (e: any) {
      error.value = e.message
      console.error('Failed to update project:', e)
      throw e
    }
  }

  async function deleteProject(id: number) {
    try {
      await projectService.delete(id)
      projects.value = projects.value.filter(p => p.id !== id)
      if (currentProjectId.value === id) {
        currentProjectId.value = projects.value[0]?.id || 0
      }
      markDirty()
    } catch (e: any) {
      error.value = e.message
      console.error('Failed to delete project:', e)
      throw e
    }
  }

  async function saveRemoteProject(data: any) {
    try {
      const existing = projects.value.find(p => p.id === data.id)
      if (existing) {
        await updateProject(data.id, data)
      } else {
        // 用服务端 ID 直接插入
        const result = await projectService.create({ ...data, _remoteId: data.id })
        if (result) projects.value = [...projects.value, result]
      }
    } catch { /* ignore */ }
  }

  function setCurrentProject(projectId: number) {
    currentProjectId.value = projectId
    useTagStore().loadProjectTags(projectId)
  }

  async function toggleProjectStatus(id: number) {
    const project = projects.value.find(p => p.id === id)
    if (!project) return
    const newStatus: ProjectStatus = project.status === 'completed' ? 'active' : 'completed'
    await updateProject(id, { status: newStatus })
  }

  function clearError() {
    error.value = null
  }

  return {
    projects,
    currentProjectId,
    currentProject,
    activeProjects,
    completedProjects,
    loading,
    error,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    toggleProjectStatus,
    saveRemoteProject,
    clearError
  }
})
