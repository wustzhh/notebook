<template>
  <div class="topbar">
    <div class="topbar-left">
      <h1 class="page-title">{{ title }}</h1>
    </div>

    <div class="topbar-center">
      <el-input
        v-model="searchQuery"
        placeholder="搜索任务..."
        prefix-icon="Search"
        clearable
        style="width: 300px"
        @input="handleSearch"
      />
    </div>

    <div class="topbar-right">
      <el-select
        v-model="filterStatus"
        placeholder="状态"
        clearable
        style="width: 120px; margin-right: 12px"
        @change="handleFilterChange"
      >
        <el-option label="全部" value="all" />
        <el-option label="待办" value="todo" />
        <el-option label="进行中" value="in_progress" />
        <el-option label="审核中" value="review" />
        <el-option label="已完成" value="done" />
      </el-select>

      <el-select
        v-model="filterPriority"
        placeholder="优先级"
        clearable
        style="width: 120px; margin-right: 12px"
        @change="handleFilterChange"
      >
        <el-option label="全部" value="all" />
        <el-option label="低" value="low" />
        <el-option label="中" value="medium" />
        <el-option label="高" value="high" />
        <el-option label="紧急" value="critical" />
      </el-select>

      <el-button type="primary" @click="uiStore.openCreateTaskDialog">
        <el-icon><Plus /></el-icon>
        新建任务
      </el-button>

      <SyncStatus />

      <DarkModeToggle />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUIStore } from '@/stores/uiStore'
import { useThemeStore } from '@/stores/themeStore'
import { useProjectStore } from '@/stores/projectStore'
import { Plus } from '@element-plus/icons-vue'
import DarkModeToggle from '@/components/common/DarkModeToggle.vue'
import SyncStatus from '@/components/layout/SyncStatus.vue'

const themeStore = useThemeStore()
const projectStore = useProjectStore()

const route = useRoute()
const uiStore = useUIStore()

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/board': '看板',
    '/list': '任务列表',
    '/settings': '设置'
  }
  return titles[route.path] || 'Task Tracker'
})

const title = computed(() => {
  const projectName = projectStore.currentProject?.name || '未选择项目'
  return `${pageTitle.value} - ${projectName}`
})

const searchQuery = computed({
  get: () => uiStore.searchQuery,
  set: (value) => uiStore.setSearchQuery(value)
})

const filterStatus = computed({
  get: () => uiStore.filterStatus,
  set: (value) => uiStore.setFilterStatus(value)
})

const filterPriority = computed({
  get: () => uiStore.filterPriority,
  set: (value) => uiStore.setFilterPriority(value)
})

function handleSearch() {
  // 搜索逻辑在视图中处理
}

function handleFilterChange() {
  // 筛选逻辑在视图中处理
}
</script>

<style scoped>
.topbar {
  height: 60px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  gap: 16px;
  flex-shrink: 0;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.topbar-left {
  flex: 0 0 auto;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  transition: color 0.3s ease;
}

.topbar-center {
  flex: 1 1 auto;
  display: flex;
  justify-content: center;
  min-width: 0;
}

.topbar-center :deep(.el-input) {
  max-width: 360px;
  width: 100%;
}

.topbar-right {
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
}

@media (max-width: 1100px) {
  .topbar {
    padding: 0 12px;
    gap: 8px;
  }

  .topbar-center :deep(.el-input) {
    max-width: 200px;
  }

  .page-title {
    font-size: 16px;
  }
}

@media (max-width: 900px) {
  .topbar-right {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}
</style>
