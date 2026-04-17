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

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="开始日期">
            <el-date-picker
              v-model="formData.start_date"
              type="date"
              placeholder="选择日期"
              style="width: 100%"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="截止日期">
            <el-date-picker
              v-model="formData.end_date"
              type="date"
              placeholder="选择日期"
              style="width: 100%"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
        </el-col>
      </el-row>
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
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useTaskStore } from '@/stores/taskStore'
import { useUIStore } from '@/stores/uiStore'
import { useProjectStore } from '@/stores/projectStore'

const taskStore = useTaskStore()
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
  status: 'todo',
  priority: 'medium',
  start_date: null as string | null,
  end_date: null as string | null
})

const rules: FormRules = {
  title: [
    { required: true, message: '请输入任务标题', trigger: 'blur' },
    { min: 1, max: 200, message: '长度在 1 到 200 个字符', trigger: 'blur' }
  ]
}

function resetForm() {
  formData.value = {
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    start_date: null,
    end_date: null
  }
  formRef.value?.clearValidate()
}

function handleClose() {
  uiStore.closeCreateTaskDialog()
  resetForm()
}

async function handleSubmit() {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      await taskStore.createTask({
        ...formData.value,
        project_id: projectStore.currentProjectId
      })
      ElMessage.success('任务创建成功')
      handleClose()
    } catch (error: any) {
      ElMessage.error(error.message || '操作失败')
    } finally {
      submitting.value = false
    }
  })
}
</script>
