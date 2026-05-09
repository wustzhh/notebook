<template>
  <div class="board-view">
    <div v-if="taskStore.loading" class="loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <template v-else>
      <div class="board-wrapper">
        <KanbanBoard />
        <TaskDetailPanel v-if="uiStore.viewingTask" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useTaskStore } from '@/stores/taskStore'
import { useUIStore } from '@/stores/uiStore'
import KanbanBoard from '@/components/kanban/KanbanBoard.vue'
import TaskDetailPanel from '@/components/TaskDetailPanel.vue'
import { Loading } from '@element-plus/icons-vue'

const taskStore = useTaskStore()
const uiStore = useUIStore()

onMounted(async () => {
  await taskStore.loadTasks()
})
</script>

<style scoped>
.board-view {
  height: 100%;
  display: flex;
  overflow: hidden;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.loading .el-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.board-wrapper {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>
