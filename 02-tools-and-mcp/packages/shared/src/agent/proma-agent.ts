/**
 * PromaAgent - Claude Agent SDK 的事件驱动封装器
 *
 * 将 SDK 的底层消息流转换为高层 AgentEvents。
 * 为构建聊天应用提供清晰、可测试的架构。
 *
 * 核心设计原则：
 * 1. 事件驱动：发出标准化的 AgentEvent 对象
 * 2. 无状态工具匹配：使用 ToolIndex 而非 FIFO 队列
 * 3. 关注点分离：仅处理事件转换，不涉及存储/HTTP
 * 4. 幂等性：相同输入产生相同输出
 */

import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type { AgentEvent, AgentEventUsage } from './agent-event';
import {
  ToolIndex,
  extractToolStarts,
  extractToolResults,
  type ContentBlock,
} from './tool-matching';
import { getDefaultOptions, mergeMcpServers, type McpServerConfig } from './options';

// ============================================================================
// 配置
// ============================================================================

export interface PromaAgentConfig {
  /** Anthropic API 密钥 */
  apiKey: string;
  /** 使用的模型（默认：claude-sonnet-4-5-20250929） */
  model?: string;
  /** 文件操作的工作目录 */
  workingDirectory: string;
  /** 要恢复的会话 ID（可选） */
  resumeSessionId?: string;
  /** 当会话 ID 确定时的回调 */
  onSessionIdUpdate?: (sessionId: string) => void;
  /** 是否使用完整的默认工具集（默认 true） */
  useFullToolSet?: boolean;
  /** 额外的 MCP 服务器 */
  mcpServers?: Record<string, McpServerConfig>;
}

// ============================================================================
// PromaAgent 类
// ============================================================================

export class PromaAgent {
  private config: PromaAgentConfig;
  private currentQuery: AsyncIterable<SDKMessage> | null = null;

  constructor(config: PromaAgentConfig) {
    this.config = config;
  }

  /**
   * 发送消息并流式返回 AgentEvents。
   *
   * 使用示例：
   * ```typescript
   * const agent = new PromaAgent({ apiKey, workingDirectory: process.cwd() });
   * for await (const event of agent.chat("Hello!")) {
   *   if (event.type === 'text_delta') {
   *     process.stdout.write(event.text);
   *   }
   * }
   * ```
   */
  async *chat(userMessage: string): AsyncGenerator<AgentEvent> {
    // 获取默认工具配置
    const defaultOptions = getDefaultOptions({
      workingDirectory: this.config.workingDirectory,
      useFullToolSet: this.config.useFullToolSet,
      mcpServers: this.config.mcpServers,
    });

    // 构建查询选项
    const queryOptions: Record<string, unknown> = {
      ...defaultOptions,
      includePartialMessages: true,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
    };

    // 如果提供了会话 ID，则添加恢复选项
    if (this.config.resumeSessionId) {
      queryOptions.resume = this.config.resumeSessionId;
    }

    // 调用 SDK
    this.currentQuery = query({
      prompt: userMessage,
      options: queryOptions,
    }) as AsyncIterable<SDKMessage>;

    // 初始化无状态匹配状态
    const toolIndex = new ToolIndex();
    const emittedToolStarts = new Set<string>();
    let pendingText: string | null = null;
    let turnId: string | null = null;
    let sdkSessionId: string | null = null;

    // 处理 SDK 消息 → 转换为事件
    for await (const sdkMessage of this.currentQuery) {
      // 捕获 session_id
      if (!sdkSessionId && 'session_id' in sdkMessage) {
        sdkSessionId = sdkMessage.session_id;
        this.config.onSessionIdUpdate?.(sdkSessionId);
      }

      // 转换消息
      const events = this.convertSDKMessage(
        sdkMessage,
        toolIndex,
        emittedToolStarts,
        {
          get: () => pendingText,
          set: (text) => { pendingText = text; },
        },
        {
          get: () => turnId,
          set: (id) => { turnId = id; },
        }
      );

      // 产出事件
      for (const event of events) {
        yield event;
      }
    }
  }

