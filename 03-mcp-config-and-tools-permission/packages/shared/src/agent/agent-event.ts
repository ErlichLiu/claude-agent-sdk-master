/**
 * Agent 事件类型
 *
 * SDK 消息与前端渲染之间的标准化事件层。
 * 为流式 Agent 响应提供清晰、类型安全的接口。
 */

/**
 * Agent 单轮对话完成后的使用量统计
 */
export interface AgentEventUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  costUsd?: number;
}

/**
 * 所有可能的 Agent 事件的联合类型
 *
 * 事件流程：
 * 1. status/info - 可选的状态更新
 * 2. text_delta - 流式文本块 (0+)
 * 3. text_complete - 完整文本准备就绪时发送
 * 4. tool_start - 工具调用开始 (0+)
 * 5. tool_result - 工具执行完成 (0+)
 * 6. complete - 本轮对话结束，包含使用量统计
 * 7. error - 发生错误
 */
export type AgentEvent =
  | { type: 'status'; message: string }
  | { type: 'info'; message: string }
  | { type: 'text_delta'; text: string; turnId?: string }
  | { type: 'text_complete'; text: string; isIntermediate?: boolean; turnId?: string }
  | { type: 'tool_start'; toolName: string; toolUseId: string; input: Record<string, unknown>; intent?: string; displayName?: string; turnId?: string }
  | { type: 'tool_result'; toolUseId: string; toolName?: string; result: string; isError: boolean; input?: Record<string, unknown>; turnId?: string }
  | { type: 'error'; message: string }
  | { type: 'complete'; usage?: AgentEventUsage };
