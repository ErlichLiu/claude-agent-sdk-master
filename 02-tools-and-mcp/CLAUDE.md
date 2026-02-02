# 02-tools-and-mcp

工具调用和 MCP 集成教程 - Claude Agent SDK 进阶功能

## 特别注意

每一次文件上的变化都需要体现到当前的 `CLAUDE.md` 文档上，但是需要分辨是否要重构某个部分的描述还是采用新建或者追加的形式来显示。

## 项目概述

这是 Claude Agent SDK 教程系列的第二个项目，在 01-quick-start 的基础上进行了**重大架构升级**，引入了事件驱动的 Agent 封装层和工具活动可视化系统。

### 相比 01-quick-start 的核心改进

#### 1. **PromaAgent 架构** - 事件驱动的 SDK 封装

- **问题**：01 项目直接使用 SDK 的底层消息流，前端需要处理复杂的消息类型转换
- **解决方案**：引入 PromaAgent 作为中间层，将 SDK 消息转换为标准化的 AgentEvent
- **优势**：
  - 清晰的关注点分离（SDK ↔ PromaAgent ↔ UI）
  - 类型安全的事件接口
  - 无状态工具匹配（ToolIndex 替代 FIFO 队列）
  - 易于测试和维护

#### 2. **Monorepo 架构** - 代码组织升级

- **packages/core** - 核心类型定义（消息、会话、存储、事件）
- **packages/shared** - 共享逻辑（PromaAgent、工具匹配、配置）
- **优势**：类型复用、逻辑隔离、便于扩展

#### 3. **工具活动可视化系统**

- **ToolActivityManager** - 追踪工具调用的完整生命周期
- **工具活动组件** - 实时展示工具的运行状态、输入参数、执行结果
- **优势**：开发者可以清晰地看到 Agent 在做什么，便于调试和理解

#### 4. **增强的 UI 体验**

- 集成 **framer-motion** 实现流畅动画
- 新增 **loading-indicator** 和 **spinner** 组件
- 工具活动的实时可视化展示

### 适用场景

- 需要深入理解 Agent 工具调用机制
- 构建生产级的 Agent 应用
- 需要可视化调试工具调用过程
- 学习事件驱动架构设计

## 技术栈

### 核心框架
- **Next.js 16.1.6** - App Router
- **React 19.2.3** - UI 框架
- **TypeScript 5** - 类型系统（strict mode）
- **pnpm** - 包管理器（Workspace 模式）

### UI 和样式
- **Tailwind CSS 4** - 样式系统（含 Typography 插件）
- **Shadcn UI** - UI 组件库
- **framer-motion 12.30.0** - 动画库
- **lucide-react** - 图标库

### Agent 和 AI
- **@anthropic-ai/claude-agent-sdk 0.2.29** - Claude Agent SDK
- **PromaAgent** - 自研事件驱动封装层

### Markdown 和代码高亮
- **react-markdown 10.1.0** - Markdown 渲染
- **remark-gfm 4.0.1** - GitHub Flavored Markdown
- **rehype-highlight 7.0.2** - 代码语法高亮
- **highlight.js 11.11.1** - 语法高亮引擎

### 内部包（Workspace）
- **@02-tools-and-mcp/core** - 核心类型定义
- **@02-tools-and-mcp/shared** - 共享 Agent 逻辑

## 项目结构

