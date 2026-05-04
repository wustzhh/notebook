# Task Tracker - Jira 风格任务管理桌面应用

一个基于 Electron + Vue 3 + Element Plus 的桌面任务管理应用。

## 技术栈

- **框架**: Electron 28 + Vue 3.5
- **UI 库**: Element Plus 2.13
- **状态管理**: Pinia 2
- **路由**: Vue Router 4
- **数据库**: SQL.js (SQLite)
- **构建工具**: Vite 5
- **语言**: TypeScript
- **服务端**: Express + SQL.js + JWT

## 功能特性

### 任务管理
- 看板视图（拖拽卡片改变状态）
- 列表视图（树形父子任务展示）
- 任务 CRUD（创建、编辑、删除）
- 子任务（添加、完成进度条）
- 任务筛选（按状态、优先级）
- 全文搜索

### 项目管理
- 多项目切换
- 项目标记完成/重新激活
- 项目删除（含确认弹窗）
- 已完成项目折叠显示

### 标签系统
- 在新建/编辑任务时输入标签名，回车即可创建
- 彩色标签显示在任务卡片和列表
- 详情面板中可增删标签

### 评论与活动日志
- 任务详情面板 [详情]/[活动] 切 tab
- 手动添加评论
- 双击评论文字可编辑
- hover 出现 × 可删除
- 自动记录状态变更、优先级变更等操作历史

### 远程同步
- 自建服务端，多设备同步
- 服务器 CLI 管理账号
- 登录后首次选择数据方向（上传/下载）
- 手动同步 / 仅上传 / 仅下载
- 60 秒自动同步
- 数据离线可用，在线自动推送
- 项目、任务、标签、评论全部同步
- 删除操作同步至服务器
- 清空本地存档一键重置

### 其他
- 暗色模式
- 侧边栏可折叠

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

纯前端开发（浏览器运行，不含 Electron）：
```bash
npm run dev:vite
```

Electron 桌面应用：
```bash
npm run dev:electron
```

### 构建 Windows 安装包

```bash
npm run build
```

输出：`release/Task Tracker Setup 1.0.0.exe`

## 项目结构

```
task-tracker/
├── electron/              # Electron 主进程
│   ├── main.ts           # 主进程入口
│   ├── preload.ts        # 预加载脚本
│   ├── database.ts       # 数据库管理
│   └── ipc/              # IPC 处理器
│       ├── tasks.ts
│       ├── projects.ts
│       ├── tags.ts
│       ├── logs.ts
│       ├── auth.ts
│       └── sync.ts
├── server/               # 服务端
│   ├── index.js          # Express 入口
│   ├── database.js       # SQLite
│   ├── cli.js            # 账号管理工具
│   ├── middleware/
│   │   └── auth.js       # JWT 认证
│   └── routes/
│       ├── auth.js       # 登录 API
│       └── sync.js       # 同步 API
├── src/                   # Vue 渲染进程
│   ├── components/
│   │   ├── common/       # 通用组件（StatusTag, PriorityBadge, DarkModeToggle）
│   │   ├── kanban/       # 看板组件（KanbanBoard, KanbanColumn, KanbanCard）
│   │   └── layout/       # 布局组件（AppSidebar, TopBar, SyncStatus）
│   ├── views/            # 页面（ProjectView, Settings）
│   ├── stores/           # Pinia 状态管理
│   ├── services/         # API 服务层
│   ├── types/            # TypeScript 类型定义
│   └── router/           # 路由配置
├── package.json
├── vite.config.ts
├── tsconfig.json
└── electron-builder.yml
```

## 使用说明

### 看板 / 列表
选中项目后，内容区顶部有 [看板] [列表] 切换按钮。看板支持拖拽卡片改变任务状态。

### 创建任务
点顶部"新建任务"按钮，填写标题、描述、状态、优先级、日期、标签后确定。

### 编辑任务
点击任务卡片或列表中任务，右侧详情面板可点字段直接编辑。

### 子任务
详情面板底部"添加子任务"，输入标题回车。勾选 checkbox 标记完成，进度条自动更新。

### 标签
新建任务时在标签下拉输入名称回车即创建。详情面板中也可增删。

### 评论
详情面板 [活动] tab，底部输入框发评论。双击文字编辑，hover 出现 × 删除。

### 项目管理
侧边栏"活跃"区显示进行中项目，"已完成"分组默认折叠。hover 出现 `···` 菜单：标记完成/激活/删除。

## 远程同步

### 服务端部署

```powershell
# 1. 将 server/ 目录上传到服务器
cd C:\workspace\server
npm install
cp .env.example .env
# 编辑 .env 修改 JWT_SECRET

# 2. 创建账号
node cli.js add-user --email xxx@qq.com --password 密码

# 3. 开放防火墙 TCP 3000 端口

# 4. 启动
npm install -g pm2
pm2 start index.js --name tasktracker
pm2 save
```

### 账号管理

```powershell
node cli.js add-user         --email xxx --password xxx   # 创建账号
node cli.js list                                           # 列出所有用户
node cli.js del-user         --email xxx                   # 删除用户及数据
node cli.js reset-password   --email xxx --password xxx    # 重置密码
pm2 restart tasktracker
```

### 服务管理

```powershell
pm2 status              # 查看状态
pm2 restart tasktracker # 重启
pm2 logs tasktracker    # 查看日志
```

### 客户端连接

Settings → 填入服务器地址 `http://IP:3000`、邮箱、密码 → 登录 → 选择数据方向。

### 数据迁移

所有数据存储在 `server\data\app.db` 一个文件，拷贝即可迁移服务器。

### 同步按钮说明

| 按钮 | 作用 |
|------|------|
| 手动同步 | 先上传本地变更，再下载服务器变更 |
| 仅上传 | 只把本地数据推到服务器 |
| 仅下载 | 只从服务器拉数据到本地 |
| 清空本地存档 | 删除本地全部数据（需重新下载） |

## 数据存储

本地数据：`%APPDATA%\task-tracker\tasktracker.db`

服务端数据：`server\data\app.db`

## License

MIT
