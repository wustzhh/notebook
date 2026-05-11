import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Tag } from '@/types/tag'
import { useProjectStore } from './projectStore'
import { useAuthStore } from './authStore'
import { getNextLocalId, registerRemoteId } from '@/utils/idManager'

export const useTagStore = defineStore('tags', () => {
  const tags = ref<Tag[]>([])
  const taskTags = ref<Record<number, Tag[]>>({})

  async function loadProjectTags(projectId: number) {
    try {
      const result = await window.tagAPI.getByProject(projectId)
      // 合并：更新已有、添加新的，不删其他项目的标签
      for (const t of result) {
        const idx = tags.value.findIndex(tt => tt.id === t.id)
        if (idx >= 0) {
          tags.value[idx] = t
        } else {
          tags.value.push(t)
        }
      }
    } catch {
      // fallback
    }
  }

  async function loadTaskTags(taskId: number) {
    try {
      const result = await window.tagAPI.getForTask(taskId)
      if (result && result.length > 0) {
        taskTags.value[taskId] = result
      }
    } catch { /* keep existing */ }
  }

  async function createTag(name: string, color: string): Promise<Tag | null> {
    try {
      const projectId = useProjectStore().currentProjectId
      const data: any = { name, color, project_id: projectId }

      const auth = useAuthStore()
      let online = false
      if (auth.serverUrl && auth.token) {
        try {
          const result = await window.syncAPI.genId(auth.serverUrl, auth.token, 'tags', 1)
          data._clientId = result.ids[0]
          registerRemoteId('tags', result.ids[0])
          online = true
        } catch {
          // genId 失败仅回退到本地 ID，不踢出登录
        }
      }
      if (!data._clientId) {
        data._clientId = getNextLocalId('tags')
      }

      const tag = await window.tagAPI.create(data)
      tags.value.push(tag)

      if (online) {
        try {
          const { useSyncStore } = await import('./syncStore')
          await useSyncStore().manualSync()
        } catch (e: any) { console.warn('immediate sync failed:', e.message) }
      }

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
      const result = await window.tagAPI.getForTask(taskId)
      if (result && result.length > 0) {
        taskTags.value[taskId] = result
      } else {
        taskTags.value[taskId] = tags.value.filter(t => tagIds.includes(t.id))
      }
    } catch {
      taskTags.value[taskId] = tags.value.filter(t => tagIds.includes(t.id))
    }
  }

  function getTaskTags(taskId: number): Tag[] {
    return taskTags.value[taskId] || []
  }

  return { tags, taskTags, loadProjectTags, loadTaskTags, createTag, deleteTag, setTaskTags, getTaskTags }
})
