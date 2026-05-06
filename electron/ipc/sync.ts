import { ipcMain } from 'electron'
import { setConfig } from './serverConfig.js'

let baseUrl = ''
let authToken = ''

export function registerSyncHandlers() {
  ipcMain.handle('sync:configure', async (_event, serverUrl: string, token: string) => {
    baseUrl = serverUrl
    authToken = token
    setConfig(serverUrl, token)
  })

  ipcMain.handle('sync:push', async (_event, serverUrl: string, token: string, data: any) => {
    const url = serverUrl || baseUrl
    const t = token || authToken
    if (!url || !t) throw new Error('未配置同步服务器')

    const response = await fetch(`${url}/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${t}`
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      if (response.status === 401) throw new Error('TOKEN_EXPIRED')
      throw new Error((err as any).error || '同步失败')
    }

    return await response.json()
  })

  ipcMain.handle('sync:pull', async (_event, serverUrl: string, token: string, since: string) => {
    const url = serverUrl || baseUrl
    const t = token || authToken
    if (!url || !t) throw new Error('未配置同步服务器')

    const response = await fetch(`${url}/sync/pull?since=${encodeURIComponent(since)}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${t}` }
    })

    if (!response.ok) {
      if (response.status === 401) throw new Error('TOKEN_EXPIRED')
      throw new Error('同步失败')
    }

    return await response.json()
  })

  ipcMain.handle('sync:full', async (_event, serverUrl: string, token: string) => {
    const url = serverUrl || baseUrl
    const t = token || authToken
    if (!url || !t) throw new Error('未配置同步服务器')

    const response = await fetch(`${url}/sync/full`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${t}` }
    })

    if (!response.ok) {
      if (response.status === 401) throw new Error('TOKEN_EXPIRED')
      throw new Error('获取全量数据失败')
    }

    return await response.json()
  })

  ipcMain.handle('sync:health', async (_event, serverUrl: string) => {
    try {
      const response = await fetch(`${serverUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      return response.ok
    } catch {
      return false
    }
  })

  ipcMain.handle('sync:get-last-time', async () => {
    return ''
  })

  ipcMain.handle('sync:gen-id', async (_event, serverUrl: string, token: string, entity: string, count: number) => {
    const url = serverUrl || baseUrl
    const t = token || authToken
    if (!url || !t) throw new Error('未配置同步服务器')
    const response = await fetch(`${url}/sync/gen-id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${t}`
      },
      body: JSON.stringify({ entity, count })
    })
    if (!response.ok) throw new Error('获取ID失败')
    return await response.json()
  })
}