```
02-tools-and-mcp/
├── packages/                           # Monorepo 内部包
│   ├── core/                          # 核心类型定义包
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts               # 统一导出
│   │       ├── message.ts             # 消息类型（ChatMessage, MessageRole）
│   │       ├── session.ts             # 会话类型（SessionConfig, SessionState）
│   │       ├── workspace.ts           # 工作空间配置
│   │       └── storage.ts             # 存储接口定义
│   │
│   └── shared/                        # 共享 Agent 逻辑包 ⭐ 新增
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts               # 统一导出
│           └── agent/
│               ├── index.ts           # Agent 模块导出
│               ├── agent-event.ts     # AgentEvent 类型定义
│               ├── proma-agent.ts     # PromaAgent 核心实现 ⭐
│               ├── tool-matching.ts   # 无状态工具匹配逻辑 ⭐
│               └── options.ts         # Agent 配置选项 ⭐
│
├── app/
│   ├── page.tsx                       # 首页（聊天界面）
│   ├── layout.tsx                     # 根布局
│   ├── globals.css                    # 全局样式
│   ├── test-components/               # 组件测试页面 ⭐ 新增
│   │   └── page.tsx
│   ├── test-tools/                    # 工具测试页面 ⭐ 新增
│   │   └── page.tsx
│   └── api/
│       ├── chat/
│       │   └── route.ts               # 聊天 API（使用 PromaAgent）
│       ├── sessions/
│       │   ├── route.ts               # 获取会话列表
│       │   └── [id]/
│       │       └── route.ts           # 获取单个会话详情
│       └── files/
│           └── route.ts               # 文件浏览 API
│
├── components/
│   ├── chat-interface.tsx             # 聊天 UI（集成工具活动展示）
│   ├── session-list.tsx               # 左侧会话历史列表
│   ├── file-explorer.tsx              # 右侧文件浏览器
│   ├── markdown-renderer.tsx          # Markdown 渲染组件
│   ├── tool-activity-icon.tsx         # 工具活动图标 ⭐ 新增
│   ├── tool-activity-list.tsx         # 工具活动列表 ⭐ 新增
│   ├── tool-activity-row.tsx          # 工具活动行 ⭐ 新增
│   └── ui/                            # Shadcn UI 组件
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── scroll-area.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── loading-indicator.tsx      # 加载指示器 ⭐ 新增
│       └── spinner.tsx                # 旋转加载器 ⭐ 新增
│
├── lib/
│   ├── utils.ts                       # 工具函数（cn 等）
│   ├── tool-activity.ts               # 工具活动管理器 ⭐ 新增
│   ├── tool-display.ts                # 工具显示逻辑 ⭐ 新增
│   ├── tool-icon-config.ts            # 工具图标配置 ⭐ 新增
│   └── storage/                       # 本地存储实现
│       ├── index.ts                   # 存储适配器
│       ├── config.ts                  # 配置存储
│       └── session.ts                 # 会话存储
│
├── .data/                             # 本地数据存储（gitignored）
│   ├── config.json                    # 配置文件
│   └── sessions/                      # 会话数据
│       └── session-xxx.jsonl          # JSONL 格式的对话记录
│
├── .env.local                         # 环境变量（gitignored）
├── .env.local.example                 # 环境变量示例
├── pnpm-workspace.yaml                # pnpm workspace 配置
├── components.json                    # Shadcn UI 配置
└── CLAUDE.md                          # 本文档
```

**标注说明**：
- ⭐ 表示相比 01-quick-start 新增的文件或目录
- 核心新增：`packages/shared`、工具活动相关组件和逻辑

## 核心架构

### 1. PromaAgent - 事件驱动的 SDK 封装层

**位置**：`packages/shared/src/agent/proma-agent.ts`

PromaAgent 是本项目的核心创新，它在 Claude Agent SDK 和前端 UI 之间提供了一个清晰的抽象层。

#### 设计原则

1. **事件驱动**：发出标准化的 AgentEvent 对象，而非底层 SDK 消息
2. **无状态工具匹配**：使用 ToolIndex 而非 FIFO 队列，避免状态管理复杂性
3. **关注点分离**：仅处理事件转换，不涉及存储/HTTP/UI 逻辑
4. **幂等性**：相同输入产生相同输出，便于测试和调试

#### 核心接口

```typescript
export interface PromaAgentConfig {
  apiKey: string;                      // Anthropic API 密钥
  model?: string;                      // 模型（默认：claude-sonnet-4-5）
  workingDirectory: string;            // 文件操作的工作目录
  resumeSessionId?: string;            // 恢复会话 ID
  onSessionIdUpdate?: (id: string) => void;  // 会话 ID 回调
  useFullToolSet?: boolean;            // 是否使用完整工具集
  mcpServers?: Record<string, McpServerConfig>;  // MCP 服务器配置
}

export class PromaAgent {
  async *chat(userMessage: string): AsyncGenerator<AgentEvent> {
    // 流式返回 AgentEvent
  }
}
```

#### AgentEvent 类型

**位置**：`packages/shared/src/agent/agent-event.ts`

标准化的事件类型，位于 SDK 消息和前端渲染之间：

```typescript
export type AgentEvent =
  | { type: 'status'; message: string }                    // 状态更新
  | { type: 'info'; message: string }                      // 信息提示
  | { type: 'text_delta'; text: string; turnId?: string }  // 流式文本块
  | { type: 'text_complete'; text: string; isIntermediate?: boolean; turnId?: string }  // 完整文本
  | { type: 'tool_start'; toolName: string; toolUseId: string; input: Record<string, unknown>; ... }  // 工具开始
  | { type: 'tool_result'; toolUseId: string; result: string; isError: boolean; ... }  // 工具结果
  | { type: 'error'; message: string }                     // 错误
  | { type: 'complete'; usage?: AgentEventUsage };         // 完成（含使用量统计）
```

