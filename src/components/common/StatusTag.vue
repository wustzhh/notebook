<template>
  <el-tag :type="statusType" size="small" effect="plain">
    {{ statusLabel }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: string
}>()

const statusType = computed(() => {
  const map: Record<string, string> = {
    todo: 'info',
    in_progress: 'warning',
    review: 'primary',
    done: 'success'
  }
  return map[props.status] || ''
})

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    todo: '待办',
    in_progress: '进行中',
    review: '审核中',
    done: '已完成'
  }
  return map[props.status] || props.status
})
</script>
