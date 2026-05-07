<template>
  <div v-if="task" class="task-detail-panel">
    <div class="panel-header">
      <div class="panel-tabs">
        <button class="tab-btn" :class="{ active: activeTab === 'detail' }" @click="activeTab = 'detail'">详情</button>
        <button class="tab-btn" :class="{ active: activeTab === 'activity' }" @click="activeTab = 'activity'; loadLogs()">活动 <span v-if="logCount" class="tab-badge">{{ logCount }}</span></button>
      </div>
      <el-button text :icon="Close" @click="handleClose" />
    </div>

    <div class="panel-body" v-if="activeTab === 'detail'">
      <!-- ID (只读) -->
      <div class="field-group">
        <label>ID</label>
        <p class="value">{{ task.project_key }}-{{ task.seq_assigned ? task.seq_number : '?' }}</p>
      </div>

      <!-- 父任务信息 -->
      <div v-if="task.parent_id" class="field-group">
        <label>父任务</label>
        <p class="value parent-link clickable" @click="openParentTask">
          {{ parentTask.project_key }}-{{ parentTask.seq_assigned ? parentTask.seq_number : '?' }} {{ parentTask.title }}
        </p>
      </div>

      <!-- 标题 (可编辑) -->
      <div class="field-group" :class="{ editing: editingField === 'title' }">
        <label @click="startEdit('title')">标题</label>
        <template v-if="editingField === 'title'">
          <el-input
            ref="titleInputRef"
            v-model="editForm.title"
            @blur="saveField('title')"
            @keyup.enter="saveField('title')"
            size="default"
          />
        </template>
        <p v-else class="value clickable" @click="startEdit('title')">{{ task.title }}</p>
      </div>

      <!-- 状态 (可编辑) -->
      <div class="field-group" :class="{ editing: editingField === 'status' }">
        <label @click="startEdit('status')">状态</label>
        <template v-if="editingField === 'status'">
          <el-select v-model="editForm.status" @change="saveField('status')" size="default">
            <el-option label="待办" value="todo" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="审核中" value="review" />
            <el-option label="已完成" value="done" />
          </el-select>
        </template>
        <span v-else class="clickable" @click="startEdit('status')">
          <StatusTag :status="task.status" />
        </span>
      </div>

      <!-- 优先级 (可编辑) - 仅父任务显示 -->
      <div v-if="!isSubtask" class="field-group" :class="{ editing: editingField === 'priority' }">
        <label @click="startEdit('priority')">优先级</label>
        <template v-if="editingField === 'priority'">
          <el-select v-model="editForm.priority" @change="saveField('priority')" size="default">
            <el-option label="低" value="low" />
            <el-option label="中" value="medium" />
            <el-option label="高" value="high" />
            <el-option label="紧急" value="critical" />
          </el-select>
        </template>
        <span v-else class="clickable" @click="startEdit('priority')">
          <PriorityBadge :priority="task.priority" />
        </span>
      </div>

      <!-- 标签 (可编辑) -->
      <div v-if="!isSubtask" class="field-group">
        <label>标签</label>
        <div class="tags-row">
          <span v-for="tag in taskTags" :key="tag.id" class="tag-chip" :style="{ background: tag.color + '22', color: tag.color, borderColor: tag.color + '55' }">
            {{ tag.name }}<el-icon class="tag-remove" @click.stop="removeTagFromTask(tag.id)"><Close /></el-icon>
          </span>
          <el-select v-model="newTagIds" multiple filterable allow-create default-first-option placeholder="+ 标签" size="small" class="inline-tag-picker" @change="handleAddTag" @remove-tag="handleRemoveTaskTag">
            <el-option v-for="t in availableTags" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </div>
      </div>

      <!-- 开始日期 (可编辑) - 仅父任务显示 -->
      <div v-if="!isSubtask" class="field-group" :class="{ editing: editingField === 'start_date' }">
        <label @click="startEdit('start_date')">开始日期</label>
        <template v-if="editingField === 'start_date'">
          <el-date-picker
            v-model="editForm.start_date"
            type="date"
            placeholder="选择日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="saveField('start_date')"
            size="default"
          />
        </template>
        <p v-else class="value clickable" @click="startEdit('start_date')">{{ task.start_date || '-' }}</p>
      </div>

      <!-- 截止日期 (可编辑) - 仅父任务显示 -->
      <div v-if="!isSubtask" class="field-group" :class="{ editing: editingField === 'end_date' }">
        <label @click="startEdit('end_date')">截止日期</label>
        <template v-if="editingField === 'end_date'">
          <el-date-picker
            v-model="editForm.end_date"
            type="date"
            placeholder="选择日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="saveField('end_date')"
            size="default"
          />
        </template>
        <p v-else class="value clickable" @click="startEdit('end_date')">{{ task.end_date || '-' }}</p>
      </div>

      <!-- 描述 (可编辑) - 仅父任务显示 -->
      <div v-if="!isSubtask" class="field-group" :class="{ editing: editingField === 'description' }">
        <label @click="startEdit('description')">描述</label>
        <template v-if="editingField === 'description'">
          <el-input
            ref="descInputRef"
            v-model="editForm.description"
            type="textarea"
            :rows="4"
            @blur="saveField('description')"
            size="default"
          />
        </template>
        <p v-else class="value description clickable" @click="startEdit('description')">
          {{ task.description || '暂无描述' }}
        </p>
      </div>

      <!-- 子任务区域 - 仅父任务显示 -->
      <div v-if="!isSubtask" class="field-group subtask-section">
        <div class="subtask-header">
          <label>子任务</label>
          <span class="subtask-count">{{ subtasks.length }}</span>
        </div>

        <!-- 子任务列表 -->
        <div v-if="subtasks.length > 0" class="subtask-list">
          <div
            v-for="subtask in subtasks"
            :key="subtask.id"
            class="subtask-item"
            :class="{ done: subtask.status === 'done' }"
          >
            <el-checkbox
              :model-value="subtask.status === 'done'"
              @change="(val) => toggleSubtaskDone(subtask.id, val as boolean)"
            />
            <span class="subtask-key">{{ task.project_key }}-{{ subtask.seq_assigned ? subtask.seq_number : '?' }}</span>
            <span class="subtask-title" @click="openSubtaskDetail(subtask.id)">{{ subtask.title }}</span>
            <StatusTag :status="subtask.status" size="small" />
          </div>
        </div>

        <!-- 添加子任务 -->
        <div class="subtask-add">
          <template v-if="!showAddSubtask">
            <el-button link type="primary" size="small" @click="showAddSubtask = true">
              <el-icon><Plus /></el-icon>
              添加子任务
            </el-button>
          </template>
          <div v-else class="subtask-form">
            <el-input
              ref="subtaskInputRef"
              v-model="newSubtaskTitle"
              placeholder="输入子任务标题"
              size="small"
              @keyup.enter="handleAddSubtask"
              @blur="cancelAddSubtask"
            />
          </div>
        </div>

        <!-- 总进度 -->
        <div v-if="subtasks.length > 0" class="subtask-summary">
          <span class="summary-label">总进度</span>
          <el-progress
            :percentage="subtaskProgress.percent"
            :stroke-width="6"
            :show-text="false"
            :color="subtaskProgressColor"
          />
          <span class="summary-text">{{ subtaskProgress.done }}/{{ subtaskProgress.total }}</span>
        </div>
      </div>

      <!-- 时间信息 (只读) -->
      <div class="field-group">
        <label>创建时间</label>
        <p class="value">{{ formatDateTime(task.created_at) }}</p>
      </div>
      <div class="field-group">
        <label>更新时间</label>
        <p class="value">{{ formatDateTime(task.updated_at) }}</p>
      </div>
    </div>

    <!-- 活动日志 tab -->
    <div class="panel-body" v-if="activeTab === 'activity'">
      <div v-if="taskLogs.length === 0 && !logLoading" class="empty-logs">暂无活动记录</div>
      <div v-if="logLoading" class="empty-logs">加载中...</div>
      <div v-for="log in taskLogs" :key="log.id" class="log-item">
        <span class="log-time">{{ formatLogTime(log.created_at) }}</span>
        <template v-if="log.type === 'comment' && editingLogId === log.id">
          <el-input v-model="editingLogContent" size="small" @blur="saveEditLog(log)" @keyup.enter="saveEditLog(log)" />
        </template>
        <span v-else class="log-content" @dblclick="startEditLog(log)">{{ log.content }}</span>
        <span v-if="log.type === 'comment'" class="log-type-badge comment">评论</span>
        <el-button v-if="log.type === 'comment'" link size="small" class="log-delete" @click="handleDeleteLog(log)"><el-icon><Close /></el-icon></el-button>
      </div>
      <div class="comment-box">
        <el-input v-model="commentText" placeholder="添加评论..." size="small" @keyup.enter="sendComment">
          <template #suffix>
            <el-button text size="small" @click="sendComment">发送</el-button>
          </template>
        </el-input>
      </div>
    </div>

    <div class="panel-footer" v-if="activeTab === 'detail'">
      <el-popconfirm title="确定删除此任务？" @confirm="handleDelete">
        <template #reference>
          <el-button type="danger">删除</el-button>
        </template>
      </el-popconfirm>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import dayjs from 'dayjs'
