import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { projectService } from '@/services/projectService'
import type { Project, ProjectCreateData, ProjectUpdateData } from '@/types/project'

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
      projects.value.push(newProject)
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
      const index = projects.value.findIndex(p => p.id === id)
      if (index !== -1) {
        projects.value[index] = updatedProject
      }
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
    } catch (e: any) {
      error.value = e.message
      console.error('Failed to delete project:', e)
      throw e
    }
  }

  function setCurrentProject(projectId: number) {
    currentProjectId.value = projectId
  }

  function clearError() {
    error.value = null
  }

  return {
    projects,
    currentProjectId,
    currentProject,
    loading,
    error,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    clearError
  }
})