#### 事件流程

```
用户消息 → PromaAgent.chat()
  ↓
SDK query() → 底层 SDKMessage 流
  ↓
convertSDKMessage() → 转换为 AgentEvent
  ↓
前端消费 AgentEvent → 更新 UI
```

#### 核心转换逻辑

PromaAgent 的核心方法 `convertSDKMessage()` 负责将 SDK 的各种消息类型转换为统一的 AgentEvent：

- **assistant 消息** → 提取文本和工具启动事件
- **stream_event** → 处理流式文本增量和工具启动
- **user 消息** → 提取工具结果
- **result 消息** → 生成完成事件和使用量统计
- **system 消息** → 处理压缩等状态信息

#### 无状态工具匹配（ToolIndex）

**位置**：`packages/shared/src/agent/tool-matching.ts`

传统的工具匹配使用 FIFO 队列，容易出现状态不一致的问题。PromaAgent 采用 **ToolIndex** 实现无状态匹配：

```typescript
export class ToolIndex {
  private tools = new Map<string, ToolInfo>();

  // 注册工具启动
  register(toolUseId: string, info: ToolInfo): void;

  // 查找工具信息
  lookup(toolUseId: string): ToolInfo | undefined;
}
```

**优势**：
- 通过 `toolUseId` 直接匹配，无需维护队列状态
- 支持乱序到达的工具结果
- 易于测试和调试

### 2. 工具活动可视化系统

工具活动系统提供了完整的工具调用生命周期追踪和可视化展示。

#### ToolActivityManager

**位置**：`lib/tool-activity.ts`

核心管理器，负责将 AgentEvent 转换为 ToolActivity 状态：

```typescript
export interface ToolActivity {
  id: string;                          // 唯一标识（toolUseId）
  type: ActivityType;                  // 活动类型
  status: ActivityStatus;              // 当前状态
  toolName?: string;                   // 工具名称
  toolInput?: Record<string, unknown>; // 输入参数
  intent?: string;                     // LLM 生成的意图描述
  result?: string;                     // 工具结果
  error?: string;                      // 错误信息
  startTime?: number;                  // 开始时间
  endTime?: number;                    // 结束时间
  // ... 更多字段
}

export class ToolActivityManager {
  handleEvent(event: AgentEvent): void;        // 处理事件
  getActivities(): ToolActivity[];             // 获取所有活动
  getRunningActivities(): ToolActivity[];      // 获取运行中的活动
  subscribe(listener: (activities: ToolActivity[]) => void): () => void;  // 订阅变化
}
```

**设计原则**：
- 无状态转换：每个事件独立处理
- 幂等性：相同事件多次处理产生相同结果
- 实时更新：立即反映状态变化

#### 工具活动组件

**ToolActivityList** (`components/tool-activity-list.tsx`)
- 展示所有工具活动的列表
- 支持折叠/展开
- 实时更新状态

**ToolActivityRow** (`components/tool-activity-row.tsx`)
- 单个工具活动的展示行
- 显示工具名称、状态、执行时间
- 展示输入参数和结果

**ToolActivityIcon** (`components/tool-activity-icon.tsx`)
- 根据工具类型显示对应图标
- 状态指示（运行中、完成、错误）

#### 工具显示配置

**位置**：`lib/tool-icon-config.ts`

为不同类型的工具配置图标和显示名称：

```typescript
export const toolIconConfig: Record<string, ToolIconConfig> = {
  'Read': { icon: FileText, color: 'text-blue-500' },
  'Write': { icon: Edit, color: 'text-green-500' },
  'Bash': { icon: Terminal, color: 'text-purple-500' },
  // ... 更多工具配置
};
```

### 3. 类型系统 (packages/core)

采用 monorepo 结构，将核心类型定义抽象到独立的 `@02-tools-and-mcp/core` 包中：

- **message.ts**: 消息相关类型（ChatMessage, MessageRole, MessageStats）
- **session.ts**: 会话管理类型（SessionConfig, SessionState, SessionResult）
- **workspace.ts**: 工作空间配置（WorkspaceConfig, EnvConfig, AgentOptions）
- **storage.ts**: 存储接口定义（StorageAdapter, StoragePaths）

### 4. 本地存储系统 (lib/storage)

基于文件系统的存储方案：

- **配置存储**: `.data/config.json` - 存储全局配置
- **会话存储**: `.data/sessions/*.jsonl` - JSONL 格式的对话记录
  - 第一行：会话元数据（SessionMetadata）
  - 后续行：消息记录（SessionMessageRecord）

