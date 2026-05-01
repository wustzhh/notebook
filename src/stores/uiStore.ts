import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useTaskStore } from './taskStore'

export const useUIStore = defineStore('ui', () => {
  const taskStore = useTaskStore()

  // State
  const sidebarCollapsed = ref(false)
  const viewMode = ref<'board' | 'list'>((localStorage.getItem('view_mode') as 'board' | 'list') || 'board')
  const showCreateTaskDialog = ref(false)
  const showCreateProjectDialog = ref(false)
  const selectedTaskId = ref<number | null>(null)
  const searchQuery = ref('')
  const filterStatus = ref<string>('all')
  const filterPriority = ref<string>('all')

  // Computed
  const viewingTask = computed(() => {
    if (selectedTaskId.value === null) return null
    return taskStore.tasks.find(t => t.id === selectedTaskId.value) || null
  })

  // Actions
  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setViewMode(mode: 'board' | 'list') {
    viewMode.value = mode
    localStorage.setItem('view_mode', mode)
  }

  function openCreateTaskDialog() {
    showCreateTaskDialog.value = true
  }

  function closeCreateTaskDialog() {
    showCreateTaskDialog.value = false
  }

  function openTaskDetail(taskId: number) {
    selectedTaskId.value = taskId
  }

  function closeTaskDetail() {
    selectedTaskId.value = null
  }

  function openCreateProjectDialog() {
    showCreateProjectDialog.value = true
  }

  function closeCreateProjectDialog() {
    showCreateProjectDialog.value = false
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function setFilterStatus(status: string) {
    filterStatus.value = status
  }

  function setFilterPriority(priority: string) {
    filterPriority.value = priority
  }

  function resetFilters() {
    searchQuery.value = ''
    filterStatus.value = 'all'
    filterPriority.value = 'all'
  }

  return {
    sidebarCollapsed,
    viewMode,
    showCreateTaskDialog,
    showCreateProjectDialog,
    selectedTaskId,
    viewingTask,
    searchQuery,
    filterStatus,
    filterPriority,
    toggleSidebar,
    setViewMode,
    openCreateTaskDialog,
    closeCreateTaskDialog,
    openTaskDetail,
    closeTaskDetail,
    openCreateProjectDialog,
    closeCreateProjectDialog,
    setSearchQuery,
    setFilterStatus,
    setFilterPriority,
    resetFilters
  }
})