import { Close, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUIStore } from '@/stores/uiStore'
import { useTaskStore } from '@/stores/taskStore'
import { useTagStore } from '@/stores/tagStore'
import { useLogStore } from '@/stores/logStore'
import StatusTag from '@/components/common/StatusTag.vue'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import type { Task } from '@/types/task'

const uiStore = useUIStore()
const taskStore = useTaskStore()
const tagStore = useTagStore()
const logStore = useLogStore()

const task = computed(() => uiStore.viewingTask)
const isSubtask = computed(() => task.value?.parent_id !== null)
const activeTab = ref<'detail' | 'activity'>('detail')
const commentText = ref('')
const logLoading = ref(false)
const newTagIds = ref<number[]>([])
const editingLogId = ref<number | null>(null)
const editingLogContent = ref('')

// 直接访问 taskStore.tasks 以确保响应式追踪
const subtasks = computed(() => {
  if (!task.value) return []
  return taskStore.tasks
    .filter(t => t.parent_id === task.value!.id)
    .sort((a, b) => a.position - b.position)
})

const subtaskProgress = computed(() => {
  if (!task.value) return { done: 0, total: 0, percent: 0 }
  const subtasksVal = subtasks.value
  const total = subtasksVal.length
  const done = subtasksVal.filter(t => t.status === 'done').length
  return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 }
})

