# Claude Cursor - 里程碑计划

## 里程碑总览

| 里程碑 | 名称 | 说明 |
|--------|------|------|
| M1 | 项目初始化与后端核心 | 搭建项目骨架，实现会话管理核心逻辑 |
| M2 | REST API 与 WebSocket | 完成全部后端接口，支持状态推送 |
| M3 | 前端基础框架与布局 | Vue 项目搭建，深色主题，整体布局 |
| M4 | 前端功能对接 | 前后端联调，完成所有交互功能 |
| M5 | 视觉打磨与收尾 | UI 动效优化，异常处理，生产部署 |

---

## M1 - 项目初始化与后端核心

> 目标：搭建项目骨架，实现端口分配和 ttyd 进程管理的核心逻辑

### 任务清单

- [ ] **M1.1** 初始化项目结构
  - 创建 `server/`、`frontend/` 目录结构
  - 初始化 `package.json`，安装后端依赖（express、ws、dotenv）
  - 创建 `.gitignore`

- [ ] **M1.2** 实现端口管理服务 `server/services/port-manager.js`
  - 维护端口池（默认范围 7681-7780）
  - 分配可用端口、释放端口
  - 端口冲突检测与自动跳过

- [ ] **M1.3** 实现会话管理服务 `server/services/session-manager.js`
  - 会话数据结构定义（名称、端口、PID、状态、创建时间）
  - 创建会话：校验名称 → 分配端口 → 启动 ttyd 子进程
  - 停止会话：终止 ttyd 进程，保留 tmux session
  - 删除会话：终止 ttyd 进程 + `tmux kill-session`
  - 重启会话：重新分配端口并启动 ttyd
  - 监听子进程退出事件，自动更新状态

- [ ] **M1.4** 进程生命周期管理
  - 注册 `SIGINT`/`SIGTERM` 信号处理，退出时清理所有 ttyd 子进程
  - ttyd 进程异常退出时标记会话为"已停止"

### 验收标准

- 可通过代码调用创建/停止/删除/重启会话
- ttyd 进程正常启动并可通过浏览器直接访问对应端口
- 主进程退出时所有 ttyd 子进程被正确清理

---

## M2 - REST API 与 WebSocket

> 目标：基于 M1 的核心服务，封装 HTTP 接口和 WebSocket 状态推送

### 任务清单

- [ ] **M2.1** 搭建 Express 服务入口 `server/index.js`
  - 加载配置（PORT、HOST、端口范围）
  - 挂载路由和中间件
  - 启动 HTTP 服务

- [ ] **M2.2** 实现会话路由 `server/routes/sessions.js`
  - `GET /api/sessions` — 返回所有会话列表
  - `POST /api/sessions` — 创建新会话（body: `{ name }`)
  - `DELETE /api/sessions/:name` — 删除会话
  - `POST /api/sessions/:name/stop` — 停止会话
  - `POST /api/sessions/:name/restart` — 重启会话
  - 统一错误响应格式

- [ ] **M2.3** 实现 WebSocket 服务 `server/ws.js`
  - 基于 `ws` 库创建 WebSocket Server，路径 `/ws`
  - 会话状态变更时广播事件给所有连接的客户端
  - 事件类型：`session:created`、`session:stopped`、`session:deleted`、`session:exited`
  - 消息格式：`{ event, data }`

- [ ] **M2.4** 集成会话管理器与 WebSocket
  - 会话管理器触发状态变更时通知 WebSocket 模块广播
  - 使用 EventEmitter 解耦管理器与推送逻辑

### 验收标准

- 使用 curl 或 Postman 可完成所有 API 的调用并得到正确响应
- WebSocket 客户端连接后能收到会话状态变更的实时推送
- API 参数校验失败时返回明确的错误信息

---

## M3 - 前端基础框架与布局

> 目标：搭建 Vue 3 前端项目，完成深色科技感主题和整体页面布局

### 任务清单

- [ ] **M3.1** 初始化 Vue 3 项目
  - 使用 Vite 创建 `frontend/` 项目
  - 安装依赖：pinia（状态管理）
  - 配置 `vite.config.js` 开发代理（将 `/api` 和 `/ws` 代理到后端）

