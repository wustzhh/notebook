<template>
  <div class="settings-view">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>设置</h2>
        </div>
      </template>

      <div class="section">
        <h3>远程同步</h3>
        <el-form label-width="100px" label-position="left">
          <el-form-item label="服务器地址">
            <el-input
              v-model="serverUrlInput"
              placeholder="例如 http://212.129.243.158:3000"
              :disabled="authStore.isLoggedIn"
              @blur="saveServerUrl"
            />
          </el-form-item>

          <template v-if="!authStore.isLoggedIn">
            <el-form-item label="邮箱">
              <el-input v-model="loginEmail" placeholder="请输入邮箱" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="loginPassword" type="password" placeholder="请输入密码" show-password @keyup.enter="handleLogin" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="authStore.loading" @click="handleLogin">登录</el-button>
              <el-button @click="handleTestConnection">测试连接</el-button>
            </el-form-item>
          </template>

          <template v-else>
            <el-form-item label="登录账号">
              <el-tag type="success">{{ authStore.email }}</el-tag>
            </el-form-item>

            <el-form-item label="同步状态">
              <span class="sync-info">{{ syncStatusText }}</span>
            </el-form-item>

            <el-form-item label="上次同步">
              <span v-if="syncStore.lastSyncTime" class="sync-info">{{ formatTime(syncStore.lastSyncTime) }}</span>
              <span v-else class="sync-info muted">尚无</span>
            </el-form-item>

            <el-form-item label="待上传">
              <span :class="syncStore.dirtyCount > 0 ? 'dirty' : ''">{{ syncStore.dirtyCount }} 条</span>
            </el-form-item>

            <el-form-item>
              <div class="button-group">
                <el-tooltip content="先上传再下载，保持两端一致">
                  <el-button type="primary" :loading="syncStore.isSyncing" @click="handleManualSync">手动同步</el-button>
                </el-tooltip>
                <el-tooltip content="仅把本地数据推送到服务器">
                  <el-button @click="handlePushToServer" :loading="syncStore.isSyncing">仅上传</el-button>
                </el-tooltip>
                <el-tooltip content="仅从服务器拉取数据到本地">
                  <el-button @click="handlePullFromServer" :loading="syncStore.isSyncing">仅下载</el-button>
                </el-tooltip>
              </div>
            </el-form-item>

            <el-form-item>
              <el-button type="danger" plain @click="handleLogout">退出登录</el-button>
              <el-button type="danger" plain @click="handleClearLocalData">清空本地存档</el-button>
            </el-form-item>
            <div class="hint">清空后需重新下载服务器数据</div>
          </template>
        </el-form>
      </div>

      <div class="section">
        <h3>外观</h3>
        <el-form label-width="100px" label-position="left">
          <el-form-item label="背景图">
            <div class="bg-actions">
              <el-button size="small" @click="triggerBgInput">选择图片</el-button>
              <el-button v-if="themeStore.backgroundImage" size="small" @click="themeStore.setBackgroundImage('')">清除</el-button>
              <input ref="bgImageInput" type="file" accept="image/*" style="display:none" @change="handleBgImageChange" />
            </div>
            <div v-if="themeStore.backgroundImage" class="bg-preview">
              <img :src="themeStore.backgroundImage" />
            </div>
          </el-form-item>
        </el-form>
      </div>

      <div class="section">
        <h3>应用信息</h3>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="应用名称">Task Tracker</el-descriptions-item>
          <el-descriptions-item label="版本">1.0.0</el-descriptions-item>
          <el-descriptions-item label="技术栈">Electron + Vue 3 + Element Plus</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import { useSyncStore } from '@/stores/syncStore'
import { useThemeStore } from '@/stores/themeStore'
import { useProjectStore } from '@/stores/projectStore'
import { useTaskStore } from '@/stores/taskStore'
import { useTagStore } from '@/stores/tagStore'
import { useLogStore } from '@/stores/logStore'

const authStore = useAuthStore()
const syncStore = useSyncStore()
const themeStore = useThemeStore()

const serverUrlInput = ref(authStore.serverUrl || '')
const loginEmail = ref('')
const loginPassword = ref('')
const bgImageInput = ref<HTMLInputElement | null>(null)

const syncStatusText = computed(() => {
  const map: Record<string, string> = {
    synced: '已同步', syncing: '同步中', pending: '有数据待上传',
    offline: '离线', disconnected: '未登录'
  }
  return map[syncStore.syncStatus] || ''
})

onMounted(async () => {
  if (authStore.serverUrl) {
    serverUrlInput.value = authStore.serverUrl
  }
  const cred = await authStore.getStoredCredentials()
  if (cred) {
    loginEmail.value = cred.email
    loginPassword.value = cred.password
  }
  if (authStore.serverUrl) {
    await authStore.loadFromStorage()
    if (authStore.isLoggedIn) {
      const valid = await authStore.checkAndRefreshToken()
      if (valid) {
        syncStore.startAutoSync()
      }
    }
  }
})

function saveServerUrl() {
  authStore.setServerUrl(serverUrlInput.value)
}

async function handleTestConnection() {
  if (!serverUrlInput.value) {
    ElMessage.warning('请先输入服务器地址')
    return
  }
  try {
    let ok = false
    try { ok = await window.syncAPI.health(serverUrlInput.value) }
    catch { const resp = await fetch(`${serverUrlInput.value}/health`, { signal: AbortSignal.timeout(5000) }); ok = resp.ok }
    ElMessage[ok ? 'success' : 'error'](ok ? '连接成功' : '连接失败')
  } catch {
    ElMessage.error('连接失败，请检查服务器地址')
  }
}

