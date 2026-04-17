<template>
  <div class="list-view-wrapper">
    <div class="list-view">
      <el-table
        :data="filteredTasks"
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
        <el-table-column prop="end_date" label="截止日期" width="120">
          <template #default="{ row }">
            {{ row.end_date ? formatDate(row.end_date) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-popconfirm
              title="确定删除此任务？"
              @confirm="deleteTask(row.id)"
            >
              <template #reference>
                <el-button link type="danger" size="small">
                  删除
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <TaskDetailPanel v-if="uiStore.viewingTask" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import { useTaskStore } from '@/stores/taskStore'
import { useUIStore } from '@/stores/uiStore'
import StatusTag from '@/components/common/StatusTag.vue'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import TaskDetailPanel from '@/components/TaskDetailPanel.vue'

const taskStore = useTaskStore()
const uiStore = useUIStore()

const filteredTasks = computed(() => {
  let tasks = taskStore.tasks

  if (uiStore.filterStatus !== 'all') {
    tasks = tasks.filter(t => t.status === uiStore.filterStatus)
  }

  if (uiStore.filterPriority !== 'all') {
    tasks = tasks.filter(t => t.priority === uiStore.filterPriority)
  }

  if (uiStore.searchQuery) {
    const query = uiStore.searchQuery.toLowerCase()
    tasks = tasks.filter(t =>
      t.title.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query)
    )
  }

  return tasks
})

function formatDate(date: string) {
  return dayjs(date).format('YYYY-MM-DD')
}

function handleRowClick(row: any) {
  uiStore.openTaskDetail(row.id)
}

async function deleteTask(id: number) {
  await taskStore.deleteTask(id)
}

onMounted(async () => {
  await taskStore.loadTasks()
})
</script>

<style scoped>
.list-view-wrapper {
  display: flex;
  height: calc(100vh - 140px);
  overflow: hidden;
}

.list-view {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  min-width: 0;
}

.task-title {
  color: var(--text-primary);
  font-weight: 500;
  transition: color 0.3s ease;
}

:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover) {
  background-color: var(--bg-hover) !important;
}

:deep(.el-table) {
  --el-table-bg-color: var(--card-bg);
  --el-table-tr-bg-color: var(--card-bg);
  --el-table-header-bg-color: var(--bg-secondary);
  --el-table-border-color: var(--border-color);
  --el-table-text-color: var(--text-primary);
  --el-table-header-text-color: var(--text-secondary);
  --el-table-row-hover-bg-color: var(--bg-hover);
  transition: all 0.3s ease;
}
</style>
