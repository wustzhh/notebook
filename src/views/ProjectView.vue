<template>
  <div class="project-view">
    <div v-if="taskStore.loading" class="loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <template v-else>
      <div class="view-header">
        <div class="view-header-left">
          <span class="project-name" v-if="projectStore.currentProject">
            <span class="color-dot" :style="{ background: projectStore.currentProject.color }"></span>
            {{ projectStore.currentProject.name }}
          </span>
          <el-radio-group v-model="uiStore.viewMode" size="small">
            <el-radio-button value="board">看板</el-radio-button>
            <el-radio-button value="list">列表</el-radio-button>
          </el-radio-group>
        </div>
        <el-button type="primary" size="small" @click="uiStore.openCreateTaskDialog">
          <el-icon><Plus /></el-icon> 新建任务
        </el-button>
      </div>

      <div class="view-content" :class="{ 'has-panel': uiStore.viewingTask }">
        <div v-if="uiStore.viewMode === 'board'" class="board-area">
          <KanbanBoard />
        </div>
        <div v-else class="list-area">
          <el-table
            :data="filteredParentTasks"
            row-key="id"
            :tree-props="{ children: 'subtasks', hasChildren: 'hasSubtasks' }"
            style="width: 100%"
            stripe
            @row-click="handleRowClick"
          >
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="title" label="标题" min-width="200">
              <template #default="{ row }">
                <span class="task-title">{{ row.title }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <StatusTag :status="row.status" />
              </template>
            </el-table-column>
            <el-table-column label="优先级" width="100">
              <template #default="{ row }">
                <PriorityBadge :priority="row.priority" />
              </template>
            </el-table-column>
            <el-table-column label="💬" width="60" align="center">
              <template #default="{ row }">
                <span v-if="getCommentCount(row.id)" class="list-comment-count">{{ getCommentCount(row.id) }}</span>
                <span v-else class="list-comment-zero">-</span>
              </template>
            </el-table-column>
            <el-table-column v-if="uiStore.searchQuery" label="匹配" width="80">
              <template #default="{ row }">
                <span v-if="row.matchType === 'tag'" class="match-badge tag-match">🏷 标签</span>
                <span v-else-if="row.matchType === 'comment'" class="match-badge comment-match">💬 评论</span>
              </template>
            </el-table-column>
            <el-table-column prop="end_date" label="截止日期" width="120">
              <template #default="{ row }">
                {{ row.end_date ? formatDate(row.end_date) : '-' }}
              </template>
            </el-table-column>
          </el-table>
        </div>

        <TaskDetailPanel v-if="uiStore.viewingTask" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import dayjs from 'dayjs'
import { useTaskStore } from '@/stores/taskStore'
import { useProjectStore } from '@/stores/projectStore'
import { useLogStore } from '@/stores/logStore'
import { useTagStore } from '@/stores/tagStore'
import { useUIStore } from '@/stores/uiStore'
import KanbanBoard from '@/components/kanban/KanbanBoard.vue'
import TaskDetailPanel from '@/components/TaskDetailPanel.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import { Loading, Plus } from '@element-plus/icons-vue'

const taskStore = useTaskStore()
const projectStore = useProjectStore()
const logStore = useLogStore()
const tagStore = useTagStore()
const uiStore = useUIStore()

const filteredParentTasks = computed(() => {
  let parentTasks = taskStore.parentTasks
  if (uiStore.filterStatus !== 'all') {
    parentTasks = parentTasks.filter(t => t.status === uiStore.filterStatus)
  }
  if (uiStore.filterPriority !== 'all') {
    parentTasks = parentTasks.filter(t => t.priority === uiStore.filterPriority)
  }
  if (uiStore.searchQuery) {
    const query = uiStore.searchQuery.toLowerCase()
    parentTasks = parentTasks.filter(t => {
      const matchTitle = t.title.toLowerCase().includes(query)
      const matchDesc = t.description?.toLowerCase().includes(query)
      const matchTag = tagStore.getTaskTags(t.id).some(tag => tag.name.toLowerCase().includes(query))
      const matchComment = logStore.getTaskLogs(t.id).some(l => l.type === 'comment' && l.content.toLowerCase().includes(query))
      return matchTitle || matchDesc || matchTag || matchComment
    })
  }
  return parentTasks.map(task => {
    const query = (uiStore.searchQuery || '').toLowerCase()
    let subtasks = taskStore.getSubtasks(task.id)
    if (uiStore.filterStatus !== 'all') {
      subtasks = subtasks.filter(t => t.status === uiStore.filterStatus)
    }
    if (uiStore.filterPriority !== 'all') {
      subtasks = subtasks.filter(t => t.priority === uiStore.filterPriority)
    }
    if (uiStore.searchQuery) {
      subtasks = subtasks.filter(t => t.title.toLowerCase().includes(query) || t.description?.toLowerCase().includes(query))
    }
    // 计算匹配类型
    let matchType: 'title' | 'tag' | 'comment' | 'none' = 'none'
    if (query) {
      if (task.title.toLowerCase().includes(query)) matchType = 'title'
      else if (tagStore.getTaskTags(task.id).some(tag => tag.name.toLowerCase().includes(query))) matchType = 'tag'
      else if (logStore.getTaskLogs(task.id).some(l => l.type === 'comment' && l.content.toLowerCase().includes(query))) matchType = 'comment'
    }
    return { ...task, subtasks, hasSubtasks: subtasks.length > 0, matchType }
  })
})

function formatDate(date: string) {
  return dayjs(date).format('YYYY-MM-DD')
}

function handleRowClick(row: any) {
  if (row.parent_id) return
  uiStore.openTaskDetail(row.id)
}

function getCommentCount(taskId: number) {
  return logStore.commentCount(taskId)
}

onMounted(async () => {
  await taskStore.loadTasks()
  await tagStore.loadProjectTags(projectStore.currentProjectId)
  const ids = taskStore.tasks.map(t => t.id)
  if (ids.length > 0) {
    await logStore.loadCommentCounts(ids)
    for (const id of ids) {
      await tagStore.loadTaskTags(id)
    }
  }
})

watch(() => projectStore.currentProjectId, async () => {
  await tagStore.loadProjectTags(projectStore.currentProjectId)
  const ids = taskStore.tasks.map(t => t.id)
  for (const id of ids) {
    await tagStore.loadTaskTags(id)
  }
})
</script>

<style scoped>
.project-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.view-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.project-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.view-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.view-content.has-panel .board-area,
.view-content.has-panel .list-area {
  flex: 1;
  overflow-x: auto;
}

.view-content:not(.has-panel) .board-area,
.view-content:not(.has-panel) .list-area {
  flex: 1;
}

.board-area {
  overflow: auto;
  height: 100%;
}

.list-area {
  overflow: auto;
  padding: 24px;
  height: 100%;
}

.task-title {
  color: var(--text-primary);
  font-weight: 500;
}

:deep(.el-table__row) { cursor: pointer; }
:deep(.el-table__row:hover) { background-color: var(--bg-hover) !important; }
:deep(.el-table .el-table__row--level-1) { background-color: var(--bg-secondary); }
:deep(.el-table .el-table__row--level-1 .task-title::before) { content: '└─ '; color: var(--text-tertiary); }
:deep(.el-table) {
  --el-table-bg-color: var(--card-bg);
  --el-table-tr-bg-color: var(--card-bg);
  --el-table-header-bg-color: var(--bg-secondary);
  --el-table-border-color: var(--border-color);
  --el-table-text-color: var(--text-primary);
  --el-table-header-text-color: var(--text-secondary);
  --el-table-row-hover-bg-color: var(--bg-hover);
}
.list-comment-count { color: var(--text-secondary); font-size: 13px; }
.list-comment-zero { color: var(--text-tertiary); }
.match-badge { font-size: 11px; padding: 1px 6px; border-radius: 8px; white-space: nowrap; }
.tag-match { background: #e6a23c22; color: #e6a23c; }
.comment-match { background: #409eff22; color: #409eff; }
</style>
