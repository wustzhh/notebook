<template>
  <el-button
    class="dark-mode-toggle"
    :class="{ 'is-dark': themeStore.isDarkMode }"
    circle
    @click="themeStore.toggleDarkMode"
    :title="themeStore.isDarkMode ? '切换到亮色模式' : '切换到暗色模式'"
  >
    <el-icon v-if="themeStore.isDarkMode">
      <Sunny />
    </el-icon>
    <el-icon v-else>
      <Moon />
    </el-icon>
  </el-button>
</template>

<script setup lang="ts">
import { useThemeStore } from '@/stores/themeStore'
import { Sunny, Moon } from '@element-plus/icons-vue'

const themeStore = useThemeStore()
</script>

<style scoped>
.dark-mode-toggle {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  transition: all 0.3s ease;
}

.dark-mode-toggle:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.dark-mode-toggle.is-dark {
  color: #FFD700;
}
</style>
