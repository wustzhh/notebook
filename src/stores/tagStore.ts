import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Tag } from '@/types/tag'
import { useProjectStore } from './projectStore'

export const useTagStore = defineStore('tags', () => {
  const tags = ref<Tag[]>([])
  const taskTags = ref<Record<number, Tag[]>>({})

  async function loadProjectTags(projectId: number) {
    try {
      tags.value = await window.tagAPI.getByProject(projectId)
    } catch {
      // electron not available
      tags.value = []
    }
  }

  async function loadTaskTags(taskId: number) {
    try {
      const result = await window.tagAPI.getForTask(taskId)
      taskTags.value[taskId] = result
    } catch {
      taskTags.value[taskId] = []
    }
  }

  async function createTag(name: string, color: string): Promise<Tag | null> {
    try {
      const projectId = useProjectStore().currentProjectId
      const tag = await window.tagAPI.create({ name, color, project_id: projectId })
      tags.value.push(tag)
      return tag
    } catch {
      return null
    }
  }

  async function deleteTag(id: number) {
    try {
      await window.tagAPI.delete(id)
      tags.value = tags.value.filter(t => t.id !== id)
    } catch { /* ignore */ }
  }

  async function setTaskTags(taskId: number, tagIds: number[]) {
    try {
      await window.tagAPI.setTaskTags(taskId, tagIds)
      // 重新从 DB 加载确保准确
      taskTags.value[taskId] = await window.tagAPI.getForTask(taskId)
    } catch { /* ignore */ }
  }

  function getTaskTags(taskId: number): Tag[] {
    return taskTags.value[taskId] || []
  }

  return { tags, taskTags, loadProjectTags, loadTaskTags, createTag, deleteTag, setTaskTags, getTaskTags }
})
