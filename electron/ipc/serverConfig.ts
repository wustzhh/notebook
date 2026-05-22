import { ipcMain } from 'electron'

let serverUrl = ''
let authToken = ''

export function registerServerConfigHandlers() {
  ipcMain.handle('server-config:set', async (_event, url: string, token: string) => {
    serverUrl = url
    authToken = token
  })
}

export function setConfig(url: string, token: string) {
  serverUrl = url
  authToken = token
}

export function getServerConfig() {
  return { serverUrl, token: authToken }
}