const parentTask = computed(() => task.value?.parent_id ? taskStore.tasks.find(t => t.id === task.value!.parent_id) : null)

const subtaskProgressColor = computed(() => {
  if (subtaskProgress.value.percent === 100) return '#67c23a'
  if (subtaskProgress.value.percent > 0) return '#409eff'
  return '#909399'
})

// 标签
const taskTags = computed(() => task.value ? tagStore.getTaskTags(task.value.id) : [])
const availableTags = computed(() => {
  if (!task.value) return tagStore.tags
  const used = taskTags.value.map(t => t.id)
  return tagStore.tags.filter(t => t.project_id === task.value!.project_id && !used.includes(t.id))
})
const logCount = computed(() => task.value ? (logStore.logs[task.value.id]?.length || 0) : 0)
const taskLogs = computed(() => task.value ? logStore.getTaskLogs(task.value.id) : [])

async function loadLogs() {
  if (!task.value) return
  logLoading.value = true
  await logStore.loadTaskLogs(task.value.id)
  logLoading.value = false
}

async function sendComment() {
  if (!task.value || !commentText.value.trim()) return
  await logStore.appendLog(task.value.id, { task_id: task.value.id, type: 'comment', content: commentText.value.trim() })
  try { const { useSyncStore } = require('@/stores/syncStore') || await import('@/stores/syncStore'); useSyncStore().incrementDirty() } catch {}
  commentText.value = ''
}

function startEditLog(log: any) {
  editingLogId.value = log.id
  editingLogContent.value = log.content
}

async function saveEditLog(log: any) {
  if (editingLogContent.value.trim()) {
    await logStore.updateLog(log.id, log.task_id, editingLogContent.value.trim())
    log.content = editingLogContent.value.trim()
  }
  editingLogId.value = null
}

async function handleDeleteLog(log: any) {
  await logStore.deleteLog(log.id, log.task_id)
  try { const { useSyncStore } = require('@/stores/syncStore') || await import('@/stores/syncStore'); useSyncStore().incrementDirty() } catch {}
}

