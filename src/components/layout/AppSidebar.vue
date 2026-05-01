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

        <div v-if="projectStore.activeProjects.length === 0 && projectStore.completedProjects.length === 0" class="empty-hint">
          <span v-if="!uiStore.sidebarCollapsed">暂无项目</span>
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
              <span
                class="project-color"
                :style="{ backgroundColor: project.color }"
              ></span>
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
                    <el-dropdown-item command="complete">
                      <el-icon><Select /></el-icon>标记为完成
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided>
                      <el-icon><Delete /></el-icon>删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </el-menu-item>
          </el-menu>
        </template>

        <template v-if="projectStore.completedProjects.length > 0">
          <div v-if="!uiStore.sidebarCollapsed" class="group-label completed-label">已完成</div>
          <el-menu
            :default-active="projectStore.currentProjectId?.toString()"
            class="project-menu"
          >
            <el-menu-item
              v-for="project in projectStore.completedProjects"
              :key="project.id"
              :index="project.id.toString()"
              @click="handleProjectClick(project.id)"
              class="project-item completed"
            >
              <span class="project-color completed-color">
                <el-icon><Check /></el-icon>
              </span>
              <span v-if="!uiStore.sidebarCollapsed" class="project-name completed-text">{{ project.name }}</span>
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
                    <el-dropdown-item command="reactivate">
                      <el-icon><Refresh /></el-icon>重新激活
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided>
                      <el-icon><Delete /></el-icon>删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </el-menu-item>
          </el-menu>
        </template>
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
          <el-menu-item index="/board" @click="uiStore.closeTaskDetail()">
            <el-icon><Grid /></el-icon>
            <span v-if="!uiStore.sidebarCollapsed">看板</span>
          </el-menu-item>
          <el-menu-item index="/list" @click="uiStore.closeTaskDetail()">
            <el-icon><List /></el-icon>
            <span v-if="!uiStore.sidebarCollapsed">列表</span>
          </el-menu-item>
          <el-menu-item index="/settings" @click="uiStore.closeTaskDetail()">
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
import { ElMessageBox, ElMessage } from 'element-plus'
import { useProjectStore } from '@/stores/projectStore'
import { useUIStore } from '@/stores/uiStore'
import type { Project } from '@/types/project'
import { Plus, Grid, List, Setting, Fold, Expand, MoreFilled, Select, Delete, Refresh, Check } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const projectStore = useProjectStore()
const uiStore = useUIStore()

const activeRoute = computed(() => route.path)

function handleProjectClick(projectId: number) {
  projectStore.setCurrentProject(projectId)
  uiStore.closeTaskDetail()
}

function handleCommand(command: string, project: Project) {
  if (command === 'complete' || command === 'reactivate') {
    projectStore.toggleProjectStatus(project.id)
  } else if (command === 'delete') {
    confirmDelete(project)
  }
}

function confirmDelete(project: Project) {
  ElMessageBox.confirm(
    `确定要删除项目「${project.name}」吗？该项目下的所有任务也将被删除。`,
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    await projectStore.deleteProject(project.id)
    ElMessage.success(`项目「${project.name}」已删除`)
  }).catch(() => {
    // 取消删除
  })
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

.group-label {
  padding: 4px 16px 2px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.completed-label {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.empty-hint {
  padding: 16px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
}

.project-menu,
.nav-menu {
  background: transparent;
  border: none;
}

.project-item {
  display: flex;
  align-items: center;
}

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

.project-actions:hover {
  color: rgba(255, 255, 255, 0.9);
}

.el-menu-item:hover .project-actions {
  opacity: 1;
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
  flex-shrink: 0;
}

.project-item.completed {
  opacity: 0.6;
}

.project-item.completed:hover {
  opacity: 1;
}

.completed-color {
  background: transparent !important;
  border: 1.5px solid rgba(255, 255, 255, 0.3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  width: 12px;
  height: 12px;
}

.completed-text {
  text-decoration: line-through;
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
