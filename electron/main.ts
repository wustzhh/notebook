import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { registerTaskHandlers } from './ipc/tasks.js'
import { registerProjectHandlers } from './ipc/projects.js'
import { registerAuthHandlers } from './ipc/auth.js'
import { registerSyncHandlers } from './ipc/sync.js'

// __dirname 在 CommonJS 中全局可用，无需声明

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    show: false,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  })

  // 开发环境加载 Vite 开发服务器
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // 生产环境加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 应用准备就绪
app.whenReady().then(() => {
  createWindow()

  // 注册 IPC 处理器
  registerTaskHandlers(mainWindow!)
  registerProjectHandlers(mainWindow!)
  registerAuthHandlers()
  registerSyncHandlers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
