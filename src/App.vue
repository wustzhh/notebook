<template>
  <div class="app">
    <AppSidebar />
    <div class="main-content">
      <TopBar />
      <div class="content-area">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </div>
    <TaskFormDialog />
    <ProjectFormDialog />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { useAuthStore } from '@/stores/authStore'
import { useSyncStore } from '@/stores/syncStore'
import { useThemeStore } from '@/stores/themeStore'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import TopBar from '@/components/layout/TopBar.vue'
import TaskFormDialog from '@/components/TaskFormDialog.vue'
import ProjectFormDialog from '@/components/ProjectFormDialog.vue'

const projectStore = useProjectStore()
const authStore = useAuthStore()
const syncStore = useSyncStore()
const themeStore = useThemeStore()

function applyBg() {
  const appEl = document.querySelector('.app') as HTMLElement
  if (!appEl) return
  if (themeStore.backgroundImage) {
    appEl.style.backgroundImage = 'url(' + themeStore.backgroundImage + ')'
    appEl.style.backgroundSize = 'cover'
    appEl.style.backgroundPosition = 'center'
    appEl.style.backgroundAttachment = 'fixed'
    appEl.style.setProperty('--bg-secondary', 'transparent')
    document.getElementById('app')?.classList.add('has-bg')
  } else {
    appEl.style.backgroundImage = ''
    appEl.style.backgroundSize = ''
    appEl.style.backgroundPosition = ''
    appEl.style.backgroundAttachment = ''
    appEl.style.removeProperty('--bg-secondary')
    document.getElementById('app')?.classList.remove('has-bg')
  }
}

onMounted(async () => {
  applyBg()
  watch(() => themeStore.backgroundImage, applyBg)
  // 恢复登录状态
  await authStore.loadFromStorage()
  if (authStore.isLoggedIn) {
    await authStore.checkAndRefreshToken()
    syncStore.startAutoSync()
  }
  await projectStore.loadProjects()
})
</script>

<style>
/* CSS 变量定义 - 亮色模式（默认） */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #FAFBFC;
  --bg-hover: rgba(9, 30, 66, 0.08);
  --text-primary: #172B4D;
  --text-secondary: #5E6C84;
  --text-tertiary: #8993A4;
  --border-color: #EBECF0;
  --card-bg: #ffffff;
  --sidebar-bg: #0747A6;
  --sidebar-text: #ffffff;
  --input-bg: #ffffff;
  --shadow: rgba(9, 30, 66, 0.08);
}

/* 暗色模式 */
.dark {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-hover: rgba(255, 255, 255, 0.1);
  --text-primary: #eaeaea;
  --text-secondary: #b8b8b8;
  --text-tertiary: #a0a0a0;
  --border-color: #3a3a5a;
  --card-bg: #1f1f3a;
  --sidebar-bg: #0a0a1a;
  --sidebar-text: #eaeaea;
  --input-bg: #252545;
  --shadow: rgba(0, 0, 0, 0.3);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: var(--bg-secondary);
  color: var(--text-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
}

#app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.app {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.content-area {
  flex: 1;
  overflow: auto;
  background: var(--bg-secondary);
  min-width: 0;
  transition: background-color 0.3s ease;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

#app.has-bg .content-area { background: transparent !important; position: relative; }
#app.has-bg .content-area::before { content: ''; position: absolute; inset: 0; background: rgba(255,255,255,0.96); z-index: -1; }
.dark #app.has-bg .content-area::before { background: rgba(10,10,26,0.96); }
#app.has-bg .kanban-column { background: rgba(255,255,255,0.85); }
.dark #app.has-bg .kanban-column { background: rgba(10,10,26,0.85); }
#app.has-bg .sidebar { background: rgba(7,71,166,0.85) !important; }
.dark #app.has-bg .sidebar { background: rgba(10,10,26,0.9) !important; }
#app.has-bg .board-view, #app.has-bg .kanban-board { background: transparent; }

</style>
