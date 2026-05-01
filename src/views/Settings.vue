<template>
  <div class="settings-view">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>设置</h2>
        </div>
      </template>

      <!-- 同步服务端设置 -->
      <div class="section">
        <h3>远程同步</h3>
        <el-form label-width="100px" label-position="left">
          <el-form-item label="服务器地址">
            <el-input
              v-model="serverUrlInput"
              placeholder="例如 https://your-server.com"
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
              <el-button type="primary" :loading="authStore.loading" @click="handleLogin">
                登录
              </el-button>
              <el-button @click="handleTestConnection">测试连接</el-button>
            </el-form-item>
          </template>

          <template v-else>
            <el-form-item label="登录状态">
              <el-tag type="success">已登录：{{ authStore.email }}</el-tag>
            </el-form-item>
            <el-form-item label="同步信息">
              <span v-if="syncStore.lastSyncTime" class="sync-info">
                上次同步：{{ formatTime(syncStore.lastSyncTime) }}
              </span>
              <span v-else class="sync-info muted">尚未同步</span>
            </el-form-item>
            <el-form-item label="待上传">
              <span :class="syncStore.dirtyCount > 0 ? 'dirty' : ''">
                {{ syncStore.dirtyCount }} 条
              </span>
            </el-form-item>
            <el-form-item>
              <div class="button-group">
                <el-button type="primary" :loading="syncStore.isSyncing" @click="handleManualSync">
                  手动同步
                </el-button>
                <el-button @click="handlePushToServer" :loading="syncStore.isSyncing">
                  仅上传
                </el-button>
                <el-button @click="handlePullFromServer" :loading="syncStore.isSyncing">
                  仅下载
                </el-button>
              </div>
            </el-form-item>
            <el-form-item>
              <el-button type="danger" plain @click="handleLogout">
                退出登录
              </el-button>
            </el-form-item>
          </template>
        </el-form>
      </div>

      <!-- 应用信息 -->
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
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import { useSyncStore } from '@/stores/syncStore'

const authStore = useAuthStore()
const syncStore = useSyncStore()

const serverUrlInput = ref(authStore.serverUrl || '')
const loginEmail = ref('')
const loginPassword = ref('')

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
        await syncStore.pullFromServer()
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
    try {
      ok = await window.syncAPI.health(serverUrlInput.value)
    } catch {
      const resp = await fetch(`${serverUrlInput.value}/health`, { signal: AbortSignal.timeout(5000) })
      ok = resp.ok
    }
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
      // 首次登录，弹窗询问同步方向
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
    try {
      remoteData = await window.syncAPI.full(authStore.serverUrl, authStore.token!)
    } catch {
      const resp = await fetch(`${authStore.serverUrl}/sync/full`, {
        headers: { 'Authorization': `Bearer ${authStore.token}` }
      })
      remoteData = resp.ok ? await resp.json() : { projects: [], tasks: [] }
    }
    const hasRemote = remoteData.projects?.length > 0 || remoteData.tasks?.length > 0

    if (!hasRemote) {
      await syncStore.fullPushToServer()
      ElMessage.success('数据已上传至服务器')
      return
    }

    const { useLocal } = await import('element-plus').then(m => m.ElMessageBox.confirm(
      '服务器已有数据。是否用本地数据覆盖服务器？\n\n"确定" = 上传本地数据\n"取消" = 下载服务器数据',
      '首次同步',
      { confirmButtonText: '上传本地', cancelButtonText: '下载服务器', type: 'warning' }
    ).then(() => ({ useLocal: true })).catch(() => ({ useLocal: false })))

    if (useLocal) {
      await syncStore.fullPushToServer()
      ElMessage.success('本地数据已上传')
    } else {
      await syncStore.fullSyncFromServer()
      ElMessage.success('服务器数据已下载')
    }
  } catch {
    // 用户取消或其他错误
  }
}

async function handleManualSync() {
  await syncStore.manualSync()
  ElMessage.success('同步完成')
}

async function handlePushToServer() {
  const ok = await syncStore.pushToServer()
  ElMessage[ok ? 'success' : 'error'](ok ? '上传完成' : '上传失败')
}

async function handlePullFromServer() {
  const ok = await syncStore.pullFromServer()
  ElMessage[ok ? 'success' : 'error'](ok ? '下载完成' : '下载失败')
}

function handleLogout() {
  syncStore.stopAutoSync()
  authStore.logout()
  loginPassword.value = ''
  ElMessage.success('已退出登录')
}

function formatTime(iso: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleString()
  } catch {
    return iso
  }
}
</script>

<style scoped>
.settings-view {
  padding: 24px;
  max-width: 800px;
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
  color: var(--text-primary);
}

.section {
  margin-bottom: 32px;
}

.section h3 {
  margin: 0 0 16px;
  font-size: 16px;
  color: var(--text-primary);
}

.sync-info {
  font-size: 13px;
  color: var(--text-secondary);
}

.sync-info.muted {
  color: var(--text-tertiary);
}

.dirty {
  color: #e6a23c;
  font-weight: 600;
}

.button-group {
  display: flex;
  gap: 8px;
}

:deep(.el-card) {
  background: var(--card-bg);
  border-color: var(--border-color);
}

:deep(.el-descriptions__label),
:deep(.el-descriptions__content) {
  color: var(--text-primary);
}
</style>
