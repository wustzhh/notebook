# Task Tracker - Jira 风格任务管理桌面应用

一个基于 Electron + Vue 3 + Element Plus 的桌面任务管理应用，类似 Jira。

## 技术栈

- **框架**: Electron 28 + Vue 3.5
- **UI 库**: Element Plus 2.13
- **状态管理**: Pinia 2
- **路由**: Vue Router 4
- **数据库**: SQL.js (SQLite)
- **构建工具**: Vite 5
- **语言**: TypeScript

## 功能特性

- 看板视图（Kanban Board）
- 列表视图
- 任务 CRUD（创建、读取、更新、删除）
- 拖拽任务改变状态
- 项目管理
- 任务筛选和搜索
- 本地数据持久化

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

启动 Vite 开发服务器（仅前端）：
```bash
npm run dev:vite
```

启动 Electron 桌面应用：
```bash
npm run dev:electron
```

### 构建生产版本（打包为独立 EXE）

```bash
npm run build
```

这个命令会依次执行：
1. `npm run build:vite` - 打包 Vue 前端代码到 `dist/`
2. `npm run build:electron` - 编译 Electron 主进程到 `dist-electron/`
3. `electron-builder` - 生成 Windows 可执行文件

**输出位置：** `release/` 目录

**生成的文件：**
- `Task Tracker Setup x.x.x.exe` - 安装程序（推荐分发）
- `Task Tracker x.x.x.exe` - 免安装便携版（在 `win-unpacked/` 目录）

---

### 只打包 Windows 版本（可选）

如果只想打包 Windows exe，可以分步执行：

```bash
# 1. 打包前端
npm run build:vite

# 2. 编译 Electron 主进程
npm run build:electron

# 3. 只打包 Windows 版本
npx electron-builder --win
```

---

### 打包注意事项

1. **首次打包较慢** - 需要下载 Electron 运行时和打包工具，耐心等待
2. **打包大小** - 约 100-150MB（包含 Electron 运行时）
3. **图标文件** - 确保 `public/icon.ico` 存在，否则打包会报错
4. **Node 版本** - 建议使用 Node.js 18 或更高版本

---

### 数据存储位置

打包后的应用数据存储在系统用户目录：

**Windows:**
```
C:\Users\<用户名>\AppData\Roaming\com.tasktracker.app\tasktracker.db
```

**快速访问数据目录：**
1. 按 `Win + R`
2. 输入 `%APPDATA%\com.tasktracker.app\`
3. 回车即可打开

**备份数据：** 复制 `tasktracker.db` 文件即可备份所有任务数据。

## 项目结构

```
task-tracker/
├── electron/              # Electron 主进程
│   ├── main.ts           # 主进程入口
│   ├── preload.ts        # 预加载脚本
│   ├── database.ts       # 数据库管理
│   └── ipc/              # IPC 处理器
│       ├── tasks.ts
│       └── projects.ts
│
├── src/                   # Vue 渲染进程
│   ├── components/       # Vue 组件
│   │   ├── common/       # 通用组件
│   │   ├── kanban/       # 看板组件
│   │   └── layout/       # 布局组件
│   ├── views/            # 页面视图
│   ├── stores/           # Pinia 状态管理
│   ├── services/         # API 服务层
│   ├── types/            # TypeScript 类型
│   └── router/           # 路由配置
│
├── package.json
├── vite.config.ts        # Vite 配置
├── tsconfig.json         # TypeScript 配置
└── electron-builder.yml  # Electron 打包配置
```

## 使用说明

### 创建任务
1. 点击右上角"新建任务"按钮
2. 填写任务标题、描述、状态、优先级等信息
3. 点击"确定"保存

### 拖拽任务
在看板视图中，可以直接拖拽任务卡片到其他状态列

### 编辑任务
点击任务卡片或列表中的任务即可编辑

### 项目管理
- 左侧边栏显示所有项目
- 点击"+"按钮创建新项目
- 点击项目名称切换当前项目

## 数据存储

应用数据存储在本地 SQLite 数据库中：
- Windows: `%APPDATA%/tasktracker.db`
- macOS: `~/Library/Application Support/tasktracker.db`
- Linux: `~/.config/tasktracker.db`

## 开发说明

### 添加新功能
1. 在 `src/types/` 中定义类型
2. 在 `electron/database.ts` 中添加数据库操作
3. 在 `electron/ipc/` 中添加 IPC 处理器
4. 在 `src/services/` 中封装服务
5. 在 `src/stores/` 中添加状态管理
6. 在 `src/components/` 或 `src/views/` 中创建 UI

### 调试
- 前端：浏览器 DevTools（开发模式自动打开）
- 后端：在 `electron/main.ts` 中设置断点

## License

MIT

---

## 远程同步（服务端部署）

### 环境要求

- Windows Server 2016+ 或 Windows 10/11
- Node.js 18+

### 部署步骤

```powershell
# 1. 将 server/ 目录复制到服务器，然后
cd C:\workspace\server
npm install

# 2. 创建账号
node cli.js add-user --email 邮箱 --password 密码

# 3. 开放防火墙 TCP 3000 端口

# 4. 启动服务
npm install -g pm2
pm2 start index.js --name tasktracker
pm2 save
```

### 账号管理

```powershell
node cli.js add-user         --email xxx --password xxx    # 创建账号
node cli.js list                                            # 列出所有用户
node cli.js del-user         --email xxx                   # 删除用户及数据
node cli.js reset-password   --email xxx --password xxx    # 重置密码
```

> 操作完账号后需执行 `pm2 restart tasktracker` 重启服务。

### 服务管理

```powershell
pm2 status                  # 查看状态
pm2 restart tasktracker     # 重启
pm2 logs tasktracker        # 查看日志
```

### 数据迁移

所有数据存储在 `server\data\app.db` 一个文件中，拷贝即可迁移。

### 客户端连接

设置页填入服务器地址 `http://IP:3000`，邮箱密码登录。
