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
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 清除数据功能已移除
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