- [ ] **M3.2** 全局样式与主题 `frontend/src/styles/global.css`
  - 深色背景色（`#0a0a0f`）
  - 定义 CSS 变量：主色青色 `#00ffd5`、辅色紫色 `#b44aff`
  - 全局字体、滚动条样式
  - 毛玻璃效果通用 class

- [ ] **M3.3** 整体布局 `App.vue`
  - 左侧侧边栏 + 右侧终端区域的 flex 布局
  - 顶部工具栏（项目名称、侧边栏折叠按钮）
  - 侧边栏折叠/展开逻辑

- [ ] **M3.4** 侧边栏组件 `Sidebar.vue`
  - 会话卡片列表区域
  - 底部"新建会话"按钮
  - 折叠状态下仅显示图标

- [ ] **M3.5** 会话卡片组件 `SessionCard.vue`
  - 显示会话名称
  - 状态指示灯（绿色/灰色圆点）
  - 停止、删除操作按钮（图标按钮）
  - 选中态高亮样式

### 验收标准

- 前端项目可正常启动，页面展示深色主题布局
- 侧边栏可折叠/展开
- 使用静态 mock 数据可渲染会话卡片列表

---

## M4 - 前端功能对接

> 目标：前后端联调，完成所有交互功能，实现完整的会话管理流程

### 任务清单

- [ ] **M4.1** 状态管理 `frontend/src/stores/sessions.js`
  - 使用 Pinia 管理会话列表、当前选中会话
  - 封装 API 调用方法（获取列表、创建、停止、删除、重启）
  - WebSocket 连接管理与事件监听

- [ ] **M4.2** 新建会话弹窗 `CreateDialog.vue`
  - 模态框 UI（毛玻璃背景遮罩）
  - 会话名称输入框，实时校验格式（字母、数字、短横线、下划线）
  - 确认/取消按钮
  - 创建成功后自动关闭弹窗并选中新会话

- [ ] **M4.3** 终端显示区域 `TerminalView.vue`
  - 根据当前选中会话，通过 iframe 加载 `http://<host>:<ttyd-port>`
  - 无选中会话时显示欢迎引导页
  - iframe 自适应容器尺寸

- [ ] **M4.4** 交互逻辑串联
  - 点击会话卡片切换终端
  - 停止按钮调用停止 API 并更新状态
  - 删除按钮二次确认后调用删除 API
  - WebSocket 事件驱动列表自动刷新

### 验收标准

- 可通过界面完成会话的创建、切换、停止、删除、重启全流程
- 终端 iframe 正常加载并可交互
- 多个浏览器窗口可同时访问同一会话
- WebSocket 断线后页面仍可通过手动刷新获取最新状态

---

## M5 - 视觉打磨与收尾

> 目标：优化 UI 动效细节，完善异常处理，配置生产环境部署方案

### 任务清单

- [ ] **M5.1** 动画与过渡效果
  - 侧边栏折叠/展开平滑过渡
  - 会话卡片出现/消失动画（fade + slide）
  - 状态指示灯呼吸闪烁效果（运行中）
  - 按钮 hover 发光效果
  - 弹窗打开/关闭动画

- [ ] **M5.2** 交互体验优化
  - 操作按钮 loading 状态（防止重复点击）
  - 删除会话二次确认弹窗
  - 操作成功/失败的 toast 提示
  - WebSocket 断线自动重连（指数退避）

- [ ] **M5.3** 生产环境部署
  - 前端 `vite build` 构建产物输出到 `server/public/`
  - Express 配置静态文件服务，托管前端构建产物
  - 添加启动脚本 `npm start`（生产）和 `npm run dev`（开发）
  - 编写 `README.md`：安装依赖、环境要求（ttyd、tmux）、启动方式

### 验收标准

- 所有动画过渡流畅，无卡顿
- 操作反馈明确（loading、toast、确认弹窗）
- `npm start` 一键启动，浏览器访问即可使用
- 局域网内其他设备可正常访问和使用
