# 01-quick-start

快速开始教程 - Claude Agent SDK 基础集成

## 特别注意
每一次文件上的变化都需要体现到当前的 `CLAUDE.md` 文档上，但是需要分辨是否要重构某个部分的描述还是采用新建或者追加的形式来显示

## 项目概述

这是一个 Claude Agent SDK 的快速入门项目，演示如何使用 SDK 构建一个基础的流式对话应用。

## 技术栈

- **Next.js 16.1.6** - App Router
- **React 19.2.3** - UI 框架
- **TypeScript 5** - 类型系统（strict mode）
- **Tailwind CSS 4** - 样式（含 Typography 插件）
- **Shadcn UI** - UI 组件库
- **Claude Agent SDK** - AI 对话能力
- **react-markdown** - Markdown 渲染
- **highlight.js** - 代码语法高亮
- **pnpm** - 包管理器

## 项目结构

```
01-quick-start/
├── packages/
│   └── core/                    # 核心类型定义包
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts         # 统一导出
│           ├── message.ts       # 消息类型
│           ├── session.ts       # 会话类型
│           ├── workspace.ts     # 工作空间类型
│           └── storage.ts       # 存储类型
│
├── app/
│   ├── page.tsx                 # 首页（聊天界面）
│   ├── layout.tsx               # 根布局
│   ├── globals.css              # 全局样式
│   └── api/
│       ├── chat/
│       │   └── route.ts         # 聊天 API Route
│       ├── sessions/
│       │   ├── route.ts         # 获取会话列表
│       │   └── [id]/
│       │       └── route.ts     # 获取单个会话详情
│       └── files/
│           └── route.ts         # 文件浏览 API
│
├── components/
│   ├── chat-interface.tsx       # 聊天 UI 组件（集成侧边栏）
│   ├── session-list.tsx         # 左侧会话历史列表
│   ├── file-explorer.tsx        # 右侧文件浏览器
│   ├── markdown-renderer.tsx    # Markdown 渲染组件
│   └── ui/                      # Shadcn UI 组件
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── scroll-area.tsx
│       ├── separator.tsx
│       └── sheet.tsx
│
├── lib/
│   ├── utils.ts                 # 工具函数（cn 等）
│   └── storage/                 # 本地存储实现
│       ├── index.ts             # 存储适配器
│       ├── config.ts            # 配置存储
│       └── session.ts           # 会话存储
│
├── .data/                       # 本地数据存储（gitignored）
│   ├── config.json              # 配置文件
│   └── sessions/                # 会话数据
│       └── session-xxx.jsonl    # JSONL 格式的对话记录
│
├── .env.local                   # 环境变量（gitignored）
├── .env.local.example           # 环境变量示例
├── pnpm-workspace.yaml          # pnpm workspace 配置
├── components.json              # Shadcn UI 配置
└── CLAUDE.md                    # 本文档
```

## 核心功能

### 1. 类型系统 (packages/core)

采用 monorepo 结构，将核心类型定义抽象到独立的 `@01-quick-start/core` 包中：

- **message.ts**: 消息相关类型（ChatMessage, MessageRole, MessageStats）
- **session.ts**: 会话管理类型（SessionConfig, SessionState, SessionResult）
- **workspace.ts**: 工作空间配置（WorkspaceConfig, EnvConfig, AgentOptions）
- **storage.ts**: 存储接口定义（StorageAdapter, StoragePaths）

### 2. 本地存储 (lib/storage)

基于文件系统的存储方案：

- **配置存储**: `.data/config.json` - 存储全局配置
- **会话存储**: `.data/sessions/*.jsonl` - JSONL 格式的对话记录
  - 第一行：会话元数据（SessionMetadata）
  - 后续行：消息记录（SessionMessageRecord）

### 3. API Route (app/api/chat/route.ts)

Next.js API Route 实现：

- 接收用户消息
- 调用 Claude Agent SDK 的 `query()` 函数
- 返回 SSE（Server-Sent Events）流式响应
- 自动保存会话和消息到本地存储

### 4. 聊天界面 (components/chat-interface.tsx)

使用 Shadcn UI 组件构建，采用三栏布局：

- **左侧边栏** - 会话历史列表（SessionList）
- **中间主区域** - 聊天消息和输入框
- **右侧边栏** - 文件浏览器（FileExplorer）

主要功能：
- 实时流式消息展示
- 自动滚动到底部
- 会话 ID 显示
- 输入框和发送按钮
- 会话切换和加载历史

### 5. 会话历史列表 (components/session-list.tsx)

左侧边栏组件，显示所有历史会话：

- 会话列表按更新时间倒序排列
- 显示会话 ID、时间戳和成本
- 点击会话可加载历史消息
- 当前选中的会话高亮显示
- 使用相对时间显示（如 "2h ago"）

### 6. 文件浏览器 (components/file-explorer.tsx)

右侧边栏组件，浏览工作目录文件：

- 显示当前工作目录的文件和文件夹
- 文件夹可展开/折叠
- 点击文件可在下方预览内容
- 过滤隐藏文件和 node_modules
- 显示文件大小
- 支持语法高亮的代码预览

### 7. Markdown 渲染器 (components/markdown-renderer.tsx)

