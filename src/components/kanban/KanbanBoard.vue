<template>
  <div class="kanban-board">
    <KanbanColumn
      v-for="column in columns"
      :key="column.id"
      :column="column"
      :tasks="getTasksByStatus(column.id)"
      @task-click="handleTaskClick"
      @task-drag-start="handleDragStart"
      @task-drag-end="handleDragEnd"
      @task-drop="handleDrop"
    />
  </div>
</template>

<script setup lang="ts">
import KanbanColumn from './KanbanColumn.vue'
import { useTaskStore } from '@/stores/taskStore'
import { useUIStore } from '@/stores/uiStore'
import type { Task } from '@/types/task'

const taskStore = useTaskStore()
const uiStore = useUIStore()

const columns = [
  { id: 'todo', title: '待办' },
  { id: 'in_progress', title: '进行中' },
  { id: 'review', title: '审核中' },
  { id: 'done', title: '已完成' }
]

function getTasksByStatus(status: string) {
  let tasks: Task[] = []

  switch (status) {
    case 'todo':
      tasks = taskStore.todoTasks
      break
    case 'in_progress':
      tasks = taskStore.inProgressTasks
      break
    case 'review':
      tasks = taskStore.reviewTasks
      break
    case 'done':
      tasks = taskStore.doneTasks
      break
  }

  return applyFilters(tasks)
}

function applyFilters(tasks: Task[]) {
  let filtered = tasks

  if (uiStore.filterStatus !== 'all') {
    filtered = filtered.filter(t => t.status === uiStore.filterStatus)
  }

  if (uiStore.filterPriority !== 'all') {
    filtered = filtered.filter(t => t.priority === uiStore.filterPriority)
  }

  if (uiStore.searchQuery) {
    const query = uiStore.searchQuery.toLowerCase()
    filtered = filtered.filter(t =>
      t.title.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query)
    )
  }

  return filtered
}

function handleTaskClick(task: Task) {
  uiStore.openTaskDetail(task.id)
}

// 拖拽状态
let draggedTaskId: number | null = null
let draggedFromColumn: string | null = null

function handleDragStart(taskId: number, fromColumn: string) {
  draggedTaskId = taskId
  draggedFromColumn = fromColumn
}

function handleDragEnd() {
  draggedTaskId = null
  draggedFromColumn = null
}

async function handleDrop(toColumn: string, dropIndex: number) {
  if (draggedTaskId === null || draggedFromColumn === null) return

  const taskId = draggedTaskId
  const fromColumn = draggedFromColumn

  // 如果是同一列且位置没变，直接返回
  if (fromColumn === toColumn) {
    const columnTasks = getTasksByStatus(fromColumn)
    const sortedTasks = [...columnTasks].sort((a, b) => a.position - b.position)
    const currentIndex = sortedTasks.findIndex(t => t.id === taskId)
    if (currentIndex === dropIndex) {
      draggedTaskId = null
      draggedFromColumn = null
      return
    }
  }

  try {
    await taskStore.moveTask(taskId, toColumn, dropIndex)
  } catch (error) {
    console.error('Drag operation failed:', error)
  } finally {
    draggedTaskId = null
    draggedFromColumn = null
  }
}
</script>

<style scoped>
.kanban-board {
  display: flex;
  gap: 16px;
  padding: 24px;
  overflow-x: auto;
  height: 100%;
  width: 100%;
}

.kanban-board .kanban-column {
  flex: 1;
  min-width: 0;
}

@media (max-width: 900px) {
  .kanban-board {
    flex-wrap: wrap;
  }
  .kanban-board .kanban-column {
    flex: 0 0 calc(50% - 8px);
  }
}

@media (max-width: 600px) {
  .kanban-board .kanban-column {
    flex: 0 0 100%;
  }
}
</style>