function formatLogTime(iso: string) {
  if (!iso) return ''
  return dayjs(iso).format('MM-DD HH:mm')
}

async function handleAddTag(values: (number | string)[]) {
  if (!task.value) return
  // 从已有标签开始
  const ids: number[] = [...taskTags.value.map(t => t.id)]
  for (const v of values) {
    if (typeof v === 'string') {
      const tag = await tagStore.createTag(v, '#409EFF')
      if (tag) ids.push(tag.id)
    } else {
      ids.push(v)
    }
  }
  const unique = [...new Set(ids)]
  await tagStore.setTaskTags(task.value.id, unique)
  newTagIds.value = []
}

function handleRemoveTaskTag(tagId: number) {
  if (!task.value) return
  const currentIds = taskTags.value.map(t => t.id).filter(id => id !== tagId)
  tagStore.setTaskTags(task.value.id, currentIds)
}

async function removeTagFromTask(tagId: number) {
  handleRemoveTaskTag(tagId)
}

const editingField = ref<string | null>(null)
const editForm = ref<Partial<Task>>({})

const showAddSubtask = ref(false)
const newSubtaskTitle = ref('')
const subtaskInputRef = ref()

const titleInputRef = ref()
const descInputRef = ref()

// 监听任务切换，重置编辑状态
watch(task, () => {
  editingField.value = null
  editForm.value = {}
  showAddSubtask.value = false
  newSubtaskTitle.value = ''
  activeTab.value = 'detail'
  commentText.value = ''
  if (task.value) {
    tagStore.loadProjectTags(task.value.project_id)
    tagStore.loadTaskTags(task.value.id)
  }
})

// 监听显示添加子任务，自动聚焦
watch(showAddSubtask, (val) => {
  if (val) {
    nextTick(() => {
      subtaskInputRef.value?.focus()
    })
  }
})

function formatDateTime(date: string) {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'
}

function startEdit(field: string) {
  editingField.value = field
  // 初始化表单数据
  editForm.value = {
    title: task.value!.title,
    description: task.value!.description,
    status: task.value!.status,
    priority: task.value!.priority,
    start_date: task.value!.start_date,
    end_date: task.value!.end_date
  }

  // 自动聚焦
  nextTick(() => {
    if (field === 'title' && titleInputRef.value) {
      titleInputRef.value.focus()
    } else if (field === 'description' && descInputRef.value) {
      descInputRef.value.focus()
    }
  })
}

async function saveField(field: string) {
  if (!task.value || !editingField.value) return

  const value = (editForm.value as any)[field]
  const oldValue = (task.value as any)[field]

  if (value === oldValue) {
    editingField.value = null
    return
  }

  try {
    await taskStore.updateTask(task.value.id, { [field]: value } as any)
    ElMessage.success('已更新')
  } catch (e: any) {
    ElMessage.error(e.message || '更新失败')
  } finally {
    editingField.value = null
  }
}

function handleClose() {
  uiStore.closeTaskDetail()
}

async function handleDelete() {
  if (task.value) {
    await taskStore.deleteTask(task.value.id)
    uiStore.closeTaskDetail()
  }
}

// 子任务相关操作
async function toggleSubtaskDone(subtaskId: number, done: boolean) {
  try {
    await taskStore.toggleSubtaskDone(subtaskId, done)
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  }
}

async function handleAddSubtask() {
  if (!task.value || !newSubtaskTitle.value.trim()) return

  try {
    await taskStore.createSubtask(task.value.id, {
      title: newSubtaskTitle.value.trim()
    })
    newSubtaskTitle.value = ''
    showAddSubtask.value = false
    ElMessage.success('子任务已添加')
  } catch (e: any) {
    ElMessage.error(e.message || '添加失败')
  }
}

function cancelAddSubtask() {
  if (!newSubtaskTitle.value.trim()) {
    showAddSubtask.value = false
  }
}

function openSubtaskDetail(subtaskId: number) {
  uiStore.openTaskDetail(subtaskId)
}

function openParentTask() {
  if (parentTask.value) {
    uiStore.openTaskDetail(parentTask.value.id)
  }
}
</script>

