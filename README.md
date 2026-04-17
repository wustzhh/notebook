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

### 构建生产版本

```bash
npm run build
```

构建后的可执行文件将位于 `release/` 目录。

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
