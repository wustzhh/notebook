<template>
  <div 
    class="kanban-column"
    @dragover="handleDragOver"
    @drop="handleDrop"
  >
    <div class="column-header">
      <div class="header-left">
        <h3>{{ column.title }}</h3>
        <span class="count">{{ tasks.length }}</span>
      </div>
    </div>

    <div class="column-body" ref="columnBodyRef">
      <KanbanCard
        v-for="task in sortedTasks"
        :key="task.id"
        :task="task"
        :column-id="column.id"
        @click="emit('task-click', task)"
        @drag-start="handleCardDragStart"
        @drag-end="handleCardDragEnd"
      />

      <div v-if="tasks.length === 0" class="empty-state">
        <p>暂无任务</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import KanbanCard from './KanbanCard.vue'
import type { Task } from '@/types/task'

const props = defineProps<{
  column: { id: string; title: string }
  tasks: Task[]
}>()

const emit = defineEmits<{
  (e: 'task-click', task: Task): void
  (e: 'task-drag-start', taskId: number, fromColumn: string): void
  (e: 'task-drag-end'): void
  (e: 'task-drop', toColumn: string, dropIndex: number): void
}>()

const columnBodyRef = ref<HTMLElement | null>(null)
const dragOverIndex = ref<number>(-1)

const sortedTasks = computed(() => {
  return [...props.tasks].sort((a, b) => a.position - b.position)
})

function handleCardDragStart(taskId: number) {
  emit('task-drag-start', taskId, props.column.id)
}

function handleCardDragEnd() {
  emit('task-drag-end')
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'move'

  // 根据鼠标位置计算放置索引
  if (columnBodyRef.value) {
    const cards = Array.from(columnBodyRef.value.querySelectorAll('.kanban-card'))
    const mouseY = event.clientY
    let index = props.tasks.length

    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect()
      const cardMiddle = rect.top + rect.height / 2
      if (mouseY < cardMiddle) {
        index = i
        break
      }
    }

    dragOverIndex.value = index
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  emit('task-drop', props.column.id, dragOverIndex.value)
  dragOverIndex.value = -1
}
</script>

<style scoped>
.kanban-column {
  background: var(--bg-secondary);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  max-height: 100%;
  min-width: 280px;
  transition: background-color 0.3s ease;
}

.column-header {
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
  transition: border-color 0.3s ease;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-left h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  transition: color 0.3s ease;
}

.count {
  background: var(--border-color);
  color: var(--text-secondary);
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.column-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 100px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  color: var(--text-tertiary);
  font-size: 13px;
  border: 2px dashed var(--border-color);
  border-radius: 4px;
  transition: color 0.3s ease, border-color 0.3s ease;
}
</style>