<style scoped>
.task-detail-panel {
  width: 28%;
  min-width: 280px;
  height: 100%;
  background: var(--card-bg);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  transition: border-color 0.3s ease;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.field-group {
  margin-bottom: 20px;
}

.field-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin-bottom: 6px;
  transition: color 0.3s ease;
}

.field-group .value {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.5;
  transition: color 0.3s ease;
}

.field-group .value.description {
  color: var(--text-secondary);
  white-space: pre-wrap;
  transition: color 0.3s ease;
}

/* 父任务链接 */
.parent-link {
  color: var(--text-primary);
  text-decoration: none;
}

.parent-link:hover {
  color: var(--link-color, #409eff);
}

/* 可点击提示 */
.clickable {
  cursor: pointer;
  padding: 4px 8px;
  margin: -4px -8px;
  border-radius: 4px;
  transition: background 0.15s;
}

.clickable:hover {
  background: var(--bg-hover);
}

/* 编辑模式高亮 */
.field-group.editing {
  background: var(--bg-hover);
  margin: 0 -20px 20px;
  padding: 12px 20px;
  border-radius: 0;
  transition: background-color 0.3s ease;
}

.field-group.editing:first-child {
  border-radius: 4px 4px 0 0;
}

.field-group.editing:last-child {
  border-radius: 0 0 4px 4px;
}

/* 子任务区域 */
.subtask-section {
  background: var(--bg-secondary);
  margin: 0 -20px 20px;
  padding: 12px 20px;
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.subtask-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.subtask-header label {
  margin-bottom: 0;
}

.subtask-count {
  font-size: 11px;
  background: var(--bg-hover);
  color: var(--text-secondary);
  padding: 1px 6px;
  border-radius: 10px;
}

.subtask-list {
  margin-bottom: 8px;
}

.subtask-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-color);
  transition: border-color 0.3s ease;
}

.subtask-item:last-child {
  border-bottom: none;
}

.subtask-item.done .subtask-title {
  text-decoration: line-through;
  color: var(--text-tertiary);
}

.subtask-key {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.subtask-title {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subtask-title:hover {
  color: var(--link-color, #409eff);
}

.subtask-add {
  margin-bottom: 8px;
}

.subtask-form {
  margin-top: 4px;
}

.subtask-summary {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-label {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.summary-text {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
  min-width: 28px;
  text-align: right;
}

.subtask-summary :deep(.el-progress) {
  flex: 1;
}

.panel-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
  justify-content: flex-end;
  transition: border-color 0.3s ease;
}

.panel-tabs { display: flex; gap: 4px; }
.tab-btn {
  background: none; border: none; color: var(--text-secondary);
  padding: 6px 12px; font-size: 13px; cursor: pointer;
  border-radius: 6px; transition: all 0.15s;
}
.tab-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.tab-btn.active { background: var(--bg-hover); color: var(--text-primary); font-weight: 600; }
.tab-badge { font-size: 10px; background: var(--bg-hover); padding: 1px 5px; border-radius: 8px; margin-left: 4px; }

.tags-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.tag-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 4px; font-size: 12px;
  border: 1px solid;
}
.tag-remove { font-size: 10px; cursor: pointer; opacity: 0.6; }
.tag-remove:hover { opacity: 1; }

.inline-tag-picker { width: 100px; }
.inline-tag-picker :deep(.el-select__tags) { flex-wrap: nowrap; }

.empty-logs { text-align: center; color: var(--text-tertiary); padding: 40px 0; font-size: 13px; }
.log-item {
  padding: 10px 0; border-bottom: 1px solid var(--border-color);
  display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
}
.log-time { font-size: 11px; color: var(--text-tertiary); min-width: 70px; }
.log-content { flex: 1; font-size: 13px; color: var(--text-primary); cursor: default; }
.log-type-badge.comment { font-size: 10px; background: #409eff22; color: #409eff; padding: 1px 6px; border-radius: 8px; }
.log-delete { opacity: 0; transition: opacity 0.15s; color: var(--text-tertiary); }
.log-item:hover .log-delete { opacity: 1; }
.log-delete:hover { color: #f56c6c; }
.comment-box { margin-top: 12px; }
</style>