async function handleLogin() {
  if (!serverUrlInput.value || !loginEmail.value || !loginPassword.value) {
    ElMessage.warning('请填写服务器地址、邮箱和密码')
    return
  }
  saveServerUrl()
  try {
    const success = await authStore.login(loginEmail.value, loginPassword.value)
    if (success) {
      ElMessage.success('登录成功')
      await askFirstSyncDirection()
      syncStore.startAutoSync()
    }
  } catch (e: any) {
    ElMessage.error(e.message || '登录失败')
  }
}

async function askFirstSyncDirection() {
  try {
    let remoteData: any
    try { remoteData = await window.syncAPI.full(authStore.serverUrl, authStore.token!) }
    catch { const resp = await fetch(`${authStore.serverUrl}/sync/full`, { headers: { 'Authorization': `Bearer ${authStore.token}` } }); remoteData = resp.ok ? await resp.json() : { projects: [], tasks: [] } }
    const hasRemote = remoteData.projects?.length > 0 || remoteData.tasks?.length > 0
    if (!hasRemote) { await syncStore.fullPushToServer(); ElMessage.success('数据已上传至服务器'); return }
    const { useLocal } = await import('element-plus').then(m => m.ElMessageBox.confirm(
      '服务器已有数据。是否用本地数据覆盖服务器？\n\n"确定" = 上传本地数据\n"取消" = 下载服务器数据',
      '首次同步',
      { confirmButtonText: '上传本地', cancelButtonText: '下载服务器', type: 'warning' }
    ).then(() => ({ useLocal: true })).catch(() => ({ useLocal: false })))
    if (useLocal) { await syncStore.fullPushToServer(); ElMessage.success('本地数据已上传') }
    else { await syncStore.fullSyncFromServer(); ElMessage.success('服务器数据已下载') }
  } catch { /* user cancelled */ }
}

async function handleManualSync() {
  const pushOk = await syncStore.pushToServer()
  if (!pushOk) { ElMessage.error('上传失败: ' + (syncStore.lastError || '')); return }
  const pullOk = await syncStore.pullFromServer()
  if (!pullOk) { ElMessage.error('下载失败: ' + (syncStore.lastError || '')); return }
  ElMessage.success('同步完成，数据已是最新')
}

async function handlePushToServer() {
  const ok = await syncStore.pushToServer()
  ElMessage[ok ? 'success' : 'error'](ok ? '已上传至服务器' : '上传失败: ' + (syncStore.lastError || ''))
}

async function handlePullFromServer() {
  const projectStore = useProjectStore()
  const before = projectStore.projects.length
  const ok = await syncStore.pullFromServer()
  if (ok) {
    const after = projectStore.projects.length
    ElMessage.success(`下载完成，项目 ${before} 个 → ${after} 个`)
  } else {
    ElMessage.error('下载失败: ' + (syncStore.lastError || ''))
  }
}

function handleLogout() {
  syncStore.stopAutoSync()
  authStore.logout()
  loginPassword.value = ''
  ElMessage.success('已退出登录')
}

async function handleClearLocalData() {
  try {
    await ElMessageBox.confirm(
      '确定要清空本地所有数据吗？清空后所有项目、任务、标签将被删除。',
      '确认清空',
      { confirmButtonText: '确定清空', cancelButtonText: '取消', type: 'warning' }
    )
    await window.projectAPI.clearAll()
    // 清空内存 store
    const projectStore = useProjectStore()
    const taskStore = useTaskStore()
    const tagStore = useTagStore()
    const logStore = useLogStore()
    projectStore.projects = []
    taskStore.tasks = []
    tagStore.tags = []
    tagStore.taskTags = {}
    logStore.logs = {}
    syncStore.setDirtyCount(0)
    syncStore.lastSyncTime = ''
    localStorage.removeItem('sync_last_time')
    ElMessage.success('本地数据已清空')
  } catch { /* user cancelled */ }
}

function triggerBgInput() { bgImageInput.value?.click() }

async function handleBgImageChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.[0]) {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = Math.min(1600 / img.width, 1)
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        themeStore.setBackgroundImage(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(input.files[0])
  }
}

function formatTime(iso: string): string {
  if (!iso) return ''
  try { const d = new Date(iso); return d.toLocaleString() }
  catch { return iso }
}
</script>

<style scoped>
.settings-view { padding: 24px; }
.card-header h2 { margin: 0; font-size: 20px; color: var(--text-primary); }
.section { margin-bottom: 32px; }
.section h3 { margin: 0 0 16px; font-size: 16px; color: var(--text-primary); }
.sync-info { font-size: 13px; color: var(--text-secondary); }
.sync-info.muted { color: var(--text-tertiary); }
.dirty { color: #e6a23c; font-weight: 600; }
.button-group { display: flex; gap: 8px; flex-wrap: wrap; }
.hint { font-size: 12px; color: var(--text-tertiary); margin-top: 4px; }
.bg-actions { display: flex; gap: 8px; }
.bg-preview { margin-top: 8px; max-width: 320px; border-radius: 6px; overflow: hidden; border: 1px solid var(--border-color); }
.bg-preview img { width: 100%; display: block; }
:deep(.el-card) { background: var(--card-bg); border-color: var(--border-color); }
:deep(.el-descriptions__label),
:deep(.el-descriptions__content) { color: var(--text-primary); }
</style>
