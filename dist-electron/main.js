"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const tasks_js_1 = require("./ipc/tasks.js");
const projects_js_1 = require("./ipc/projects.js");
const auth_js_1 = require("./ipc/auth.js");
const sync_js_1 = require("./ipc/sync.js");
const tags_js_1 = require("./ipc/tags.js");
const logs_js_1 = require("./ipc/logs.js");
const serverConfig_js_1 = require("./ipc/serverConfig.js");
// __dirname 在 CommonJS 中全局可用，无需声明
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 600,
        show: false,
        frame: true,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        }
    });
    // 开发环境加载 Vite 开发服务器
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        // 生产环境加载打包后的文件
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// 应用准备就绪
electron_1.app.whenReady().then(() => {
    electron_1.Menu.setApplicationMenu(null);
    createWindow();
    // 注册 IPC 处理器
    (0, tasks_js_1.registerTaskHandlers)(mainWindow);
    (0, projects_js_1.registerProjectHandlers)(mainWindow);
    (0, auth_js_1.registerAuthHandlers)();
    (0, sync_js_1.registerSyncHandlers)();
    (0, tags_js_1.registerTagHandlers)(mainWindow);
    (0, logs_js_1.registerLogHandlers)();
    (0, serverConfig_js_1.registerServerConfigHandlers)();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
// 所有窗口关闭时退出应用（macOS 除外）
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
