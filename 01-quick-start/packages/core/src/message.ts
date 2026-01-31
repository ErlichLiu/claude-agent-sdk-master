import type {
  SDKMessage as SDKMessageRaw,
  SDKAssistantMessage,
  SDKUserMessage,
  SDKResultMessage,
  SDKSystemMessage,
  SDKPartialAssistantMessage
} from '@anthropic-ai/claude-agent-sdk';

/**
 * 消息角色枚举
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * 前端展示用的简化消息类型
 */
export interface ChatMessage {
  /** 唯一标识 */
  id: string;
  /** 消息角色 */
  role: MessageRole;
  /** 消息内容 */
  content: string;
  /** 时间戳 */
  timestamp: number;
  /** 是否正在流式输出 */
  isStreaming?: boolean;
}

/**
 * SDK 消息类型（直接从 SDK 导出）
 */
export type SDKMessage = SDKMessageRaw;

/**
 * 消息适配器 - 将 SDK 消息转换为前端消息
 */
export interface MessageAdapter {
  /**
   * 将 SDK 消息转换为 ChatMessage
   * @returns ChatMessage 或 null（如果消息不需要展示）
   */
  toFrontendMessage(sdkMessage: SDKMessage): ChatMessage | null;

  /**
   * 提取流式文本内容
   */
  extractStreamContent(sdkMessage: SDKPartialAssistantMessage): string | null;
}

/**
 * 消息统计信息
 */
export interface MessageStats {
  /** 输入 token 数 */
  inputTokens: number;
  /** 输出 token 数 */
  outputTokens: number;
  /** 总成本（USD） */
  totalCostUsd: number;
  /** 执行时长（毫秒） */
  durationMs: number;
}
