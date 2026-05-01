import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TaskLog } from '@/types/task'

export const useLogStore = defineStore('logs', () => {
  const logs = ref<Record<number, TaskLog[]>>({})

  async function loadTaskLogs(taskId: number) {
    try {
      logs.value[taskId] = await window.logAPI.getByTask(taskId)
    } catch {
      logs.value[taskId] = []
    }
  }

  async function loadCommentCounts(taskIds: number[]) {
    // 只加载还未缓存的
    const uncached = taskIds.filter(id => !logs.value[id])
    if (uncached.length === 0) return
    for (const id of uncached) {
      try {
        logs.value[id] = await window.logAPI.getByTask(id)
      } catch {
        logs.value[id] = []
      }
    }
  }

  async function appendLog(taskId: number, data: any) {
    try {
      await window.logAPI.create(data)
      const entry: TaskLog = {
        id: Date.now(),
        task_id: taskId,
        type: data.type,
        content: data.content,
        old_value: data.old_value || null,
        new_value: data.new_value || null,
        field: data.field || null,
        created_at: new Date().toISOString()
      }
      if (!logs.value[taskId]) logs.value[taskId] = []
      logs.value[taskId].unshift(entry)
    } catch { /* ignore */ }
  }

  function getTaskLogs(taskId: number): TaskLog[] {
    return logs.value[taskId] || []
  }

  function commentCount(taskId: number): number {
    return (logs.value[taskId] || []).filter(l => l.type === 'comment').length
  }

  return { logs, loadTaskLogs, loadCommentCounts, appendLog, getTaskLogs, commentCount }
})
