import { ipcMain, safeStorage } from 'electron'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

const TOKEN_PATH = path.join(app.getPath('userData'), '.auth_token')
const CRED_PATH = path.join(app.getPath('userData'), '.auth_cred')

export function registerAuthHandlers() {
  ipcMain.handle('auth:save-token', async (_event, token: string) => {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(token)
        fs.writeFileSync(TOKEN_PATH, encrypted)
      } else {
        fs.writeFileSync(TOKEN_PATH, token, 'utf-8')
      }
    } catch (e) {
      console.error('Save token error:', e)
      throw e
    }
  })

  ipcMain.handle('auth:get-token', async () => {
    try {
      if (!fs.existsSync(TOKEN_PATH)) return null
      const data = fs.readFileSync(TOKEN_PATH)
      if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.decryptString(data)
      }
      return data.toString('utf-8')
    } catch (e) {
      console.error('Get token error:', e)
      return null
    }
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
    try {
      const data = JSON.stringify({ email, password })
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(data)
        fs.writeFileSync(CRED_PATH, encrypted)
      } else {
        fs.writeFileSync(CRED_PATH, data, 'utf-8')
      }
    } catch (e) {
      console.error('Save credentials error:', e)
      throw e
    }
  })

  ipcMain.handle('auth:get-credentials', async () => {
    try {
      if (!fs.existsSync(CRED_PATH)) return null
      const data = fs.readFileSync(CRED_PATH)
      let raw: string
      if (safeStorage.isEncryptionAvailable()) {
        raw = safeStorage.decryptString(data)
      } else {
        raw = data.toString('utf-8')
      }
      return JSON.parse(raw) as { email: string; password: string }
    } catch (e) {
      console.error('Get credentials error:', e)
      return null
    }
  })
}
