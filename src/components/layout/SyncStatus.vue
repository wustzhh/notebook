<template>
  <div class="sync-status" @click="handleClick" :title="statusTooltip">
    <el-icon v-if="syncStore.syncStatus === 'synced'" class="synced"><CircleCheck /></el-icon>
    <el-icon v-if="syncStore.syncStatus === 'syncing'" class="syncing rotating"><Refresh /></el-icon>
    <el-badge v-if="syncStore.syncStatus === 'pending'" :value="syncStore.dirtyCount" :max="99" class="badge">
      <el-icon class="pending"><Warning /></el-icon>
    </el-badge>
    <el-icon v-if="syncStore.syncStatus === 'offline'" class="offline"><Remove /></el-icon>
    <el-icon v-if="syncStore.syncStatus === 'disconnected'" class="disconnected"><Link /></el-icon>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSyncStore } from '@/stores/syncStore'
import { useAuthStore } from '@/stores/authStore'
import { CircleCheck, Refresh, Warning, Remove, Link } from '@element-plus/icons-vue'

const syncStore = useSyncStore()
const authStore = useAuthStore()
const router = useRouter()

const statusTooltip = computed(() => {
  const map: Record<string, string> = {
    synced: '已同步',
    syncing: '同步中...',
    pending: `有 ${syncStore.dirtyCount} 条待同步`,
    offline: '离线',
    disconnected: '未登录 — 点击前往登录'
  }
  return map[syncStore.syncStatus] || ''
})

function handleClick() {
  if (authStore.isLoggedIn) {
    if (syncStore.syncStatus !== 'syncing') syncStore.manualSync()
  } else {
    router.push('/settings')
  }
}
</script>

<style scoped>
.sync-status {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.sync-status:hover {
  background: var(--bg-hover);
}

.synced {
  color: #67c23a;
}

.syncing {
  color: #409eff;
}

.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.pending {
  color: #e6a23c;
}

.offline {
  color: #f56c6c;
}

.disconnected {
  color: var(--text-tertiary);
  opacity: 0.5;
}

.badge :deep(.el-badge__content) {
  top: -4px;
  right: -8px;
}
</style>
