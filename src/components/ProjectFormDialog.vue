<template>
  <el-dialog
    v-model="visible"
    title="新建项目"
    width="500px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="100px"
    >
      <el-form-item label="项目名称" prop="name">
        <el-input v-model="formData.name" placeholder="输入项目名称" />
      </el-form-item>

      <el-form-item label="项目标识" prop="key">
        <el-input
          v-model="formData.key"
          placeholder="例如: PROJ"
          maxlength="10"
          show-word-limit
        />
        <p class="hint">用于生成任务编号，如 PROJ-123</p>
      </el-form-item>

      <el-form-item label="颜色">
        <el-color-picker v-model="formData.color" />
      </el-form-item>

      <el-form-item label="描述">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="输入项目描述"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        创建
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useProjectStore } from '@/stores/projectStore'
import { useUIStore } from '@/stores/uiStore'

const projectStore = useProjectStore()
const uiStore = useUIStore()

const formRef = ref<FormInstance>()
const submitting = ref(false)

const visible = computed({
  get: () => uiStore.showCreateProjectDialog,
  set: (value) => {
    if (!value) uiStore.closeCreateProjectDialog()
  }
})

const formData = ref({
  name: '',
  key: '',
  color: '#4A90D9',
  description: ''
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入项目名称', trigger: 'blur' }
  ],
  key: [
    { required: true, message: '请输入项目标识', trigger: 'blur' },
    { pattern: /^[A-Z]+$/, message: '只能包含大写字母', trigger: 'blur' }
  ]
}

function handleClose() {
  uiStore.closeCreateProjectDialog()
  resetForm()
}

function resetForm() {
  formData.value = {
    name: '',
    key: '',
    color: '#4A90D9',
    description: ''
  }
  formRef.value?.clearValidate()
}

async function handleSubmit() {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      await projectStore.createProject(formData.value)
      ElMessage.success('项目创建成功')
      handleClose()
    } catch (error: any) {
      ElMessage.error(error.message || '创建失败')
    } finally {
      submitting.value = false
    }
  })
}
</script>

<style scoped>
.hint {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: var(--text-tertiary);
  transition: color 0.3s ease;
}
</style>
