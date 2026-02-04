# Claude Agent SDK Playground

直接测试 Claude Agent SDK 核心功能的交互式开发环境。

## 快速开始

```bash
# 1. 安装依赖
cd playground
pnpm install

# 2. 设置 API Key
cp .env.example .env.local
# 编辑 .env.local 填写你的 API Key

# 3. 运行 Playground
pnpm play
```

## 项目结构

```
playground/
├── playground.ts      # 核心入口 - SDK query 调用
├── lib/
│   ├── config.ts      # 配置接口和默认值
│   └── cli.ts         # 交互式命令行界面
├── utils/
│   └── printer.ts     # 打印输出函数
├── .env.example       # 环境变量示例
└── README.md
```

**设计理念**: `playground.ts` 只包含最核心的 SDK 调用代码，方便快速修改测试。

## 交互式命令

启动后支持以下命令：

| 命令 | 说明 |
|------|------|
| `/config` | 修改配置选项 |
| `/show` | 显示当前配置 |
| `/tools` | 切换工具启用状态 |
| `/verbose` | 切换详细模式（显示工具输入参数） |
| `/expand` | 切换展开内容块（显示文本和工具详情） |
| `/json` | 切换原始 JSON 显示 |
| `/stream` | 切换流式输出 |
| `/help` | 显示帮助 |
| `/quit` | 退出程序 |

直接输入文本发送给 Claude，回车使用默认提示词快速测试。

## 输出说明

Playground 会显示 SDK 返回的各种消息类型：

| 图标 | 消息类型 | 说明 |
|------|---------|------|
| 📤 | assistant | Claude 的回复消息 |
| 📥 | user | 用户消息或工具结果 |
| 🌊 | stream_event | 流式事件 |
| 🔧 | tool_use | 工具调用 |
| ⚙️ | system | 系统消息 |
| ✅ | result | 最终结果和用量统计 |

## 自定义 SDK 配置

在 `playground.ts` 中的 `executeQuery` 函数里修改 SDK 调用参数：

```typescript
// 🔧 工具配置
const toolsConfig = cfg.enableTools
  ? { type: 'preset' as const, preset: 'claude_code' as const }
  : [];

// 📝 查询配置 - SDK 核心参数
const queryConfig = {
  prompt: cfg.prompt,
  options: {
    cwd: cfg.workingDirectory,
    includePartialMessages: true,
    permissionMode: 'bypassPermissions' as const,
    tools: toolsConfig,
    // 添加更多 SDK 选项...
  },
};
```

## SDK 消息类型

Agent SDK 的 `query` 函数返回以下消息类型：

- `assistant`: Claude 的响应，包含文本或工具调用
- `user`: 用户输入或工具执行结果
- `stream_event`: 流式传输事件（message_start, content_block_delta 等）
- `result`: 查询完成，包含 usage 和 cost 信息
- `system`: 系统状态消息（如 compacting）
