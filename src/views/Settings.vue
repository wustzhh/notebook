<template>
  <div class="settings-view">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>设置</h2>
        </div>
      </template>

      <el-descriptions title="应用信息" :column="1" border>
        <el-descriptions-item label="应用名称">Task Tracker</el-descriptions-item>
        <el-descriptions-item label="版本">1.0.0</el-descriptions-item>
        <el-descriptions-item label="技术栈">Electron + Vue 3 + Element Plus</el-descriptions-item>
      </el-descriptions>

      <el-divider />

      <div class="section">
        <h3>数据管理</h3>
        <el-button type="warning" @click="clearAllData">
          清除所有数据
        </el-button>
        <p class="hint">注意：此操作将删除所有任务和项目，不可恢复！</p>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ElMessageBox } from 'element-plus'

function clearAllData() {
  ElMessageBox.confirm(
    '确定要清除所有数据吗？此操作不可恢复！',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // TODO: 实现清除数据逻辑
    console.log('Clear all data')
  }).catch(() => {
    // 用户取消
  })
}
</script>

<style scoped>
.settings-view {
  padding: 24px;
  max-width: 800px;
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.section {
  margin-top: 24px;
}

.section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
  transition: color 0.3s ease;
}

:deep(.el-card) {
  background: var(--card-bg);
  border-color: var(--border-color);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

:deep(.el-descriptions__label),
:deep(.el-descriptions__content) {
  color: var(--text-primary);
  transition: color 0.3s ease;
}
</style>