### 5. API Routes

#### 聊天 API (app/api/chat/route.ts)

使用 PromaAgent 处理聊天请求：

```typescript
const agent = new PromaAgent({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  workingDirectory: process.cwd(),
  resumeSessionId: sessionId,
  onSessionIdUpdate: (id) => { /* 保存会话 ID */ },
});

for await (const event of agent.chat(userMessage)) {
  // 将 AgentEvent 转换为 SSE 格式
  writer.write(`data: ${JSON.stringify(event)}\n\n`);
}
```

#### 会话 API (app/api/sessions)

- `GET /api/sessions` - 获取所有会话列表
- `GET /api/sessions/[id]` - 获取单个会话详情（包含消息）

#### 文件 API (app/api/files)

- `GET /api/files?path=xxx&action=list` - 列出目录内容
- `GET /api/files?path=xxx&action=read` - 读取文件内容
- 路径安全检查，防止访问工作目录外的文件

### 6. UI 组件

#### 聊天界面 (components/chat-interface.tsx)

使用 Shadcn UI 组件构建，采用三栏布局：

- **左侧边栏（256px）** - 会话历史列表（SessionList）
- **中间主区域（flex-1）** - 聊天消息和输入框，集成工具活动展示
- **右侧边栏（320px）** - 文件浏览器（FileExplorer）

主要功能：
- 实时流式消息展示
- 工具活动实时可视化
- 自动滚动到底部
- 会话切换和加载历史

#### Markdown 渲染器 (components/markdown-renderer.tsx)

专业的 Markdown 渲染组件，用于展示 AI 回复：

- **语法高亮** - 使用 highlight.js 支持多语言代码高亮
- **代码块** - 带语言标签和边框的代码块展示
- **表格支持** - 完整的 GFM 表格渲染
- **链接处理** - 自动在新标签页打开外部链接
- **排版优化** - 使用 Tailwind Typography 优化文本排版

支持的 Markdown 特性：
- 标题（h1-h4）
- 列表（有序/无序）
- 代码块和行内代码
- 表格
- 引用块
- 链接和图片
- 加粗和斜体
- 分隔线

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
# 安装依赖（在项目根目录）
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

### 1. 配置 API Key

```bash
# 复制环境变量示例文件
cp .env.local.example .env.local

# 编辑 .env.local，填入你的 Anthropic API Key
```

### 2. 启动开发服务器

```bash
pnpm dev
```

### 3. 访问应用

打开浏览器访问 `http://localhost:3000`

**界面布局**：
- **左侧边栏** - 会话历史列表，点击可切换会话
- **中间主区域** - 聊天界面
  - 顶部：标题和当前会话 ID
  - 中间：消息列表（支持 Markdown 渲染）
  - 工具活动区域：实时显示工具调用状态
  - 底部：输入框和发送按钮
- **右侧边栏** - 文件浏览器，可浏览和预览文件

### 4. 工具活动可视化

当 Agent 调用工具时，你会看到：
- 工具名称和图标
- 运行状态（运行中/完成/错误）
- 输入参数
- 执行结果
- 执行时长

这对于理解 Agent 的工作流程和调试非常有帮助。

### 5. 会话管理

- 每个对话会话有唯一的 `sessionId`
- 首次对话：自动生成新的 session ID
- 后续对话：使用相同的 session ID
- 会话切换：点击左侧历史会话可以加载历史消息
- 会话持久化：所有会话自动保存到 `.data/sessions/` 目录

## 核心概念

### 1. 事件驱动架构

本项目采用事件驱动架构，数据流如下：

```
用户输入 → API Route → PromaAgent → AgentEvent 流 → 前端消费
                            ↓
                    ToolActivityManager
                            ↓
                    工具活动可视化
```

**优势**：
- 清晰的关注点分离
- 易于测试和调试
- 支持多种消费方式（UI、日志、监控等）

