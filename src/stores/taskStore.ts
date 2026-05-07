import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { taskService } from '@/services/taskService'
import { useProjectStore } from './projectStore'
import type { Task, TaskStatus, TaskPriority, TaskCreateData, TaskUpdateData } from '@/types/task'
import { useLogStore } from './logStore'
import { useAuthStore } from './authStore'
import { getNextLocalId, registerRemoteId, updateMaxFromItems } from '@/utils/idManager'

async function markDirty() {
  try {
    const { useSyncStore } = await import('./syncStore')
    useSyncStore().incrementDirty()
  } catch { /* store not available */ }
}

async function logChange(taskId: number, data: any) {
  try {
    await window.logAPI.create(data)
  } catch { /* electron not available */ }
}

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const selectedTaskId = ref<number | null>(null)
  const deletedTaskIds = ref<number[]>(JSON.parse(localStorage.getItem('deleted_task_ids') || '[]'))
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const selectedTask = computed(() =>
    tasks.value.find(t => t.id === selectedTaskId.value)
  )

  // 辅助函数：过滤 null/undefined 值
  function isValidTask(task: Task | null | undefined): task is Task {
    return task !== null && task !== undefined
  }

  // 按当前项目过滤的任务
  const projectStore = useProjectStore()
  const currentProjectTasks = computed(() => {
    return tasks.value
      .filter(isValidTask)
      .filter(t => t.project_id === projectStore.currentProjectId)
  })

  // 只获取父任务（排除子任务，用于看板和列表视图）
  const parentTasks = computed(() => {
    return currentProjectTasks.value
      .filter(isValidTask)
      .filter(t => t.parent_id === null)
  })

  // 按状态分组（基于当前项目的父任务，子任务不显示在看板列中）
  const tasksByStatus = computed(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: []
    }

    parentTasks.value.forEach(task => {
      if (task && grouped[task.status]) {
        grouped[task.status].push(task)
      }
    })

    // 按 position 排序
    Object.keys(grouped).forEach(status => {
      grouped[status as TaskStatus].sort((a, b) => a.position - b.position)
    })

    return grouped
  })

  const todoTasks = computed(() => tasksByStatus.value.todo)
  const inProgressTasks = computed(() => tasksByStatus.value.in_progress)
  const reviewTasks = computed(() => tasksByStatus.value.review)
  const doneTasks = computed(() => tasksByStatus.value.done)

  // 当前项目的任务总数
  const currentProjectTaskCount = computed(() => currentProjectTasks.value.length)

  // Actions
  async function loadTasks() {
    loading.value = true
    error.value = null
    try {
      tasks.value = await taskService.getAll()
      updateMaxFromItems('tasks', tasks.value)
    } catch (e: any) {
      error.value = e.message
      console.error('Failed to load tasks:', e)
    } finally {
      loading.value = false
    }
  }

  async function createTask(data: TaskCreateData) {
    try {
      const auth = useAuthStore()
      if (auth.isLoggedIn && auth.serverUrl && auth.token) {
        try {
          const result = await window.syncAPI.genId(auth.serverUrl, auth.token, 'tasks', 1)
          ;(data as any)._clientId = result.ids[0]
          registerRemoteId('tasks', result.ids[0])
        } catch {
          auth.forceLogout('服务器连接失败，已退出登录')
        }
      }
      if (!(data as any)._clientId) {
        ;(data as any)._clientId = getNextLocalId('tasks')
      }
      const newTask = await taskService.create(data)
      // 检查返回值是否有效
      if (!newTask) {
        throw new Error('创建任务失败：返回空值')
      }
      tasks.value = [...tasks.value, newTask]
      logChange(newTask.id, { task_id: newTask.id, type: 'created', content: '创建了任务' })
      markDirty()

      // 在线时立即 push 以获取服务器分配的 seq_number
      if (auth.isLoggedIn) {
        try {
          const { useSyncStore } = await import('./syncStore')
          await useSyncStore().pushToServer()
        } catch { /* 后台推送 */ }
      }

      return newTask
    } catch (e: any) {
      error.value = e.message
      console.error('Failed to create task:', e)
      throw e
    }
  }

  async function updateTask(id: number, data: TaskUpdateData) {
    try {
      const oldTask = tasks.value.find(t => t.id === id)
      const updatedTask = await taskService.update(id, data)
      tasks.value = tasks.value.map(t => t.id === id ? updatedTask : t)

      // 自动记录变更日志
      if (oldTask) {
        if (data.title !== undefined && data.title !== oldTask.title) {
          logChange(id, { task_id: id, type: 'title_change', content: `标题改为「${data.title}」`, old_value: oldTask.title, new_value: data.title, field: 'title' })
        }
        if (data.status !== undefined && data.status !== oldTask.status) {
          const label: Record<string, string> = { todo: '待办', in_progress: '进行中', review: '审核中', done: '已完成' }
          logChange(id, { task_id: id, type: 'status_change', content: `状态从 ${label[oldTask.status]} 变为 ${label[data.status]}`, old_value: oldTask.status, new_value: data.status, field: 'status' })
        }
        if (data.priority !== undefined && data.priority !== oldTask.priority) {
          const label: Record<string, string> = { low: '低', medium: '中', high: '高', critical: '紧急' }
          logChange(id, { task_id: id, type: 'priority_change', content: `优先级从 ${label[oldTask.priority]} 变为 ${label[data.priority]}`, old_value: oldTask.priority, new_value: data.priority, field: 'priority' })
        }
        if (data.parent_id !== undefined && data.parent_id !== oldTask.parent_id) {
          logChange(id, { task_id: id, type: 'parent_change', content: data.parent_id ? '设为子任务' : '取消子任务', old_value: String(oldTask.parent_id || ''), new_value: String(data.parent_id || ''), field: 'parent_id' })
        }
      }
      markDirty()
      return updatedTask
    } catch (e: any) {
      error.value = e.message
      console.error('Failed to update task:', e)
      throw e
    }
  }

  async function deleteTask(id: number) {
    try {
      await taskService.delete(id)
      tasks.value = tasks.value.filter(t => t.id !== id)
      deletedTaskIds.value.push(id)
      localStorage.setItem('deleted_task_ids', JSON.stringify(deletedTaskIds.value))
      markDirty()
      if (selectedTaskId.value === id) {
        selectedTaskId.value = null
      }
    } catch (e: any) {
      error.value = e.message
      console.error('Failed to delete task:', e)
      throw e
    }
  }

  async function updateTaskPosition(taskId: number, status: string, newPosition: number) {
    try {
      // 乐观更新 UI
      const task = tasks.value.find(t => t.id === taskId)
      if (task) {
        const oldStatus = task.status
        task.status = status as TaskStatus
        task.position = newPosition
      }

      // 重新计算同列其他任务的位置
      const tasksInStatus = tasks.value.filter(t => t.status === status && t.id !== taskId)
      const updates = tasksInStatus.map((t, idx) => ({
        id: t.id,
        status: t.status,
        position: idx >= newPosition ? idx + 1 : idx
      }))

      // 添加当前任务的更新
      updates.push({ id: taskId, status, position: newPosition })

      // 后台同步到数据库
      await taskService.reorder(updates)
      // 同步内存中的 sync_version
      for (const u of updates) {
        const t = tasks.value.find(tt => tt.id === u.id)
        if (t) { (t as any).sync_version = 0; (t as any).updated_at = new Date().toISOString() }
      }
      markDirty()
    } catch (e: any) {
      error.value = e.message
      console.error('Failed to reorder tasks:', e)
      // 出错时重新加载
      await loadTasks()
      throw e
    }
  }

  /**
   * 移动任务到新状态和位置（用于拖拽）
   * @param taskId 任务ID
   * @param newStatus 新状态
   * @param newIndex 在新状态中的索引位置
   */
  async function moveTask(taskId: number, newStatus: string, newIndex: number) {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task) return

    const oldStatus = task.status

    // 获取目标列的任务列表（排除当前任务）
    const targetTasks = tasks.value
      .filter(t => t.status === newStatus && t.id !== taskId)
      .sort((a, b) => a.position - b.position)

    // 在原位置移除任务
    if (oldStatus === newStatus) {
      // 同列内移动：先移除再插入
      const sourceTasks = tasks.value
        .filter(t => t.status === oldStatus && t.id !== taskId)
        .sort((a, b) => a.position - b.position)
      
      // 重新计算原列剩余任务的位置
      sourceTasks.forEach((t, idx) => {
        t.position = idx
      })
    } else {
      // 跨列移动：重新计算原列剩余任务的位置
      const sourceTasks = tasks.value
        .filter(t => t.status === oldStatus)
        .sort((a, b) => a.position - b.position)
      
      sourceTasks.forEach((t, idx) => {
        t.position = idx
      })
    }

    // 在目标位置插入任务
    const insertIndex = Math.min(newIndex, targetTasks.length)
    targetTasks.splice(insertIndex, 0, task)

    // 更新任务状态和位置
    task.status = newStatus as TaskStatus
    
    // 重新计算目标列所有任务的位置
    targetTasks.forEach((t, idx) => {
      t.position = idx
    })

    // 同步到数据库
    try {
      const allUpdates = [
        // 当前任务
        { id: taskId, status: newStatus, position: insertIndex },
        // 目标列其他任务
        ...targetTasks
          .filter(t => t.id !== taskId)
          .map(t => ({ id: t.id, status: newStatus, position: t.position })),
        // 如果是跨列移动，包含原列的任务
        ...(oldStatus !== newStatus 
          ? tasks.value
              .filter(t => t.status === oldStatus)
              .map(t => ({ id: t.id, status: oldStatus, position: t.position }))
          : [])
      ]
      
      await taskService.reorder(allUpdates)
      for (const u of allUpdates) {
        const t = tasks.value.find(tt => tt.id === u.id)
        if (t) { (t as any).sync_version = 0; (t as any).updated_at = new Date().toISOString() }
      }
      markDirty()
    } catch (e: any) {
      error.value = e.message
      console.error('Failed to move task:', e)
      await loadTasks()
      throw e
    }
  }

  function selectTask(taskId: number | null) {
    selectedTaskId.value = taskId
  }

  // 子任务相关方法

  // 获取某任务的子任务列表
  function getSubtasks(parentId: number): Task[] {
    return tasks.value
      .filter(t => t.parent_id === parentId)
      .sort((a, b) => a.position - b.position)
  }

  // 获取某任务是否有子任务
  function hasSubtasks(taskId: number): boolean {
    return tasks.value.some(t => t.parent_id === taskId)
  }

  // 获取子任务完成进度
  function getSubtaskProgress(parentId: number): { done: number; total: number; percent: number } {
    const subtasks = getSubtasks(parentId)
    const total = subtasks.length
    const done = subtasks.filter(t => t.status === 'done').length
    const percent = total > 0 ? Math.round((done / total) * 100) : 0
    return { done, total, percent }
  }

  // 创建子任务
  async function createSubtask(parentId: number, data: {
    title: string
    description?: string
    status?: TaskStatus
    priority?: TaskPriority
  }) {
    const subtasks = getSubtasks(parentId)
    const position = subtasks.length

    try {
      const parentTask = tasks.value.find(t => t.id === parentId)
      if (!parentTask) throw new Error('父任务不存在')

      let cid: number | undefined
      const auth = useAuthStore()
      if (auth.isLoggedIn && auth.serverUrl && auth.token) {
        try {
          const result = await window.syncAPI.genId(auth.serverUrl, auth.token, 'tasks', 1)
          cid = result.ids[0]
          registerRemoteId('tasks', cid)
        } catch {
          auth.forceLogout('服务器连接失败，已退出登录')
        }
      }
      if (!cid) {
        cid = getNextLocalId('tasks')
      }

      const newTask = await taskService.create({
        title: data.title,
        description: data.description || '',
        project_id: parentTask.project_id,
        parent_id: parentId,
        status: data.status || 'todo',
        priority: data.priority || 'medium',
        position,
        _clientId: cid
      } as any)
      // 检查返回值是否有效
      if (!newTask) {
        throw new Error('创建子任务失败：返回空值')
      }
      // 使用数组替换而非 push，确保触发响应式更新
      tasks.value = [...tasks.value, newTask]
      markDirty()
      return newTask
    } catch (e: any) {
      error.value = e.message
      console.error('Failed to create subtask:', e)
      throw e
    }
  }

  // 切换子任务完成状态（快捷操作）
  async function toggleSubtaskDone(subtaskId: number, done: boolean) {
    try {
      const newStatus: TaskStatus = done ? 'done' : 'todo'
      const updatedTask = await taskService.update(subtaskId, { status: newStatus })
      // 使用数组替换，确保触发响应式更新
      tasks.value = tasks.value.map(t => t.id === subtaskId ? updatedTask : t)
      markDirty()
      return updatedTask
    } catch (e: any) {
      error.value = e.message
      console.error('Failed to toggle subtask:', e)
      throw e
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    tasks,
    currentProjectTasks,
    parentTasks,
    currentProjectTaskCount,
    selectedTaskId,
    selectedTask,
    deletedTaskIds,
    tasksByStatus,
    todoTasks,
    inProgressTasks,
    reviewTasks,
    doneTasks,
    loading,
    error,
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    updateTaskPosition,
    moveTask,
    selectTask,
    getSubtasks,
    hasSubtasks,
    getSubtaskProgress,
    createSubtask,
    toggleSubtaskDone,
    clearError
  }
})
