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
        </div>

        <div v-if="projectStore.projects.length === 0 && !uiStore.sidebarCollapsed" class="empty-hint">
          暂无项目，点击下方 + 创建
        </div>

        <template v-if="projectStore.activeProjects.length > 0">
          <div v-if="!uiStore.sidebarCollapsed" class="group-label">活跃</div>
          <el-menu
            :default-active="projectStore.currentProjectId?.toString()"
            class="project-menu"
          >
            <el-menu-item
              v-for="project in projectStore.activeProjects"
              :key="project.id"
              :index="project.id.toString()"
              @click="handleProjectClick(project.id)"
              class="project-item"
            >
              <span class="project-color" :style="{ backgroundColor: project.color }"></span>
              <span v-if="!uiStore.sidebarCollapsed" class="project-name">{{ project.name }}</span>
              <el-dropdown
                v-if="!uiStore.sidebarCollapsed"
                trigger="click"
                @command="(cmd: string) => handleCommand(cmd, project)"
                @click.stop
              >
                <span class="project-actions" @click.stop>
                  <el-icon><MoreFilled /></el-icon>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="complete"><el-icon><Select /></el-icon>标记为完成</el-dropdown-item>
                    <el-dropdown-item command="delete" divided><el-icon><Delete /></el-icon>删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </el-menu-item>
          </el-menu>
        </template>

        <div
          v-if="projectStore.completedProjects.length > 0 && !uiStore.sidebarCollapsed"
          class="completed-toggle"
          @click="showCompleted = !showCompleted"
        >
          <el-icon><component :is="showCompleted ? 'ArrowDown' : 'ArrowRight'" /></el-icon>
          <span>已完成 ({{ projectStore.completedProjects.length }})</span>
        </div>

        <el-menu
          v-if="projectStore.completedProjects.length > 0 && showCompleted"
          class="project-menu"
        >
          <el-menu-item
            v-for="project in projectStore.completedProjects"
            :key="project.id"
            :index="project.id.toString()"
            @click="handleProjectClick(project.id)"
            class="project-item completed"
          >
            <span class="project-color completed-color"><el-icon><Check /></el-icon></span>
            <span v-if="!uiStore.sidebarCollapsed" class="project-name completed-text">{{ project.name }}</span>
            <el-dropdown
              v-if="!uiStore.sidebarCollapsed"
              trigger="click"
              @command="(cmd: string) => handleCommand(cmd, project)"
              @click.stop
            >
              <span class="project-actions" @click.stop><el-icon><MoreFilled /></el-icon></span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="reactivate"><el-icon><Refresh /></el-icon>重新激活</el-dropdown-item>
                  <el-dropdown-item command="delete" divided><el-icon><Delete /></el-icon>删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </el-menu-item>
        </el-menu>

        <el-button
          v-if="!uiStore.sidebarCollapsed"
          class="new-project-btn"
          link
          @click="uiStore.openCreateProjectDialog"
        >
          <el-icon><Plus /></el-icon> 新建项目
        </el-button>
      </div>
    </div>

    <div class="sidebar-bottom">
      <el-button
        link
        class="settings-btn"
        :class="{ active: route.path === '/settings' }"
        @click="router.push('/settings')"
      >
        <el-icon><Setting /></el-icon>
        <span v-if="!uiStore.sidebarCollapsed" class="settings-text">设置</span>
      </el-button>

      <el-button link class="collapse-btn" @click="uiStore.toggleSidebar">
        <el-icon><component :is="uiStore.sidebarCollapsed ? 'Expand' : 'Fold'" /></el-icon>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useProjectStore } from '@/stores/projectStore'
import { useUIStore } from '@/stores/uiStore'
import type { Project } from '@/types/project'
import { Plus, Setting, Fold, Expand, MoreFilled, Select, Delete, Refresh, Check, ArrowDown, ArrowRight } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const projectStore = useProjectStore()
const uiStore = useUIStore()

const showCompleted = ref(false)

function handleProjectClick(projectId: number) {
  projectStore.setCurrentProject(projectId)
  uiStore.closeTaskDetail()
  if (route.path !== '/') router.push('/')
}

function handleCommand(command: string, project: Project) {
  if (command === 'complete' || command === 'reactivate') {
    projectStore.toggleProjectStatus(project.id)
  } else if (command === 'delete') {
    ElMessageBox.confirm(
      `确定要删除项目「${project.name}」吗？该项目下的所有任务也将被删除。`,
      '确认删除',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    ).then(async () => {
      await projectStore.deleteProject(project.id)
      ElMessage.success(`项目「${project.name}」已删除`)
    }).catch(() => {})
  }
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

.sidebar.collapsed { width: 60px; }

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-header h2 { margin: 0; font-size: 20px; font-weight: 600; }

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
}

.section { margin-bottom: 8px; }

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

.group-label {
  padding: 4px 16px 2px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
}

.completed-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: color 0.15s;
}

.completed-toggle:hover { color: rgba(255, 255, 255, 0.7); }

.empty-hint {
  padding: 16px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
}

.project-menu,
.nav-menu { background: transparent; border: none; }

.project-item { display: flex; align-items: center; }

.project-item .project-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-actions {
  opacity: 0;
  transition: opacity 0.15s;
  display: flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  margin-left: auto;
  padding: 0 4px;
}

.project-actions:hover { color: rgba(255, 255, 255, 0.9); }

.el-menu-item:hover .project-actions { opacity: 1; }

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
  width: 12px; height: 12px; border-radius: 2px;
  margin-right: 8px; display: inline-block; flex-shrink: 0;
}

.project-item.completed { opacity: 0.6; }
.project-item.completed:hover { opacity: 1; }

.completed-color {
  background: transparent !important;
  border: 1.5px solid rgba(255, 255, 255, 0.3);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 8px; width: 12px; height: 12px;
}

.completed-text { text-decoration: line-through; }

.new-project-btn {
  width: 100%;
  padding: 8px 16px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  justify-content: flex-start;
  gap: 6px;
}

.new-project-btn:hover { color: rgba(255, 255, 255, 0.9); }

.sidebar-bottom {
  display: flex;
  flex-direction: column;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px;
  gap: 4px;
}

.settings-btn {
  color: rgba(255, 255, 255, 0.5);
  justify-content: flex-start;
  padding: 8px 12px;
  gap: 8px;
  font-size: 14px;
}

.settings-btn:hover,
.settings-btn.active { color: white; background: rgba(255, 255, 255, 0.1); border-radius: 6px; }

.settings-text { font-size: 14px; }

.collapse-btn {
  color: rgba(255, 255, 255, 0.5);
  justify-content: flex-end;
  padding: 8px 12px;
}

.collapse-btn:hover { color: white; }

:deep(.el-button) { color: rgba(255, 255, 255, 0.8); }
:deep(.el-button:hover) { color: white; }
</style>
