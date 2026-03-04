# Claude Agent SDK 系列教程 - 第一章：快速入门

> **🎯 教程定位**
> 本教程是 **Claude Agent SDK 系列教程的第一部分**，旨在帮助你快速上手并理解 SDK 的核心概念。我们将从零开始构建一个基础的流式对话应用，为后续更复杂的功能打下坚实基础。

## 📖 系列教程路线图

本系列采用**渐进式学习路径**，每一章都在前一章的基础上递进：

- **第一章（本章）**：快速入门 - 核心概念与基础对话 ✅
- **第二章**：工具调用 - 集成 MCP Tools，实现 Agent 能力
- **第三章**：多模态支持 - 图片、文件等富媒体处理
- **第四章**：高级特性 - 自定义系统提示、成本追踪、流式优化

## 💡 设计哲学

**软件的本质，归根结底是对状态的优雅处理。**

无论是 Claude Agent SDK 的会话状态、React 的组件状态，还是未来的 Proma 开源项目，核心都是如何优雅地管理和转换状态。本系列教程将这一理念贯穿始终，帮助你建立系统化的思维模型。

> **✨ 关于本教程**
> 本教程的大部分内容由 Claude Code 编写而成。每个项目都配有详尽的 `CLAUDE.md` 文档作为开发指引。我强烈建议你在学习的基础上进行实验和改动——**实践是最好的老师**。

---

## 🎓 第一章学习目标

完成本章后，你将掌握：

1. **Claude Agent SDK 基础**
   - 理解 Workspace（工作区）和 Session（会话）的概念
   - 掌握 SDK 的核心消息类型和流式响应机制

2. **上下文管理机制的范式转变**
   - 理解 Agent SDK 如何自动管理对话上下文
   - 区别于传统 LLM 的手动 message 拼接模式
   - 通过 `resume` 参数无缝恢复会话历史

3. **基于文件系统的状态管理**
   - 了解 Agent SDK 如何利用本地文件系统存储会话
   - 实现 JSONL 格式的会话持久化

4. **流式对话应用架构**
   - 构建 Next.js App Router + SSE 的流式响应
   - 实现类型安全的 Monorepo 项目结构

5. **基础 UI 交互**
   - 三栏布局：会话列表、聊天界面、文件浏览
   - Markdown 渲染与代码高亮

> **⚠️ 本章的局限性**
> 为了聚焦核心概念，本章**暂不包含**工具调用（MCP Tools）和外部数据源的渲染。这些高级特性将在后续章节中详细讲解。

---

## ⚡ 快速开始

### 前置要求

- Node.js 18+
- pnpm 包管理器
- Anthropic API Key（[获取地址](https://console.anthropic.com/)）

### 三步启动

**1️⃣ 安装依赖**

```bash
pnpm install
```

**2️⃣ 配置 API Key**

```bash
# 复制环境变量示例
cp .env.local.example .env.local

# 编辑 .env.local，填入你的 API Key
ANTHROPIC_API_KEY=your-api-key-here
```

**3️⃣ 启动开发服务器**

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000)，开始你的第一次对话！

---

## ✨ 项目特性

本章实现的核心功能：

| 特性 | 说明 | 技术实现 |
|------|------|----------|
| 🔄 **流式对话** | 实时展示 Claude 的响应，类似 ChatGPT | Server-Sent Events (SSE) |
| 📝 **会话管理** | 自动保存和加载历史对话 | JSONL 格式本地存储 |
| 📁 **文件浏览** | 浏览工作目录，预览文件内容 | 文件系统 API |
| 🎨 **Markdown 渲染** | 代码高亮、表格、列表等完整支持 | react-markdown + highlight.js |
| 🔒 **类型安全** | 完整的 TypeScript 类型定义 | Strict mode + Monorepo |
| 🎯 **现代 UI** | 响应式三栏布局 | Shadcn UI + Tailwind CSS |

## 📂 项目结构

```
01-quick-start/
├── packages/
│   └── core/                    # 📦 核心类型定义包
│       └── src/
│           ├── message.ts       # 消息相关类型
│           ├── session.ts       # 会话管理类型
│           ├── workspace.ts     # 工作空间配置
│           └── storage.ts       # 存储接口定义
│
├── app/
│   ├── page.tsx                 # 🏠 聊天界面
│   └── api/                     # 🔌 API Routes
│       ├── chat/route.ts        # 流式对话 API
│       ├── sessions/            # 会话管理 API
│       └── files/route.ts       # 文件浏览 API
│
├── components/
│   ├── chat-interface.tsx       # 💬 聊天 UI（三栏布局）
│   ├── session-list.tsx         # 📋 会话历史列表
│   ├── file-explorer.tsx        # 📂 文件浏览器
│   └── markdown-renderer.tsx    # ✍️ Markdown 渲染
│
├── lib/storage/                 # 💾 本地存储实现
│   ├── index.ts                 # 存储适配器
│   ├── config.ts                # 配置存储
│   └── session.ts               # 会话存储
│
└── .data/                       # 📁 数据存储目录（gitignored）
    ├── config.json              # 全局配置
    └── sessions/*.jsonl         # 会话对话记录
```

## 🛠️ 技术栈

