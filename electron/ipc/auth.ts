import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

const TOKEN_PATH = path.join(app.getPath('userData'), '.auth_token')
const CRED_PATH = path.join(app.getPath('userData'), '.auth_cred')

function safeWrite(filePath: string, data: string) {
  try {
    fs.writeFileSync(filePath, data, 'utf-8')
  } catch (e) {
    console.error('Write file error:', filePath, e)
    throw e
  }
}

function safeRead(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null
    return fs.readFileSync(filePath, 'utf-8')
  } catch (e) {
    console.error('Read file error:', filePath, e)
    return null
  }
}

export function registerAuthHandlers() {
  ipcMain.handle('auth:save-token', async (_event, token: string) => {
    safeWrite(TOKEN_PATH, token)
  })

  ipcMain.handle('auth:get-token', async () => {
    return safeRead(TOKEN_PATH)
  })

  ipcMain.handle('auth:clear-token', async () => {
    try {
      if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH)
      if (fs.existsSync(CRED_PATH)) fs.unlinkSync(CRED_PATH)
    } catch (e) {
      console.error('Clear token error:', e)
    }
  })

  ipcMain.handle('auth:save-credentials', async (_event, email: string, password: string) => {
    safeWrite(CRED_PATH, JSON.stringify({ email, password }))
  })

  ipcMain.handle('auth:get-credentials', async () => {
    const raw = safeRead(CRED_PATH)
    if (!raw) return null
    try {
      return JSON.parse(raw) as { email: string; password: string }
    } catch {
      return null
    }
  })
}
