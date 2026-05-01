import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './authStore'
import { useProjectStore } from './projectStore'
import { useTaskStore } from './taskStore'
import { useTagStore } from './tagStore'
import { useLogStore } from './logStore'

export const useSyncStore = defineStore('sync', () => {
  const lastSyncTime = ref<string>(localStorage.getItem('sync_last_time') || '')
  const isSyncing = ref(false)
  const isOnline = ref(true)
  const dirtyCount = ref(0)
  const lastError = ref<string | null>(null)
  let syncTimer: ReturnType<typeof setInterval> | null = null

  const syncStatus = computed<'synced' | 'syncing' | 'pending' | 'offline' | 'disconnected'>(() => {
    if (isSyncing.value) return 'syncing'
    if (!isOnline.value) return 'offline'
    if (dirtyCount.value > 0) return 'pending'
    const auth = useAuthStore()
    if (!auth.isLoggedIn) return 'disconnected'
    return 'synced'
  })

  function setDirtyCount(count: number) {
    dirtyCount.value = count
  }

  function incrementDirty() {
    dirtyCount.value++
  }

  async function pushToServer(): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.token || !auth.serverUrl) return false

    isSyncing.value = true
    lastError.value = null
    try {
      const projectStore = useProjectStore()
      const taskStore = useTaskStore()
      const tagStore = useTagStore()
      const logStore = useLogStore()

      const dirtyProjects = projectStore.projects.filter(p => !p.sync_version || p.sync_version === 0)
      const dirtyTasks = taskStore.tasks.filter(t => !t.sync_version || t.sync_version === 0)

      if (dirtyProjects.length === 0 && dirtyTasks.length === 0) {
        dirtyCount.value = 0
        return true
      }

      // 收集标签和评论
      const allTags = tagStore.tags
      const taskTags: any[] = []
      for (const taskId in logStore.logs) {
        // 此处的 task_tags 从 tagStore 获取
      }
      const comments: any[] = []
      for (const [tid, entryLogs] of Object.entries(logStore.logs)) {
        for (const l of entryLogs) {
          if (l.type === 'comment') comments.push(l)
        }
      }
      const taskTagsData: { task_id: number; tag_id: number }[] = []
      for (const [taskId, ttags] of Object.entries(tagStore.taskTags)) {
        for (const t of ttags) {
          taskTagsData.push({ task_id: Number(taskId), tag_id: t.id })
        }
      }

      const result = await syncFetch(auth.serverUrl, auth.token, '/sync/push', 'POST', {
        projects: dirtyProjects,
        tasks: dirtyTasks,
        tags: allTags,
        task_tags: taskTagsData,
        task_logs: comments
      })

      if (result.projects) {
        for (const sp of result.projects) {
          const p = projectStore.projects.find(pp => pp.id === sp.id)
          if (p) {
            (p as any).sync_version = sp.sync_version
          }
        }
      }
      if (result.tasks) {
        for (const st of result.tasks) {
          const t = taskStore.tasks.find(tt => tt.id === st.id)
          if (t) {
            (t as any).sync_version = st.sync_version
          }
        }
      }

      dirtyCount.value = 0
      return true
    } catch (e: any) {
      lastError.value = e.message
      return false
    } finally {
      isSyncing.value = false
    }
  }

  async function pullFromServer(): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.token || !auth.serverUrl) return false

    isSyncing.value = true
    lastError.value = null
    try {
      const projectStore = useProjectStore()
      const taskStore = useTaskStore()
      const tagStore = useTagStore()
      const logStore = useLogStore()

      const since = lastSyncTime.value || '1970-01-01T00:00:00Z'
      const result = await syncFetch(auth.serverUrl, auth.token, `/sync/pull?since=${encodeURIComponent(since)}`, 'GET')

      const now = new Date().toISOString()
      lastSyncTime.value = now
      localStorage.setItem('sync_last_time', now)

      if (result.projects && result.projects.length > 0) {
        for (const sp of result.projects) {
          const idx = projectStore.projects.findIndex(p => p.id === sp.id)
          if (idx >= 0) {
            projectStore.projects[idx] = sp
          } else {
            projectStore.projects.push(sp)
          }
        }
      }

      if (result.tasks && result.tasks.length > 0) {
        for (const st of result.tasks) {
          const idx = taskStore.tasks.findIndex(t => t.id === st.id)
          if (idx >= 0) {
            taskStore.tasks[idx] = st
          } else {
            taskStore.tasks.push(st)
          }
        }
      }

      if (result.tags && result.tags.length > 0) {
        for (const t of result.tags) {
          if (!tagStore.tags.find(tt => tt.id === t.id)) tagStore.tags.push(t)
        }
      }

      if (result.task_tags && result.task_tags.length > 0) {
        for (const tt of result.task_tags) {
          if (!tagStore.taskTags[tt.task_id]) tagStore.taskTags[tt.task_id] = []
          const tag = tagStore.tags.find(t => t.id === tt.tag_id)
          if (tag && !tagStore.taskTags[tt.task_id].find(t => t.id === tt.tag_id)) {
            tagStore.taskTags[tt.task_id].push(tag)
          }
        }
      }

      if (result.task_logs && result.task_logs.length > 0) {
        for (const l of result.task_logs) {
          if (!logStore.logs[l.task_id]) logStore.logs[l.task_id] = []
          if (!logStore.logs[l.task_id].find(e => e.id === l.id)) {
            logStore.logs[l.task_id].push(l)
          }
        }
      }

      // 刷新标签缓存
      const newIds = taskStore.tasks.map(t => t.id)
      for (const id of newIds) await tagStore.loadTaskTags(id)
      dirtyCount.value = 0

      return true
    } catch (e: any) {
      lastError.value = e.message
      return false
    } finally {
      isSyncing.value = false
    }
  }

  async function fullSyncFromServer(): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.token || !auth.serverUrl) return false

    isSyncing.value = true
    lastError.value = null
    try {
      const projectStore = useProjectStore()
      const taskStore = useTaskStore()
      const tagStore = useTagStore()
      const logStore = useLogStore()

      const result = await syncFetch(auth.serverUrl, auth.token, '/sync/full', 'GET')

      const now = new Date().toISOString()
      lastSyncTime.value = now
      localStorage.setItem('sync_last_time', now)

      projectStore.projects = result.projects || []
      taskStore.tasks = result.tasks || []
      tagStore.tags = result.tags || []

      if (result.task_tags && result.task_tags.length > 0) {
        for (const tt of result.task_tags) {
          if (!tagStore.taskTags[tt.task_id]) tagStore.taskTags[tt.task_id] = []
          const tag = tagStore.tags.find(t => t.id === tt.tag_id)
          if (tag && !tagStore.taskTags[tt.task_id].find(t => t.id === tt.tag_id)) {
            tagStore.taskTags[tt.task_id].push(tag)
          }
        }
      }

      if (result.task_logs && result.task_logs.length > 0) {
        for (const l of result.task_logs) {
          if (!logStore.logs[l.task_id]) logStore.logs[l.task_id] = []
          if (!logStore.logs[l.task_id].find(e => e.id === l.id)) {
            logStore.logs[l.task_id].push(l)
          }
        }
      }

      return true
    } catch (e: any) {
      lastError.value = e.message
      return false
    } finally {
      isSyncing.value = false
    }
  }

  async function fullPushToServer(): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.token || !auth.serverUrl) return false

    isSyncing.value = true
    lastError.value = null
    try {
      const projectStore = useProjectStore()
      const taskStore = useTaskStore()
      const tagStore = useTagStore()
      const logStore = useLogStore()

      const allProjects = projectStore.projects.map(p => ({ ...p, sync_version: 1 }))
      const allTasks = taskStore.tasks.map(t => ({ ...t, sync_version: 1 }))
      const comments: any[] = []
      for (const [tid, entryLogs] of Object.entries(logStore.logs)) {
        for (const l of entryLogs) {
          if (l.type === 'comment') comments.push(l)
        }
      }
      const taskTagsData: { task_id: number; tag_id: number }[] = []
      for (const [taskId, ttags] of Object.entries(tagStore.taskTags)) {
        for (const t of ttags) {
          taskTagsData.push({ task_id: Number(taskId), tag_id: t.id })
        }
      }

      await syncFetch(auth.serverUrl, auth.token, '/sync/push', 'POST', {
        projects: allProjects,
        tasks: allTasks,
        tags: tagStore.tags,
        task_tags: taskTagsData,
        task_logs: comments
      })
      dirtyCount.value = 0
      return true
    } catch (e: any) {
      lastError.value = e.message
      return false
    } finally {
      isSyncing.value = false
    }
  }

  // 通用同步请求：优先用 Electron IPC，浏览器模式直接用 fetch
  async function syncFetch(serverUrl: string, token: string, path: string, method: string, body?: any): Promise<any> {
    try {
      if (method === 'POST' && body) {
        return await window.syncAPI.push(serverUrl, token, body)
      } else if (path.startsWith('/sync/pull')) {
        const since = new URLSearchParams(path.split('?')[1] || '').get('since') || ''
        return await window.syncAPI.pull(serverUrl, token, since)
      } else if (path === '/sync/full') {
        return await window.syncAPI.full(serverUrl, token)
      }
    } catch { /* Electron not available, use direct fetch */ }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
    const url = `${serverUrl}${path}`
    const resp = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
    if (!resp.ok) {
      if (resp.status === 401) throw new Error('TOKEN_EXPIRED')
      throw new Error('同步请求失败')
    }
    return await resp.json()
  }

  async function manualSync() {
    await pushToServer()
    await pullFromServer()
  }

  function startAutoSync() {
    if (syncTimer) return
    syncTimer = setInterval(async () => {
      const auth = useAuthStore()
      if (!auth.isLoggedIn) return
      if (dirtyCount.value > 0) {
        await pushToServer()
      }
      await pullFromServer()
    }, 60000)
  }

  function stopAutoSync() {
    if (syncTimer) {
      clearInterval(syncTimer)
      syncTimer = null
    }
  }

  return {
    lastSyncTime,
    isSyncing,
    isOnline,
    dirtyCount,
    lastError,
    syncStatus,
    setDirtyCount,
    incrementDirty,
    pushToServer,
    pullFromServer,
    fullSyncFromServer,
    fullPushToServer,
    manualSync,
    startAutoSync,
    stopAutoSync
  }
})
