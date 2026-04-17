<template>
  <div v-if="task" class="task-detail-panel">
    <div class="panel-header">
      <h3>任务详情</h3>
      <el-button text :icon="Close" @click="handleClose" />
    </div>

    <div class="panel-body">
      <!-- ID (只读) -->
      <div class="field-group">
        <label>ID</label>
        <p class="value">{{ task.project_key }}-{{ task.id }}</p>
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

      <!-- 优先级 (可编辑) -->
      <div class="field-group" :class="{ editing: editingField === 'priority' }">
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

      <!-- 开始日期 (可编辑) -->
      <div class="field-group" :class="{ editing: editingField === 'start_date' }">
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

      <!-- 截止日期 (可编辑) -->
      <div class="field-group" :class="{ editing: editingField === 'end_date' }">
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

      <!-- 描述 (可编辑) -->
      <div class="field-group" :class="{ editing: editingField === 'description' }">
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

    <div class="panel-footer">
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
import { Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUIStore } from '@/stores/uiStore'
import { useTaskStore } from '@/stores/taskStore'
import StatusTag from '@/components/common/StatusTag.vue'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import type { Task } from '@/types/task'

const uiStore = useUIStore()
const taskStore = useTaskStore()

const task = computed(() => uiStore.viewingTask)

const editingField = ref<string | null>(null)
const editForm = ref<Partial<Task>>({})

const titleInputRef = ref()
const descInputRef = ref()

// 监听任务切换，重置编辑状态
watch(task, () => {
  editingField.value = null
  editForm.value = {}
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

.panel-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
  justify-content: flex-end;
  transition: border-color 0.3s ease;
}
</style>
