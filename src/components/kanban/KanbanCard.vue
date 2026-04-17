<template>
  <div
    class="kanban-card"
    :class="{ 'is-dragging': isDragging }"
    draggable="false"
  >
    <div 
      class="drag-handle"
      draggable="true"
      @dragstart="handleDragStart"
      @dragend="handleDragEnd"
    >
      <el-icon><Rank /></el-icon>
    </div>

    <div class="card-content" @click="handleClick">
      <div class="card-header">
        <span class="task-key">{{ task.project_key }}-{{ task.id }}</span>
        <PriorityBadge :priority="task.priority" />
      </div>

      <h3 class="card-title">{{ task.title }}</h3>

      <p v-if="task.description" class="card-description">
        {{ task.description }}
      </p>

      <div class="card-footer">
        <StatusTag :status="task.status" />
        <div v-if="task.end_date" class="due-date">
          <el-icon><Calendar /></el-icon>
          <span>{{ formatDate(task.end_date) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import dayjs from 'dayjs'
import { Rank, Calendar } from '@element-plus/icons-vue'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import type { Task } from '@/types/task'

const props = defineProps<{ 
  task: Task
  columnId: string
}>()
const emit = defineEmits<{ 
  (e: 'click'): void
  (e: 'drag-start', taskId: number): void
  (e: 'drag-end'): void
}>()

const isDragging = ref(false)

function handleDragStart(event: DragEvent) {
  isDragging.value = true
  event.dataTransfer!.effectAllowed = 'move'
  event.dataTransfer!.setData('text/plain', `task-${props.task.id}`)
  emit('drag-start', props.task.id)
  
  // 设置拖拽图像（半透明卡片）
  const cardEl = (event.target as HTMLElement).closest('.kanban-card')
  if (cardEl) {
    event.dataTransfer!.setDragImage(cardEl, 20, 20)
  }
}

function handleDragEnd() {
  isDragging.value = false
  emit('drag-end')
}

function handleClick() {
  emit('click')
}

function formatDate(date: string) {
  return dayjs(date).format('MM/DD')
}
</script>

<style scoped>
.kanban-card {
  background: var(--card-bg);
  border-radius: 4px;
  box-shadow: 0 1px 2px var(--shadow);
  border: 2px solid transparent;
  display: flex;
  overflow: hidden;
  transition: background-color 0.3s ease, box-shadow 0.3s ease, opacity 0.2s ease;
  user-select: none;
}

.kanban-card:hover {
  box-shadow: 0 4px 8px var(--shadow);
}

.kanban-card.is-dragging {
  opacity: 0.4;
}

.drag-handle {
  width: 28px;
  min-width: 28px;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  color: var(--text-tertiary);
  flex-shrink: 0;
  transition: background-color 0.3s ease, color 0.3s ease;
  touch-action: none;
}

.drag-handle:hover {
  color: var(--text-secondary);
  background: var(--bg-hover);
}

.drag-handle:active {
  cursor: grabbing;
}

.card-content {
  flex: 1;
  padding: 12px;
  cursor: pointer;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.task-key {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
  transition: color 0.3s ease;
}

.card-title {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.4;
  transition: color 0.3s ease;
}

.card-description {
  margin: 0 0 12px 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.3s ease;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.due-date {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}
</style>
