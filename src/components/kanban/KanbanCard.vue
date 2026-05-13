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
        <span class="task-key">{{ task.project_key }}-{{ task.seq_assigned ? task.seq_number : '?' }}</span>
        <span class="header-right">
          <span v-if="cc > 0" class="comment-count">💬 {{ cc }}</span>
          <PriorityBadge :priority="task.priority" />
        </span>
      </div>

      <div v-if="cardTags.length > 0" class="card-tags">
        <span v-for="tag in cardTags" :key="tag.id" class="card-tag" :style="{ background: tag.color + '22', color: tag.color }">{{ tag.name }}</span>
      </div>

      <div v-if="cardMatchType" class="card-match">
        <span v-if="cardMatchType === 'tag'" class="match-tag">🏷 匹配标签</span>
        <span v-if="cardMatchType === 'comment'" class="match-comment">💬 匹配评论</span>
      </div>

      <h3 class="card-title">{{ task.title }}</h3>

      <p v-if="task.description" class="card-description">
        {{ task.description }}
      </p>

      <!-- 子任务列表（带分页） -->
      <div v-if="hasSubtasks" class="subtask-list">
        <!-- 分页控制 -->
        <div v-if="totalPages > 1" class="subtask-pagination">
          <el-button 
            size="small" 
            text 
            :disabled="currentPage === 1"
            @click.stop="currentPage--"
          >
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
          <span class="page-info">{{ currentPage }}/{{ totalPages }}</span>
          <el-button 
            size="small" 
            text 
            :disabled="currentPage === totalPages"
            @click.stop="currentPage++"
          >
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
        
        <!-- 子任务列表 -->
        <div
          v-for="subtask in paginatedSubtasks"
          :key="subtask.id"
          class="subtask-item"
          :class="{ done: subtask.status === 'done' }"
        >
          <el-checkbox
            :model-value="subtask.status === 'done'"
            @change="(val) => toggleSubtaskDone(subtask.id, val as boolean)"
            @click.stop
          />
          <span class="subtask-key">{{ subtask.project_key }}-{{ subtask.seq_assigned ? subtask.seq_number : '?' }}</span>
          <span class="subtask-title">{{ subtask.title }}</span>
        </div>
      </div>

      <div class="card-footer">
        <StatusTag :status="task.status" />
        <template v-if="hasSubtasks">
          <div class="subtask-progress">
            <el-progress
              :percentage="progress.percent"
              :stroke-width="4"
              :show-text="false"
              :color="progressColor"
            />
            <span class="progress-text">{{ progress.done }}/{{ progress.total }}</span>
          </div>
        </template>
        <div v-else-if="task.end_date" class="due-date">
          <el-icon><Calendar /></el-icon>
          <span>{{ formatDate(task.end_date) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'
import { Rank, Calendar, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useTaskStore } from '@/stores/taskStore'
import { useTagStore } from '@/stores/tagStore'
import { useLogStore } from '@/stores/logStore'
import { useUIStore } from '@/stores/uiStore'
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

const taskStore = useTaskStore()
const tagStore = useTagStore()
const logStore = useLogStore()
const uiStore = useUIStore()

const isDragging = ref(false)
const currentPage = ref(1)
const PAGE_SIZE = 3

// 直接访问 taskStore.tasks 以确保响应式追踪
const hasSubtasks = computed(() => 
  taskStore.tasks.some(t => t.parent_id === props.task.id)
)

const progress = computed(() => {
  const subtasks = taskStore.tasks.filter(t => t.parent_id === props.task.id)
  const total = subtasks.length
  const done = subtasks.filter(t => t.status === 'done').length
  return { 
    done, 
    total, 
    percent: total > 0 ? Math.round((done / total) * 100) : 0 
  }
})

const cardTags = computed(() => tagStore.getTaskTags(props.task.id))

const cardMatchType = computed((): 'tag' | 'comment' | null => {
  const q = uiStore.searchQuery?.toLowerCase()
  if (!q) return null
  if (cardTags.value.some(t => t.name.toLowerCase().includes(q))) return 'tag'
  if (logStore.getTaskLogs(props.task.id).some(l => l.type === 'comment' && l.content.toLowerCase().includes(q))) return 'comment'
  return null
})

const cc = computed(() => logStore.commentCount(props.task.id))

// 所有子任务（按 id 排序，即创建顺序）
const allSubtasks = computed(() => 
  taskStore.tasks
    .filter(t => t.parent_id === props.task.id)
    .sort((a, b) => a.id - b.id)
)

// 总页数
const totalPages = computed(() => 
  Math.ceil(allSubtasks.value.length / PAGE_SIZE)
)

// 当前页的子任务
const paginatedSubtasks = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  const end = start + PAGE_SIZE
  return allSubtasks.value.slice(start, end)
})

// 当任务切换时重置页码
watch(() => props.task.id, () => {
  currentPage.value = 1
})

// 调试：监控 seq_assigned 变化
watch(() => props.task.seq_assigned, (val) => {
  console.log('[KanbanCard] task', props.task.id, 'seq_assigned changed to:', val, 'seq_number:', props.task.seq_number)
}, { immediate: true })

// 切换子任务完成状态
async function toggleSubtaskDone(subtaskId: number, done: boolean) {
  try {
    await taskStore.toggleSubtaskDone(subtaskId, done)
    ElMessage.success(done ? '子任务已完成' : '子任务已设为待办')
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  }
}

const progressColor = computed(() => {
  if (progress.value.percent === 100) return '#67c23a'
  if (progress.value.percent > 0) return '#409eff'
  return '#909399'
})

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
  max-width: 100%;
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
  min-width: 0;
  padding: 12px;
  cursor: pointer;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  overflow: hidden;
}

.header-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.comment-count { font-size: 11px; color: var(--text-tertiary); }

.card-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
.card-tag { font-size: 10px; padding: 1px 6px; border-radius: 3px; }
.card-match { margin-bottom: 8px; font-size: 11px; }
.match-tag { background: #e6a23c22; color: #e6a23c; padding: 1px 6px; border-radius: 3px; }
.match-comment { background: #409eff22; color: #409eff; padding: 1px 6px; border-radius: 3px; }

.task-key {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
  flex-shrink: 0;
  transition: color 0.3s ease;
}

.card-title {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

/* 子任务列表 */
.subtask-list {
  margin: 8px 0;
  padding: 8px 0;
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  overflow: hidden;
  transition: border-color 0.3s ease;
}

.subtask-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  margin: 2px 0;
  border-radius: 4px;
  overflow: hidden;
  transition: background 0.15s;
}

.subtask-item:hover {
  background: var(--bg-hover);
}

.subtask-item.done .subtask-title {
  text-decoration: line-through;
  color: var(--text-tertiary);
  transition: color 0.3s ease;
}

.subtask-key {
  font-size: 10px;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60px;
  flex-shrink: 0;
  transition: color 0.3s ease;
}

.subtask-title {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.subtask-item :deep(.el-checkbox) {
  flex-shrink: 0;
}

/* 分页控制 */
.subtask-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 4px 0 8px;
}

.page-info {
  font-size: 11px;
  color: var(--text-secondary);
  min-width: 40px;
  text-align: center;
  transition: color 0.3s ease;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.subtask-progress {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.subtask-progress :deep(.el-progress) {
  flex: 1;
  min-width: 0;
}

.progress-text {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
  transition: color 0.3s ease;
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
