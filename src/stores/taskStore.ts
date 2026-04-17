import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { taskService } from '@/services/taskService'
import type { Task, TaskStatus, TaskCreateData, TaskUpdateData } from '@/types/task'

export const useTaskStore = defineStore('tasks', () => {
  // State
  const tasks = ref<Task[]>([])
  const selectedTaskId = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const selectedTask = computed(() =>
    tasks.value.find(t => t.id === selectedTaskId.value)
  )

  const tasksByStatus = computed(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: []
    }

    tasks.value.forEach(task => {
      if (grouped[task.status]) {
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

  // Actions
  async function loadTasks() {
    loading.value = true
    error.value = null
    try {
      tasks.value = await taskService.getAll()
    } catch (e: any) {
      error.value = e.message
      console.error('Failed to load tasks:', e)
    } finally {
      loading.value = false
    }
  }

  async function createTask(data: TaskCreateData) {
    try {
      const newTask = await taskService.create(data)
      tasks.value.push(newTask)
      return newTask
    } catch (e: any) {
      error.value = e.message
      console.error('Failed to create task:', e)
      throw e
    }
  }

  async function updateTask(id: number, data: TaskUpdateData) {
    try {
      const updatedTask = await taskService.update(id, data)
      const index = tasks.value.findIndex(t => t.id === id)
      if (index !== -1) {
        tasks.value[index] = updatedTask
      }
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

  function clearError() {
    error.value = null
  }

  return {
    tasks,
    selectedTaskId,
    selectedTask,
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
    clearError
  }
})
