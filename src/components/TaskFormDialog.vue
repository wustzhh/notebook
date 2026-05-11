<template>
  <el-dialog
    v-model="visible"
    title="新建任务"
    width="600px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="100px"
    >
      <el-form-item label="标题" prop="title">
        <el-input v-model="formData.title" placeholder="输入任务标题" />
      </el-form-item>

      <el-form-item label="描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="4"
          placeholder="输入任务描述"
        />
      </el-form-item>

      <el-form-item label="父任务">
        <el-select
          v-model="formData.parent_id"
          placeholder="选择父任务（可选）"
          clearable
          style="width: 100%"
        >
          <el-option
            v-for="task in parentTaskOptions"
            :key="task.id"
            :label="`${task.project_key}-${task.seq_number || task.id} ${task.title}`"
            :value="task.id"
          />
        </el-select>
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="状态" prop="status">
            <el-select v-model="formData.status" style="width: 100%">
              <el-option label="待办" value="todo" />
              <el-option label="进行中" value="in_progress" />
              <el-option label="审核中" value="review" />
              <el-option label="已完成" value="done" />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="优先级" prop="priority">
            <el-select v-model="formData.priority" style="width: 100%">
              <el-option label="低" value="low" />
              <el-option label="中" value="medium" />
              <el-option label="高" value="high" />
              <el-option label="紧急" value="critical" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="标签">
        <el-select
          v-model="formData.tagIds"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="输入标签名，回车新建"
          style="width: 100%"
          @remove-tag="handleRemoveTag"
        >
          <el-option
            v-for="tag in tagStore.tags"
            :key="tag.id"
            :label="tag.name"
            :value="tag.id"
          >
            <span class="tag-option">
              <span class="tag-dot" :style="{ background: tag.color }"></span>
              {{ tag.name }}
            </span>
          </el-option>
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useTaskStore } from '@/stores/taskStore'
import { useTagStore } from '@/stores/tagStore'
import { useUIStore } from '@/stores/uiStore'
import { useProjectStore } from '@/stores/projectStore'

const taskStore = useTaskStore()
const tagStore = useTagStore()
const uiStore = useUIStore()
const projectStore = useProjectStore()

const formRef = ref<FormInstance>()
const submitting = ref(false)

const visible = computed({
  get: () => uiStore.showCreateTaskDialog,
  set: (value) => {
    if (!value) uiStore.closeCreateTaskDialog()
  }
})

const formData = ref({
  title: '',
  description: '',
  parent_id: null as number | null,
  status: 'todo',
  priority: 'medium',
  tagIds: [] as number[]
})

const rules: FormRules = {
  title: [
    { required: true, message: '请输入任务标题', trigger: 'blur' },
    { min: 1, max: 200, message: '长度在 1 到 200 个字符', trigger: 'blur' }
  ]
}

// 父任务选项：当前项目下的所有父任务
const parentTaskOptions = computed(() => {
  return taskStore.parentTasks.filter(t => t.project_id === projectStore.currentProjectId)
})

function resetForm() {
  formData.value = {
    title: '',
    description: '',
    parent_id: null,
    status: 'todo',
    priority: 'medium',
    tagIds: []
  }
  formRef.value?.clearValidate()
}

function handleRemoveTag(tagId: number) {
  // Remove tag from selection (handled by el-select internally)
}

async function handleSubmit() {
  if (!formRef.value) return

  // 去重并收集标签
  const uniqueTagIds = [...new Set(formData.value.tagIds)]
  const resolvedTagIds: number[] = []
  for (const id of uniqueTagIds) {
    if (typeof id === 'string') {
      // 检查是否已有同名标签
      const existing = tagStore.tags.find(t => t.name === id)
      if (existing) {
        resolvedTagIds.push(existing.id)
      } else {
        const tag = await tagStore.createTag(id, '#409EFF')
        if (tag) resolvedTagIds.push(tag.id)
      }
    } else {
      resolvedTagIds.push(id)
    }
  }

  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      const newTask = await taskStore.createTask({
        title: formData.value.title,
        description: formData.value.description || '',
        project_id: projectStore.currentProjectId,
        parent_id: formData.value.parent_id,
        status: formData.value.status,
        priority: formData.value.priority
      })
      if (newTask && resolvedTagIds.length > 0) {
        await tagStore.setTaskTags(newTask.id, resolvedTagIds)
      }
      ElMessage.success('任务创建成功')
      handleClose()
    } catch (error: any) {
      ElMessage.error(error.message || '操作失败')
    } finally {
      submitting.value = false
    }
  })
}

function handleClose() {
  uiStore.closeCreateTaskDialog()
  resetForm()
}

watch(visible, (val) => {
  if (val) {
    tagStore.loadProjectTags(projectStore.currentProjectId)
  }
})
</script>
