<template>
  <el-tag :type="priorityType" size="small" effect="light">
    {{ priorityLabel }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  priority: string
}>()

const priorityType = computed(() => {
  const map: Record<string, string> = {
    low: 'info',
    medium: '',
    high: 'warning',
    critical: 'danger'
  }
  return map[props.priority] || ''
})

const priorityLabel = computed(() => {
  const map: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '紧急'
  }
  return map[props.priority] || props.priority
})
</script>
