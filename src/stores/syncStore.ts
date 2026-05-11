import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './authStore'
import { useProjectStore } from './projectStore'
import { useTaskStore } from './taskStore'
import { useTagStore } from './tagStore'
import { useLogStore } from './logStore'
import { updateMaxFromItems, updateMaxFromRemap } from '@/utils/idManager'

export const useSyncStore = defineStore('sync', () => {
  const lastSyncTime = ref<string>(localStorage.getItem('sync_last_time') || '')
  const isSyncing = ref(false)
  const isOnline = ref(true)
  const dirtyCount = ref(0)
  const lastError = ref<string | null>(null)
  let syncTimer: ReturnType<typeof setInterval> | null = null
  let syncLock = false

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

  function collectTaskTagsData() {
    const tagStore = useTagStore()
    const data: { task_id: number; tag_id: number }[] = []
    for (const [taskId, ttags] of Object.entries(tagStore.taskTags)) {
      for (const t of ttags) {
        data.push({ task_id: Number(taskId), tag_id: t.id })
      }
    }
    return data
  }

  function collectAllTags() {
    return useTagStore().tags
  }

  async function pushToServer(): Promise<boolean> {
    const auth = useAuthStore()
    console.log('[pushToServer] token:', !!auth.token, 'url:', !!auth.serverUrl, 'loggedIn:', auth.isLoggedIn)
    if (!auth.token || !auth.serverUrl) {
      console.log('[pushToServer] ABORT: missing token or serverUrl')
      return false
    }

    isSyncing.value = true
    lastError.value = null
    try {
      const projectStore = useProjectStore()
      const taskStore = useTaskStore()
      const logStore = useLogStore()

      const dirtyProjects = projectStore.projects.filter(p => !p.sync_version || p.sync_version === 0)
      const dirtyTasks = taskStore.tasks.filter(t => !t.sync_version || t.sync_version === 0)

      if (dirtyTasks.length > 0) {
        console.log('[push] dirty tasks:', dirtyTasks.map(t => `${t.id}(${t.seq_number||0}):${t.status}:sv${t.sync_version}`).join(', '))
      }

      const comments: any[] = []
      for (const entryLogs of Object.values(logStore.logs)) {
        for (const l of entryLogs) {
          if (l.type === 'comment') comments.push(l)
        }
      }

      const hasDeletions = projectStore.deletedProjectIds.length > 0
        || taskStore.deletedTaskIds.length > 0
        || logStore.deletedCommentIds.length > 0
      const hasChanges = dirtyProjects.length > 0 || dirtyTasks.length > 0 || comments.length > 0 || hasDeletions
      console.log('[pushToServer] dirtyProjects:', dirtyProjects.length, 'dirtyTasks:', dirtyTasks.length, 'comments:', comments.length, 'deletions:', hasDeletions)
      if (!hasChanges) {
        console.log('[pushToServer] SKIP: no changes')
        dirtyCount.value = 0
        return true
      }

      const result = await syncFetch(auth.serverUrl, auth.token, '/sync/push', 'POST', {
        projects: dirtyProjects,
        tasks: dirtyTasks,
        tags: collectAllTags(),
        task_tags: collectTaskTagsData(),
        task_logs: comments,
        deleted_comment_ids: [...logStore.deletedCommentIds],
        deleted_project_ids: [...projectStore.deletedProjectIds],
        deleted_task_ids: [...taskStore.deletedTaskIds]
      })

      if (result.id_remap) {
        for (const [oldId, newId] of Object.entries(result.id_remap)) {
          const pid = Number(oldId)
          const pp = projectStore.projects.find(p => p.id === pid)
          if (pp) (pp as any).id = newId as number
          const tt = taskStore.tasks.find(t => t.id === pid)
          if (tt) (tt as any).id = newId as number
        }
      }
      if (result.id_remap) updateMaxFromRemap(result.id_remap)

      // ID 重映射之后再用新 ID 匹配，确保 sync_version / seq_number 能正确更新
      if (result.projects && result.projects.length > 0) {
        for (const sp of result.projects) {
          const p = projectStore.projects.find(pp => pp.id === sp.id)
          if (!p) continue
          if (sp.sync_version !== undefined) (p as any).sync_version = sp.sync_version
        }
      }
      if (result.tasks && result.tasks.length > 0) {
        for (const st of result.tasks) {
          const t = taskStore.tasks.find(tt => tt.id === st.id)
          if (!t) continue
          if (st.sync_version !== undefined) (t as any).sync_version = st.sync_version
          if (st.seq_assigned) {
            ;(t as any).seq_number = st.seq_number
            ;(t as any).seq_assigned = st.seq_assigned
          }
        }
      }

      logStore.deletedCommentIds = []
      localStorage.removeItem('deleted_comment_ids')
      projectStore.deletedProjectIds = []
      localStorage.removeItem('deleted_project_ids')
      taskStore.deletedTaskIds = []
      localStorage.removeItem('deleted_task_ids')
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

      // 用服务端时间
      if (result.server_time) {
        lastSyncTime.value = result.server_time
        localStorage.setItem('sync_last_time', result.server_time)
      }

      if (result.projects && result.projects.length > 0) {
        for (const sp of result.projects) {
          const idx = projectStore.projects.findIndex(p => p.id === sp.id)
          if (idx >= 0) {
            if (new Date(sp.updated_at) >= new Date(projectStore.projects[idx].updated_at || 0)) {
              Object.assign(projectStore.projects[idx], sp)
            }
          } else {
            projectStore.projects.push(sp)
          }
        }
      }

      if (result.tasks && result.tasks.length > 0) {
        for (const st of result.tasks) {
          const idx = taskStore.tasks.findIndex(t => t.id === st.id)
          if (idx >= 0) {
            if (new Date(st.updated_at) >= new Date(taskStore.tasks[idx].updated_at || 0)) {
              Object.assign(taskStore.tasks[idx], st)
            }
          } else {
            const project = projectStore.projects.find(p => p.id === st.project_id)
            if (project) {
              st.project_name = project.name
              st.project_key = project.key
            }
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

      await window.projectAPI.saveAll(JSON.parse(JSON.stringify(projectStore.projects)))
      await window.taskAPI.saveAll(JSON.parse(JSON.stringify(taskStore.tasks)))
      await window.tagAPI.saveAll(JSON.parse(JSON.stringify(tagStore.tags)), JSON.parse(JSON.stringify(collectTaskTagsData())))
      // 持久化评论
      const allComments: any[] = []
      for (const ls of Object.values(logStore.logs)) {
        for (const l of ls) {
          if (l.type === 'comment') allComments.push(l)
        }
      }
      if (allComments.length > 0) {
        await window.logAPI.saveAll(JSON.parse(JSON.stringify(allComments)))
      }

      const newIds = taskStore.tasks.map(t => t.id)
      for (const id of newIds) await tagStore.loadTaskTags(id)
      dirtyCount.value = 0

      updateMaxFromItems('projects', projectStore.projects)
      updateMaxFromItems('tasks', taskStore.tasks)
      updateMaxFromItems('tags', tagStore.tags)
      for (const ls of Object.values(logStore.logs)) {
        for (const l of ls) updateMaxFromItems('logs', [l])
      }

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

    if (dirtyCount.value > 0) {
      // 有未同步数据时不强制覆盖
      lastError.value = '本地有未同步数据，请先上传'
      return false
    }

    isSyncing.value = true
    lastError.value = null
    try {
      const projectStore = useProjectStore()
      const taskStore = useTaskStore()
      const tagStore = useTagStore()
      const logStore = useLogStore()

      const result = await syncFetch(auth.serverUrl, auth.token, '/sync/full', 'GET')

      if (result.server_time) {
        lastSyncTime.value = result.server_time
        localStorage.setItem('sync_last_time', result.server_time)
      }

      projectStore.projects = result.projects || []
      taskStore.tasks = result.tasks || []
      tagStore.tags = result.tags || []
      tagStore.taskTags = {}

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
        logStore.logs = {}
        for (const l of result.task_logs) {
          if (!logStore.logs[l.task_id]) logStore.logs[l.task_id] = []
          logStore.logs[l.task_id].push(l)
        }
      }

      await window.projectAPI.saveAll(JSON.parse(JSON.stringify(projectStore.projects)))
      await window.taskAPI.saveAll(JSON.parse(JSON.stringify(taskStore.tasks)))
      await window.tagAPI.saveAll(JSON.parse(JSON.stringify(tagStore.tags)), JSON.parse(JSON.stringify(collectTaskTagsData())))

      for (const [taskId, ls] of Object.entries(logStore.logs)) {
        for (const l of ls) {
          if (l.type === 'comment') {
            try { await window.logAPI.create(l) } catch {}
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

  async function fullPushToServer(): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.token || !auth.serverUrl) return false

    isSyncing.value = true
    lastError.value = null
    try {
      const projectStore = useProjectStore()
      const taskStore = useTaskStore()
      const logStore = useLogStore()

      const comments: any[] = []
      for (const entryLogs of Object.values(logStore.logs)) {
        for (const l of entryLogs) {
          if (l.type === 'comment') comments.push(l)
        }
      }

      await syncFetch(auth.serverUrl, auth.token, '/sync/push', 'POST', {
        projects: projectStore.projects,
        tasks: taskStore.tasks,
        tags: collectAllTags(),
        task_tags: collectTaskTagsData(),
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
    } catch (e: any) { console.warn('syncFetch IPC fallback, error:', e.message) }

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
    const pushed = await pushToServer()
    if (!pushed) return
    await pullFromServer()
  }

  function startAutoSync() {
    if (syncTimer) return
    syncTimer = setInterval(async () => {
      if (syncLock || !useAuthStore().isLoggedIn) return
      syncLock = true
      try {
        // 检查是否有需要同步的变更
        const projectStore = useProjectStore()
        const taskStore = useTaskStore()
        const logStore = useLogStore()
        const hasDirty = projectStore.projects.some(p => !p.sync_version || p.sync_version === 0)
          || taskStore.tasks.some(t => !t.sync_version || t.sync_version === 0)
          || logStore.deletedCommentIds.length > 0
          || projectStore.deletedProjectIds.length > 0
          || taskStore.deletedTaskIds.length > 0
        if (hasDirty) await pushToServer()
        await pullFromServer()
      } finally {
        syncLock = false
      }
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