| 类别 | 技术选型 | 版本 |
|------|----------|------|
| **框架** | Next.js (App Router) | 16.1.6 |
| **UI 库** | React | 19.2.3 |
| **类型系统** | TypeScript (strict) | 5.x |
| **样式方案** | Tailwind CSS | 4.x |
| **组件库** | Shadcn UI | - |
| **AI SDK** | Claude Agent SDK | latest |
| **Markdown** | react-markdown | latest |
| **代码高亮** | highlight.js | latest |
| **包管理器** | pnpm | - |

## 📝 开发命令

```bash
# 开发模式（热重载）
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 代码检查
pnpm lint
```

## 🔍 核心概念速览

### 1. Workspace（工作空间）

Claude Agent SDK 基于**文件系统**工作，每个工作目录对应一个 Workspace：

```typescript
const workspace = {
  workingDir: process.cwd(),  // 工作目录
  env: {
    ANTHROPIC_API_KEY: "...",
  },
  agentOptions: {
    model: "claude-sonnet-4-6",
  },
};
```

### 2. Session（会话）

每个对话有独立的 Session ID，所有消息存储为 JSONL 文件：

```jsonl
{"type":"metadata","sessionId":"session-123","config":{...}}
{"type":"message","message":{"role":"user","content":"Hello"}}
{"type":"message","message":{"role":"assistant","content":"Hi!"}}
```

### 3. 上下文管理：Agent SDK vs 传统 LLM

**这是 Agent SDK 最重要的范式转变之一！**

**传统 LLM API（如 OpenAI）：手动管理上下文**

```typescript
// ❌ 传统方式：需要手动拼接和管理整个 messages 数组
const messages = [
  { role: "user", content: "你好" },
  { role: "assistant", content: "你好！有什么可以帮助你的吗？" },
  { role: "user", content: "我刚才问了什么？" }, // 需要自己维护历史
];

const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: messages, // 每次都要传完整的历史
});

// 手动追加新消息到数组
messages.push({ role: "assistant", content: response.choices[0].message.content });
```

**Claude Agent SDK：自动上下文管理**

```typescript
// ✅ Agent SDK 方式：自动管理上下文，只需传 sessionId
// 第一轮对话
const result1 = query({
  prompt: "你好",
  // SDK 自动创建 session 并记录对话
});

// 第二轮对话 - 只需要 resume 参数！
const result2 = query({
  prompt: "我刚才问了什么？",
  options: {
    resume: sessionId, // SDK 自动加载完整历史上下文
  },
});
```

**关键优势：**

| 维度 | 传统 LLM | Agent SDK |
|------|----------|-----------|
| **上下文管理** | 手动拼接 messages 数组 | 自动维护，通过 `resume` 恢复 |
| **历史持久化** | 需自己实现存储逻辑 | 内置 JSONL 文件系统存储 |
| **多轮对话** | 手动追加每轮消息 | 传 sessionId 即可继续 |
| **状态追踪** | 需自己记录 tokens、成本 | SDK 自动统计 `total_cost_usd` |
| **代码复杂度** | 高（需要大量状态管理代码） | 低（专注业务逻辑） |

在本项目的 [route.ts:53-60](app/api/chat/route.ts#L53-L60) 中，你可以看到实际应用：

```typescript
const result = query({
  prompt: message,
  options: {
    // 如果有 sessionId，SDK 会自动加载完整的对话历史
    // 无需手动拼接任何 messages！
    ...(shouldResume && finalSessionId ? { resume: finalSessionId } : {}),
  },
});
```

### 4. 流式响应

使用 Server-Sent Events (SSE) 实现实时流式输出：

```typescript
// API Route
const stream = new ReadableStream({
  async start(controller) {
    for await (const chunk of session.query(message)) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
    }
  }
});

// 前端
const reader = response.body?.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // 处理流式数据
}
```

---

## 📚 详细文档

想了解实现细节？查看 [CLAUDE.md](./CLAUDE.md) 获取：

- 完整的架构设计说明
- 各个组件的实现细节
- 类型系统的设计思路
- API Routes 的详细文档

---

## 🚀 下一步

完成本章学习后，你可以：

1. **🔧 实验改造**
   - 修改 UI 样式和布局
   - 添加新的消息类型展示
   - 优化 Markdown 渲染效果

2. **📖 继续学习**
   - 第二章：工具调用 - 让 Agent 具备实际能力
   - 第三章：多模态支持 - 处理图片和文件
   - 第四章：高级特性 - 深度定制你的 Agent

3. **💡 探索 SDK**
   - 阅读 [Claude Agent SDK 官方文档](https://platform.claude.com/docs/en/agent-sdk/typescript)
   - 研究 SDK 的其他 API 和配置选项
   - 尝试集成到你自己的项目中

---

## 🔗 相关资源

- [Claude Agent SDK 文档](https://platform.claude.com/docs/en/agent-sdk/typescript) - 官方 SDK 文档
- [Next.js 文档](https://nextjs.org/docs) - Next.js App Router 指南
- [Shadcn UI](https://ui.shadcn.com) - UI 组件库文档
- [Tailwind CSS](https://tailwindcss.com/docs) - 样式框架文档

---

## 📄 License

MIT License - 自由使用，欢迎改进和分享

---

<p align="center">
  <i>这个项目由 Claude Code 协助创建 ✨</i><br>
  <i>如果对你有帮助，欢迎 Star ⭐️</i>
</p>
