import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

interface AuthState {
  token: string | null
  email: string | null
  userId: number | null
  serverUrl: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const email = ref<string | null>(null)
  const userId = ref<number | null>(null)
  const serverUrl = ref(localStorage.getItem('sync_server_url') || '')
  const isLoggedIn = ref(false)
  const loading = ref(false)
  const logoutReason = ref<string | null>(null)
  const serverOnline = ref(false)
  let _hbTimer: ReturnType<typeof setInterval> | null = null

  function setServerUrl(url: string) {
    serverUrl.value = url
    localStorage.setItem('sync_server_url', url)
  }

  function setAuth(t: string, uEmail: string, uId: number) {
    token.value = t
    email.value = uEmail
    userId.value = uId
    isLoggedIn.value = true
    serverOnline.value = true
    startHeartbeat()
    // 通知主进程服务端配置
    try { window.syncAPI.configure(serverUrl.value, t) } catch {}
  }

  async function loadFromStorage() {
    // 尝试从 Electron safeStorage 读取
    let storedToken: string | null = null
    try {
      storedToken = await window.authAPI.getToken()
      console.log('[loadFromStorage] Electron getToken:', storedToken ? 'FOUND' : 'NULL')
    } catch (e: any) { console.log('[loadFromStorage] Electron getToken ERROR:', e.message) }
    // Electron 兜底：读取本地文件 / localStorage
    if (!storedToken) {
      storedToken = localStorage.getItem('auth_token')
      console.log('[loadFromStorage] localStorage getItem:', storedToken ? 'FOUND' : 'NULL')
    }
    if (storedToken) {
      try {
        const payload = JSON.parse(atob(storedToken.split('.')[1]))
        setAuth(storedToken, payload.email, payload.userId)
        console.log('[loadFromStorage] SUCCESS, userId:', payload.userId)
        return true
      } catch (e: any) { console.log('[loadFromStorage] token parse ERROR:', e.message) }
    }
    // 有 serverUrl 就先启动心跳，等连上后自动登录
    if (serverUrl.value) {
      console.log('[loadFromStorage] no token, starting heartbeat + autoRelogin')
      startHeartbeat()
      autoRelogin()  // 立即尝试自动登录，不等待心跳
    }
    console.log('[loadFromStorage] FAILED, token still null')
    return false
  }

  async function saveToken(t: string) {
    try {
      await window.authAPI.saveToken(t)
      console.log('[saveToken] Electron save OK')
    } catch (e: any) {
      console.log('[saveToken] Electron save ERROR:', e.message)
    }
    localStorage.setItem('auth_token', t)
    console.log('[saveToken] localStorage saved')
  }

  async function saveCredentials(em: string, pw: string) {
    try {
      await window.authAPI.saveCredentials(em, pw)
    } catch {
      // Electron 不可用，仅写 localStorage
    }
    localStorage.setItem('auth_cred', JSON.stringify({ email: em, password: pw }))
  }

  async function getStoredCredentials(): Promise<{ email: string; password: string } | null> {
    try {
      const cred = await window.authAPI.getCredentials()
      if (cred) return cred
    } catch { /* electron not available */ }
    try {
      const raw = localStorage.getItem('auth_cred')
      if (raw) return JSON.parse(raw)
    } catch { /* ignore */ }
    return null
  }

  function forceLogout(reason: string) {
    stopHeartbeat()
    token.value = null
    email.value = null
    userId.value = null
    isLoggedIn.value = false
    logoutReason.value = reason
    try {
      window.authAPI.clearToken()
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_cred')
    } catch {}
  }

  function setOffline(reason: string) {
    if (isLoggedIn.value) {
      isLoggedIn.value = false
      serverOnline.value = false
      logoutReason.value = reason
    }
  }

  function startHeartbeat() {
    if (_hbTimer) return
    _hbTimer = setInterval(async () => {
      if (!serverUrl.value) return
      try {
        const resp = await fetch(`${serverUrl.value}/health`, {
          method: 'GET', signal: AbortSignal.timeout(3000)
        })
        if (resp.ok) {
          if (!serverOnline.value) serverOnline.value = true
          if (!isLoggedIn.value) {
            const ok = await autoRelogin()
            if (!ok) setOffline('自动登录失败')
          }
          logoutReason.value = null
        } else {
          setOffline('服务器响应异常')
        }
      } catch {
        setOffline('服务器连接断开')
      }
    }, 5000)
  }

  function stopHeartbeat() {
    if (_hbTimer) { clearInterval(_hbTimer); _hbTimer = null }
    serverOnline.value = false
  }

  async function logout() {
    stopHeartbeat()
    token.value = null
    email.value = null
    userId.value = null
    isLoggedIn.value = false
    try {
      await window.authAPI.clearToken()
    } catch {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_cred')
    }
  }

  async function login(eml: string, pass: string): Promise<boolean> {
    loading.value = true
    try {
      const resp = await fetch(`${serverUrl.value}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: eml, password: pass })
      })
      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.error || '登录失败')
      }
      const data = await resp.json()
      await saveToken(data.token)
      await saveCredentials(eml, pass)
      setAuth(data.token, data.user.email, data.user.id)
      return true
    } finally {
      loading.value = false
    }
  }

  async function autoRelogin(): Promise<boolean> {
    const cred = await getStoredCredentials()
    console.log('[autoRelogin] cred found:', !!cred)
    if (!cred || !serverUrl.value) return false
    try {
      const resp = await fetch(`${serverUrl.value}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cred.email, password: cred.password })
      })
      if (!resp.ok) {
        console.log('[autoRelogin] login FAILED, status:', resp.status)
        return false
      }
      const data = await resp.json()
      await saveToken(data.token)
      setAuth(data.token, data.user.email, data.user.id)
      console.log('[autoRelogin] SUCCESS')
      return true
    } catch (e: any) {
      console.log('[autoRelogin] ERROR:', e.message)
      return false
    }
  }

  function isTokenExpired(tokenStr: string): boolean {
    try {
      const payload = JSON.parse(atob(tokenStr.split('.')[1]))
      return Date.now() >= payload.exp * 1000
    } catch {
      return true
    }
  }

  function isTokenExpiringSoon(tokenStr: string): boolean {
    try {
      const payload = JSON.parse(atob(tokenStr.split('.')[1]))
      const threeDays = 3 * 24 * 60 * 60 * 1000
      return Date.now() >= (payload.exp * 1000 - threeDays)
    } catch {
      return true
    }
  }

  async function checkAndRefreshToken(): Promise<boolean> {
    if (!token.value) return false
    if (isTokenExpired(token.value)) {
      return await autoRelogin()
    }
    if (isTokenExpiringSoon(token.value)) {
      await autoRelogin()
    }
    return true
  }

  return {
    token,
    email,
    userId,
    serverUrl,
    isLoggedIn,
    serverOnline,
    loading,
    setServerUrl,
    setAuth,
    loadFromStorage,
    login,
    autoRelogin,
    checkAndRefreshToken,
    logout,
    forceLogout,
    logoutReason,
    getStoredCredentials,
    isTokenExpired
  }
})
