<h1 align="center">
  <strong>Claude Agent SDK Master</strong>
</h1>


<p align="center">
  <strong>🎓 从零到一掌握 Claude Agent SDK 的渐进式学习教程</strong>
</p>

<p align="center">
  <a href="#-快速开始">快速开始</a> •
  <a href="#-学习路线">学习路线</a> •
  <a href="#-项目结构">项目结构</a> •
  <a href="#-核心理念">核心理念</a> •
  <a href="#-相关资源">相关资源</a>
</p>

---

## 💡 项目定位

Claude Agent SDK Master 是一个**渐进式学习教程系列**，作为 [Proma](https://github.com/ErlichLiu/proma-oss.git) 开源项目的前奏和技术基础，旨在：

- 🎯 帮助开发者**系统掌握** Claude Agent SDK 的核心概念和高级特性
- 🔨 通过**实际可运行的项目**理解 Agent 状态管理和用户体验转换
- 🌟 为开源社区提供高质量的 Agent SDK **中文学习资源**
- 🚀 培养 **AI 原生应用开发思维**，为 Proma 等项目贡献做准备

### 🤔 为什么需要这个教程？

Agent SDK 的潜力远超目前的开发程度。即便 Claude 官方的 Claude Code 和 Cowork，可能也只触及了 SDK 能力的 **10%**。

Agent SDK 的应用空间巨大，但相比单纯套用 LLM API 以及其他需要进行编排的 Agents 而言，它要求你：
- 深入理解**状态管理**和**流式响应**机制
- 重新设计**用户体验**和**交互模式**
- 掌握更复杂的**嵌套状态**和**工具调用**逻辑

**本教程的使命：让你真正理解 Agent SDK 的设计，并能优雅地应用这些状态。**

---
## 项目赞助商 MiniMax

本教程推荐采用 MiniMax API 更丝滑更具性价比的完成 Claude Agent SDK 的学习，全面兼容所有功能(订阅 Coding Plan 一样可以生成 Coding Plan api key 来学习和应用到本教程)

![MiniMax](https://img.erlich.fun/personal-blog/uPic/I0pljV.png)

MiniMax api 获取和注册地址，还可领取 88 折的优惠！：https://platform.minimaxi.com/subscribe/coding-plan?code=cVcgRF3hAQ&source=link

---

## 📖 学习路线

本系列采用**渐进式学习路径**，每一章在前一章基础上递进，建议按顺序学习：

| 章节 | 主题 | 核心内容 | 状态 |
|------|------|----------|------|
| **第一章** | 🚀 [快速入门](./01-quick-start) | Workspace、Session、上下文管理、流式对话 | ✅ 已完成 |
| **第二章** | 🔧 [工具与 MCP](./02-tools-and-mcp) | MCP Tools 集成、Tool Calling、实际 Agent 能力 | ✅ 已完成 |
| **第三章** | 🖼️ 多模态支持 | 图片、文件上传处理、多媒体渲染 | 📋 计划中 |
| **第四章** | 🎨 高级特性 | 自定义 System Prompt、成本追踪、流式优化 | 📋 计划中 |

> **💡 提示**：本教程随 [Proma](https://github.com/ErlichLiu/proma-oss.git) 实际开发进度持续更新。

---

## ⚡ 快速开始

### 前置要求

- **Node.js** 18+
- **pnpm** 包管理器（推荐）
- **Anthropic API Key（推荐MiniMax API 即可）** [点击获取 minimax api key](https://platform.minimaxi.com/login)（也可以是支持 Anthropic /v1/messages 的其他 api）

### 三步开始学习

```bash
# 1️⃣ 克隆仓库
git clone https://github.com/ErlichLiu/claude-agent-sdk-master.git
cd claude-agent-sdk-master

# 2️⃣ 进入第一章教程
cd 01-quick-start

# 3️⃣ 安装依赖
pnpm install

# 4️⃣ 配置 API Key
cp .env.local.example .env.local
# 编辑 .env.local，填入你的 ANTHROPIC_API_KEY 以及可选的 ANTHROPIC_BASE_URL

# 5️⃣ 启动开发服务器
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000)，开始你的 Agent SDK 学习之旅！🎉

### 🎮 从 00-Playground 开始（推荐）

如果你想**快速体验** Agent SDK 的核心功能，推荐先从 00-Playground 开始：

```bash
# 进入 00-playground 目录
cd 00-playground

# 安装依赖
pnpm install

# 配置 API Key
cp .env.example .env.local
# 编辑 .env.local，填入你的 ANTHROPIC_API_KEY

# 启动交互式测试
pnpm play
```

**Playground 的优势：**
- 📝 **核心代码精简**：`playground.ts` 只有 ~120 行，专注于 SDK 调用
- ⚡ **即时反馈**：修改代码后立即运行查看效果
- 🔧 **交互式配置**：通过命令动态切换工具、输出模式等
- 🎯 **零 UI 干扰**：纯命令行，专注理解 SDK 机制

适合想要**快速修改代码、理解 SDK 行为**的开发者。详见 [Playground README](./00-playground/README.md)。

---

## 📂 项目结构

```
claude-agent-sdk-master/
│
├── 00-playground/              # 🎮 SDK 交互式测试环境（推荐入门）
│   ├── playground.ts        #    核心 SDK 调用代码
│   ├── lib/                 #    配置和 CLI 模块
│   └── utils/               #    打印输出工具
│
├── 01-quick-start/          # 🚀 第一章：快速入门
│   ├── app/                 #    Next.js App Router
│   ├── components/          #    UI 组件（三栏布局、Markdown 等）
│   ├── lib/storage/         #    JSONL 文件存储实现
│   ├── packages/core/       #    核心类型定义（Monorepo）
│   ├── README.md            #    详细教程文档
│   └── CLAUDE.md            #    Claude Code 开发指引
│
├── 02-tools-and-mcp/        # 🔧 第二章：工具与 MCP（开发中）
│   └── ...
│
├── 03-multimodal/           # 🖼️ 第三章：多模态支持（计划中）
│   └── ...
│
├── 04-advanced/             # 🎨 第四章：高级特性（计划中）
│   └── ...
│
└── README.md                # 📖 本文件（系列教程总览）
```

---

## 🎯 核心理念

> **软件的本质，归根结底是对状态的优雅处理。**

这是贯穿本系列教程的核心哲学。无论是：
- Claude Agent SDK 的 **Session 状态**
- React 的 **组件状态**
- Proma 的 **应用状态**

掌握**状态的本质**，你就能理解现代软件开发的精髓。

## ✨ 教程特色

- 📚 **体系完整**：从基础到高级，覆盖 Agent SDK 完整能力
- 🔄 **渐进式学习**：每章在前一章基础上递进，循序渐进
- 💻 **实战导向**：每章都是**可运行的完整项目**，边学边练
- 📖 **详细文档**：每个项目配备详尽的 README 和 CLAUDE.md 开发指引
- 🤖 **AI 协作实践**：大部分内容由 Claude Code 编写，展示 AI 辅助开发最佳实践
- 🇨🇳 **中文优先**：高质量中文技术文档，降低学习门槛

---

## 🔗 相关资源

### 官方文档
- [Claude Agent SDK 官方文档](https://platform.claude.com/docs/en/agent-sdk/typescript) - TypeScript SDK 官方指南
- [Anthropic API 文档](https://docs.anthropic.com/) - Claude API 完整文档
- [MiniMax API 文档](https://platform.minimaxi.com/docs/guides/text-generation) - MiniMax API 完整文档

### 相关项目
- [Proma](https://github.com/ErlichLiu/proma-oss.git) - 基于 Agent SDK 的完整开源产品（即将发布）
- [Claude Code](https://claude.ai/code) - Anthropic 官方代码编辑器
- [MCP Servers](https://github.com/anthropics/mcp-servers) - Model Context Protocol 服务端实现
- [Craft Agent OSS](https://github.com/lukilabs/craft-agents-oss) - 本项目设计参考，推荐学习

### 技术栈
- [Next.js 文档](https://nextjs.org/docs) - App Router 完整指南
- [Shadcn UI](https://ui.shadcn.com) - UI 组件库
- [Tailwind CSS](https://tailwindcss.com/docs) - 原子化 CSS 框架

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！如果这个项目对你有帮助：

- ⭐ **Star 本项目** - 让更多人看到这个教程
- 🐛 **报告 Bug** - 发现问题请提 Issue
- 📖 **完善文档** - 发现错误或有改进建议欢迎 PR
- 💡 **分享经验** - 在 Discussion 中分享你的学习心得
- 🚀 **贡献到 Proma** - 学完本教程后欢迎为 [Proma](https://github.com/your-proma-link) 项目做贡献

### 如何贡献

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

---

## ❓ 常见问题

<details>
<summary><strong>Q: 我需要什么基础知识？</strong></summary>

- **必需**：JavaScript/TypeScript 基础、React 基础
- **推荐**：Next.js 了解、异步编程经验
- **加分项**：有使用过 LLM API 的经验

</details>

<details>
<summary><strong>Q: Agent SDK 和直接调用 Claude API 有什么区别？</strong></summary>

Agent SDK 提供了更高层的抽象：
- **自动上下文管理**：不需要手动拼接 messages
- **文件系统集成**：Agent 可以读写本地文件
- **工具调用封装**：内置 Tool Calling 和 MCP 支持
- **会话持久化**：自动存储对话历史

适合构建**持久化、有状态的 AI 应用**，而不是简单的问答。

</details>

<details>
<summary><strong>Q: 为什么选择 Next.js？</strong></summary>

- **App Router**：原生支持 Server Actions 和流式响应
- **全栈能力**：API Routes 便于构建后端逻辑
- **开发体验**：热重载、TypeScript 支持、现代工具链
- **生态丰富**：与 Shadcn UI、Tailwind CSS 等无缝集成

当然，你也可以将 Agent SDK 集成到任何 Node.js 框架和 Python 框架中，并不代表在正式生产项目上采用 NextJS。

</details>

<details>
<summary><strong>Q: 这个教程会持续更新吗？</strong></summary>

是的！本教程随 **Proma 项目**的开发进度持续更新：
- ✅ 第一章已完成
- 🚧 第二章开发中（工具调用）
- 📋 第三、四章计划中

关注本仓库获取最新更新通知。

</details>

---

## 📄 License

MIT License - 自由使用，欢迎改进和分享

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ErlichLiu/claude-agent-sdk-master.git&type=date&legend=top-left)](https://www.star-history.com/#ErlichLiu/claude-agent-sdk-master.git&type=date&legend=top-left)

<p align="center">
  <strong>🎓 开始学习：</strong>
  <a href="./01-quick-start">第一章：快速入门</a>
</p>

<p align="center">
  <i>本教程由 Claude Code 协助创建 ✨</i><br>
  <i>随 Proma 开发进度持续更新</i><br>
  <i>如果对你有帮助，欢迎 Star ⭐️</i>
</p>
