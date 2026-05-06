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

  function setServerUrl(url: string) {
    serverUrl.value = url
    localStorage.setItem('sync_server_url', url)
  }

  function setAuth(t: string, uEmail: string, uId: number) {
    token.value = t
    email.value = uEmail
    userId.value = uId
    isLoggedIn.value = true
    // 通知主进程服务端配置
    try { window.syncAPI.configure(serverUrl.value, t) } catch {}
  }

  async function loadFromStorage() {
    try {
      const storedToken = await window.authAPI.getToken()
      if (storedToken) {
        const payload = JSON.parse(atob(storedToken.split('.')[1]))
        setAuth(storedToken, payload.email, payload.userId)
        return true
      }
    } catch {
      // 浏览器模式：从 localStorage 读取
      const storedToken = localStorage.getItem('auth_token')
      if (storedToken) {
        try {
          const payload = JSON.parse(atob(storedToken.split('.')[1]))
          setAuth(storedToken, payload.email, payload.userId)
          return true
        } catch { /* invalid token */ }
      }
    }
    return false
  }

  async function saveToken(t: string) {
    try {
      await window.authAPI.saveToken(t)
    } catch {
      localStorage.setItem('auth_token', t)
    }
  }

  async function saveCredentials(em: string, pw: string) {
    try {
      await window.authAPI.saveCredentials(em, pw)
    } catch {
      localStorage.setItem('auth_cred', JSON.stringify({ email: em, password: pw }))
    }
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

  async function logout() {
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
    if (!cred || !serverUrl.value) return false
    try {
      const resp = await fetch(`${serverUrl.value}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cred.email, password: cred.password })
      })
      if (!resp.ok) return false
      const data = await resp.json()
      await saveToken(data.token)
      setAuth(data.token, data.user.email, data.user.id)
      return true
    } catch {
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
    loading,
    setServerUrl,
    setAuth,
    loadFromStorage,
    login,
    autoRelogin,
    checkAndRefreshToken,
    logout,
    getStoredCredentials,
    isTokenExpired
  }
})
