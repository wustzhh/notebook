<template>
  <div class="sidebar" :class="{ collapsed: uiStore.sidebarCollapsed }">
    <div class="sidebar-header">
      <h2 v-if="!uiStore.sidebarCollapsed">Task Tracker</h2>
      <h2 v-else>TT</h2>
    </div>

    <div class="sidebar-content">
      <div class="section">
        <div class="section-header">
          <span v-if="!uiStore.sidebarCollapsed">项目</span>
          <el-button
            v-if="!uiStore.sidebarCollapsed"
            type="primary"
            link
            size="small"
            @click="uiStore.openCreateProjectDialog"
          >
            <el-icon><Plus /></el-icon>
          </el-button>
        </div>

        <el-menu
          :default-active="projectStore.currentProjectId?.toString()"
          class="project-menu"
        >
          <el-menu-item
            v-for="project in projectStore.projects"
            :key="project.id"
            :index="project.id.toString()"
            @click="handleProjectClick(project.id)"
          >
            <span
              class="project-color"
              :style="{ backgroundColor: project.color }"
            ></span>
            <span v-if="!uiStore.sidebarCollapsed">{{ project.name }}</span>
          </el-menu-item>
        </el-menu>
      </div>

      <div class="section">
        <div class="section-header">
          <span v-if="!uiStore.sidebarCollapsed">导航</span>
        </div>

        <el-menu
          :default-active="activeRoute"
          class="nav-menu"
          router
        >
          <el-menu-item index="/board">
            <el-icon><Grid /></el-icon>
            <span v-if="!uiStore.sidebarCollapsed">看板</span>
          </el-menu-item>
          <el-menu-item index="/list">
            <el-icon><List /></el-icon>
            <span v-if="!uiStore.sidebarCollapsed">列表</span>
          </el-menu-item>
          <el-menu-item index="/settings">
            <el-icon><Setting /></el-icon>
            <span v-if="!uiStore.sidebarCollapsed">设置</span>
          </el-menu-item>
        </el-menu>
      </div>
    </div>

    <div class="sidebar-footer">
      <el-button
        link
        @click="uiStore.toggleSidebar"
      >
        <el-icon>
          <component :is="uiStore.sidebarCollapsed ? 'Expand' : 'Fold'" />
        </el-icon>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProjectStore } from '@/stores/projectStore'
import { useUIStore } from '@/stores/uiStore'
import { Plus, Grid, List, Setting, Fold, Expand } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const projectStore = useProjectStore()
const uiStore = useUIStore()

const activeRoute = computed(() => route.path)

function handleProjectClick(projectId: number) {
  projectStore.setCurrentProject(projectId)
}
</script>

<style scoped>
.sidebar {
  width: 220px;
  min-width: 60px;
  height: 100vh;
  background: var(--sidebar-bg);
  color: var(--sidebar-text);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease, background-color 0.3s ease, color 0.3s ease;
  flex-shrink: 0;
}

.sidebar.collapsed {
  width: 60px;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
}

.section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px 8px;
  font-size: 12px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
}

.project-menu,
.nav-menu {
  background: transparent;
  border: none;
}

:deep(.el-menu-item) {
  color: rgba(255, 255, 255, 0.8);
  height: 40px;
  line-height: 40px;
}

:deep(.el-menu-item:hover),
:deep(.el-menu-item.is-active) {
  background: rgba(255, 255, 255, 0.1) !important;
  color: white;
}

.project-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  margin-right: 8px;
  display: inline-block;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: flex-end;
}

:deep(.el-button) {
  color: rgba(255, 255, 255, 0.8);
}

:deep(.el-button:hover) {
  color: white;
}
</style>