专业的 Markdown 渲染组件，用于展示 AI 回复：

- **语法高亮** - 使用 highlight.js 支持多语言代码高亮
- **代码块** - 带语言标签和边框的代码块展示
- **表格支持** - 完整的 GFM 表格渲染
- **链接处理** - 自动在新标签页打开外部链接
- **排版优化** - 使用 Tailwind Typography 优化文本排版
- **样式定制** - 为标题、列表、引用等元素自定义样式

支持的 Markdown 特性：
- 标题（h1-h4）
- 列表（有序/无序）
- 代码块和行内代码
- 表格
- 引用块
- 链接和图片
- 加粗和斜体
- 分隔线

### 8. API Routes

**会话 API** (`/api/sessions`):
- `GET /api/sessions` - 获取所有会话列表
- `GET /api/sessions/[id]` - 获取单个会话详情（包含消息）

**文件 API** (`/api/files`):
- `GET /api/files?path=xxx&action=list` - 列出目录内容
- `GET /api/files?path=xxx&action=read` - 读取文件内容
- 路径安全检查，防止访问工作目录外的文件

## 环境变量配置

创建 `.env.local` 文件：

```bash
# 必需：Anthropic API Key
ANTHROPIC_API_KEY=your-api-key-here

# 可选：自定义 API 端点
# ANTHROPIC_BASE_URL=https://api.anthropic.com
```

## 开发命令

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 运行 ESLint
pnpm lint
```

## 使用说明

1. **配置 API Key**
   - 复制 `.env.local.example` 为 `.env.local`
   - 填入你的 Anthropic API Key

2. **启动开发服务器**
   ```bash
   pnpm dev
   ```

3. **访问应用**
   - 打开浏览器访问 `http://localhost:3000`
   - 左侧显示会话历史列表
   - 中间是聊天区域，输入消息并发送
   - 右侧显示工作目录文件，可以浏览和预览
   - 查看 Claude 的流式响应

4. **会话管理**
   - 点击左侧的历史会话可以切换对话
   - 每个会话的数据保存在 `.data/sessions/` 目录
   - 配置保存在 `.data/config.json`

5. **文件浏览**
   - 右侧文件浏览器显示当前工作目录
   - 点击文件夹可以展开查看内容
   - 点击文件可以在下方预览内容

## 核心概念

### 1. 流式响应

使用 Server-Sent Events (SSE) 实现流式响应：

```typescript
// API Route 返回流式响应
return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  },
});
```

前端通过 `fetch` 接收流式数据：

```typescript
const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // 处理流式数据
}
```

### 2. 会话管理

每个对话会话有唯一的 `sessionId`：

- 首次对话：自动生成新的 session ID
- 后续对话：使用相同的 session ID
- 会话切换：点击左侧历史会话可以加载历史消息
- 会话持久化：所有会话自动保存到本地 JSONL 文件

### 3. 三栏布局

应用采用三栏布局设计：

- **左侧边栏（256px）** - 会话历史列表
  - 显示所有历史会话
  - 按时间倒序排列
  - 显示成本和时间信息

- **中间主区域（flex-1）** - 聊天界面
  - 顶部 Header 显示标题和当前会话 ID
  - 中间消息列表区域
  - 底部输入框

- **右侧边栏（320px）** - 文件浏览器
  - 显示工作目录文件树
  - 支持文件预览
  - 可展开/折叠文件夹

### 4. JSONL 存储格式

每个会话文件是一个 JSONL 文件，每行是一个 JSON 对象：

```jsonl
{"type":"metadata","sessionId":"session-123","config":{...},"state":{...}}
{"type":"message","message":{"id":"msg-1","role":"user","content":"Hello"}}
{"type":"message","message":{"id":"msg-2","role":"assistant","content":"Hi!"}}
```

### 5. Markdown 渲染

AI 的回复使用 Markdown 渲染器展示：

**渲染流程**：
1. 用户消息：纯文本展示
2. AI 消息：通过 `react-markdown` 渲染
3. 代码块：使用 `highlight.js` 进行语法高亮
4. 排版：使用 Tailwind Typography 优化

**代码高亮示例**：
````markdown
```typescript
const message = "Hello, World!";
console.log(message);
```
````

渲染为带语法高亮的代码块，包含语言标签和复制功能。

## 后续扩展方向

- [x] 会话列表和历史记录查看
- [x] 会话恢复和继续对话
- [x] 文件浏览和预览
- [x] Markdown 渲染和代码高亮
- [ ] 工具调用（MCP Tools）
- [ ] 多模态支持（图片、文件）
- [ ] 自定义系统提示词
- [ ] Token 使用统计和成本追踪
- [ ] 文件编辑功能
- [ ] 代码块复制按钮

## 注意事项

- `.env.local` 和 `.data/` 目录已添加到 `.gitignore`，不会提交到版本控制
- 使用 TypeScript strict mode，必须定义所有类型
- 从不使用 `any` 类型，创建明确的接口定义
- 所有文件变化必须同步更新到本文档

## 相关资源

- [Claude Agent SDK 文档](https://platform.claude.com/docs/en/agent-sdk/typescript)
- [Next.js 文档](https://nextjs.org/docs)
- [Shadcn UI 文档](https://ui.shadcn.com)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