  /**
   * 核心转换逻辑：SDK 消息 → AgentEvents
   *
   * 这是 PromaAgent 的核心 - 它将底层 SDK 消息转换为
   * UI 可以轻松消费的高层语义事件。
   */
  private convertSDKMessage(
    message: SDKMessage,
    toolIndex: ToolIndex,
    emittedToolStarts: Set<string>,
    pendingTextState: { get: () => string | null; set: (text: string | null) => void },
    turnIdState: { get: () => string | null; set: (id: string | null) => void }
  ): AgentEvent[] {
    const events: AgentEvent[] = [];

    switch (message.type) {
      case 'assistant': {
        // 检查 SDK 错误
        if (message.error) {
          events.push({ type: 'error', message: message.error });
          break;
        }

        // 提取文本内容
        const content = message.message.content;
        let textContent = '';
        for (const block of content) {
          if (block.type === 'text' && block.text) {
            textContent += block.text;
          }
        }

        // 提取工具启动事件
        const toolStarts = extractToolStarts(
          content as ContentBlock[],
          toolIndex,
          emittedToolStarts,
          turnIdState.get() || undefined
        );
        events.push(...toolStarts);

        // 存储文本（等待 message_delta 来确定是否为中间消息）
        if (textContent) {
          pendingTextState.set(textContent);
        }
        break;
      }

      case 'stream_event': {
        const event = message.event;

        // 从 message_start 捕获 turnId
        if (event.type === 'message_start' && event.message?.id) {
          turnIdState.set(event.message.id);
        }

        // 当 message_delta 到达时发送待处理的文本
        if (event.type === 'message_delta') {
          const pendingText = pendingTextState.get();
          if (pendingText) {
            const stopReason = event.delta?.stop_reason;
            const isIntermediate = stopReason === 'tool_use';
            events.push({
              type: 'text_complete',
              text: pendingText,
              isIntermediate,
              turnId: turnIdState.get() || undefined,
            });
            pendingTextState.set(null);
          }
        }

        // 流式文本增量
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          events.push({
            type: 'text_delta',
            text: event.delta.text || '',
            turnId: turnIdState.get() || undefined,
          });
        }

        // 流式工具启动
        if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
          const toolBlock = event.content_block;
          const streamBlocks: ContentBlock[] = [{
            type: 'tool_use',
            id: toolBlock.id || '',
            name: toolBlock.name || '',
            input: (toolBlock.input ?? {}) as Record<string, unknown>,
          }];
          const streamEvents = extractToolStarts(
            streamBlocks,
            toolIndex,
            emittedToolStarts,
            turnIdState.get() || undefined
          );
          events.push(...streamEvents);
        }
        break;
      }

      case 'user': {
        // 跳过重放消息（SDKUserMessageReplay 类型有 isReplay: true）
        if ('isReplay' in message && message.isReplay) break;

        // 提取工具结果
        if (message.tool_use_result !== undefined || message.message) {
          const msgContent = message.message?.content ?? [];
          const contentBlocks = msgContent as ContentBlock[];
          const toolUseResultValue = message.tool_use_result;

          const resultEvents = extractToolResults(
            contentBlocks,
            toolUseResultValue,
            toolIndex,
            turnIdState.get() || undefined
          );
          events.push(...resultEvents);
        }
        break;
      }

      case 'result': {
        const usage: AgentEventUsage = {
          inputTokens: message.usage.input_tokens +
            (message.usage.cache_read_input_tokens ?? 0) +
            (message.usage.cache_creation_input_tokens ?? 0),
          outputTokens: message.usage.output_tokens,
          cacheReadTokens: message.usage.cache_read_input_tokens,
          cacheCreationTokens: message.usage.cache_creation_input_tokens,
          costUsd: message.total_cost_usd,
        };

        if (message.subtype === 'success') {
          events.push({ type: 'complete', usage });
        } else {
          const errorMsg = message.errors?.join(', ') || 'Query failed';
          events.push({ type: 'error', message: errorMsg });
          events.push({ type: 'complete', usage });
        }
        break;
      }

      case 'system': {
        if (message.subtype === 'compact_boundary') {
          events.push({ type: 'info', message: 'Compacted Conversation' });
        } else if (message.subtype === 'status' && message.status === 'compacting') {
          events.push({ type: 'status', message: 'Compacting conversation...' });
        }
        break;
      }

      default:
        break;
    }

    return events;
  }

  /**
   * 中止当前查询（如果正在运行）。
   */
  abort(): void {
    this.currentQuery = null;
  }
}
