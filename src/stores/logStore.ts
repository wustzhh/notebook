import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TaskLog } from '@/types/task'

export const useLogStore = defineStore('logs', () => {
  const logs = ref<Record<number, TaskLog[]>>({})

  async function loadTaskLogs(taskId: number) {
    try {
      const result = await window.logAPI.getByTask(taskId)
      if (result.length > 0) {
        logs.value[taskId] = result
      }
    } catch { /* keep existing if load fails */ }
  }

  async function loadCommentCounts(taskIds: number[]) {
    const uncached = taskIds.filter(id => !logs.value[id])
    if (uncached.length === 0) return
    for (const id of uncached) {
      try {
        const result = await window.logAPI.getByTask(id)
        if (result.length > 0) {
          logs.value[id] = result
        }
      } catch { /* keep existing */ }
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