### 2. 流式响应 (SSE)

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
  const text = decoder.decode(value);
  // 解析 SSE 格式的 AgentEvent
}
```

### 3. 无状态工具匹配

传统方案使用 FIFO 队列匹配工具启动和结果，容易出现状态不一致。

**PromaAgent 的方案**：
- 使用 `ToolIndex` 通过 `toolUseId` 直接匹配
- 支持乱序到达的工具结果
- 无需维护复杂的队列状态

### 4. JSONL 存储格式

每个会话文件是一个 JSONL 文件，每行是一个 JSON 对象：

```jsonl
{"type":"metadata","sessionId":"session-123","config":{...},"state":{...}}
{"type":"message","message":{"id":"msg-1","role":"user","content":"Hello"}}
{"type":"message","message":{"id":"msg-2","role":"assistant","content":"Hi!"}}
```

**优势**：
- 追加写入，性能高
- 易于解析和恢复
- 支持流式读取

### 5. Monorepo 架构

使用 pnpm workspace 管理多个内部包：

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

**优势**：
- 类型定义复用（@02-tools-and-mcp/core）
- 逻辑隔离（@02-tools-and-mcp/shared）
- 便于测试和维护

## 测试页面

项目包含两个测试页面，用于开发和调试：

### 1. 组件测试页面 (app/test-components/page.tsx)

访问 `http://localhost:3000/test-components` 可以测试各种 UI 组件：
- 工具活动组件
- 加载指示器
- 其他 UI 组件

### 2. 工具测试页面 (app/test-tools/page.tsx)

访问 `http://localhost:3000/test-tools` 可以测试工具调用功能：
- 测试不同类型的工具
- 验证工具活动追踪
- 调试工具显示逻辑

## 后续扩展方向

### 已完成 ✅

- [x] 会话列表和历史记录查看
- [x] 会话恢复和继续对话
- [x] 文件浏览和预览
- [x] Markdown 渲染和代码高亮
- [x] PromaAgent 事件驱动架构
- [x] 工具活动可视化系统
- [x] Monorepo 架构
- [x] 无状态工具匹配

### 计划中 📋

- [ ] **MCP 服务器集成** - 集成更多 MCP 工具
- [ ] **多模态支持** - 图片、文件上传和处理
- [ ] **自定义系统提示词** - 允许用户自定义 Agent 行为
- [ ] **Token 使用统计** - 详细的成本追踪和分析
- [ ] **文件编辑功能** - 在文件浏览器中直接编辑文件
- [ ] **代码块复制按钮** - 一键复制代码
- [ ] **工具调用历史** - 查看和分析历史工具调用
- [ ] **性能监控** - 工具执行时间、成本等指标
- [ ] **导出会话** - 导出为 Markdown、JSON 等格式
- [ ] **主题切换** - 支持深色/浅色主题

## 注意事项

### 开发规范

- **TypeScript Strict Mode**：必须定义所有类型，从不使用 `any` 类型
- **接口优先**：创建明确的接口定义，避免类型推断
- **文档同步**：所有文件变化必须同步更新到本文档

### 安全性

- `.env.local` 和 `.data/` 目录已添加到 `.gitignore`，不会提交到版本控制
- 文件 API 包含路径安全检查，防止访问工作目录外的文件
- API Key 仅在服务端使用，不会暴露到前端

### 性能优化

- 使用流式响应减少首字节时间
- JSONL 格式支持追加写入，避免重写整个文件
- 工具活动管理器采用事件驱动，避免轮询

### 架构原则

- **关注点分离**：PromaAgent 只负责事件转换，不涉及存储/HTTP/UI
- **无状态设计**：ToolIndex 避免复杂的状态管理
- **类型安全**：所有接口都有明确的类型定义
- **可测试性**：核心逻辑独立于框架，易于单元测试

## 相关资源

### 官方文档
- [Claude Agent SDK 文档](https://platform.claude.com/docs/en/agent-sdk/typescript)
- [Anthropic API 文档](https://docs.anthropic.com/)
- [Next.js 文档](https://nextjs.org/docs)
- [React 19 文档](https://react.dev/)

### UI 和样式
- [Shadcn UI 文档](https://ui.shadcn.com)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Framer Motion 文档](https://www.framer.com/motion/)
- [Lucide Icons](https://lucide.dev/)

### Markdown 和代码高亮
- [react-markdown](https://github.com/remarkjs/react-markdown)
- [remark-gfm](https://github.com/remarkjs/remark-gfm)
- [rehype-highlight](https://github.com/rehypejs/rehype-highlight)
- [highlight.js](https://highlightjs.org/)

### 工具和包管理
- [pnpm 文档](https://pnpm.io/)
- [pnpm Workspace](https://pnpm.io/workspaces)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)

## 总结

02-tools-and-mcp 项目在 01-quick-start 的基础上进行了重大架构升级：

1. **PromaAgent** - 事件驱动的 SDK 封装层，提供清晰的抽象
2. **工具活动可视化** - 实时追踪和展示工具调用过程
3. **Monorepo 架构** - 更好的代码组织和复用
4. **无状态工具匹配** - 更可靠的工具调用处理

这些改进使得项目更适合构建生产级的 Agent 应用，同时也为后续的功能扩展奠定了坚实的基础。

---

**最后更新**：2026-02-03
