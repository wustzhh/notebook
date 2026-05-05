<template>
  <div class="topbar">
    <div class="topbar-left">
      <el-input
        v-model="searchQuery"
        placeholder="搜索任务..."
        prefix-icon="Search"
        clearable
        style="width: 240px"
        @input="handleSearch"
      />
      <el-select
        v-model="filterStatus"
        placeholder="状态"
        clearable
        style="width: 110px"
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
        style="width: 100px"
        @change="handleFilterChange"
      >
        <el-option label="全部" value="all" />
        <el-option label="低" value="low" />
        <el-option label="中" value="medium" />
        <el-option label="高" value="high" />
        <el-option label="紧急" value="critical" />
      </el-select>
    </div>

    <div class="topbar-right">
      <SyncStatus />
      <DarkModeToggle />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '@/stores/uiStore'
import DarkModeToggle from '@/components/common/DarkModeToggle.vue'
import SyncStatus from '@/components/layout/SyncStatus.vue'

const uiStore = useUIStore()

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

function handleSearch() {}
function handleFilterChange() {}
</script>

<style scoped>
.topbar {
  height: 48px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  gap: 12px;
  flex-shrink: 0;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
</style>
