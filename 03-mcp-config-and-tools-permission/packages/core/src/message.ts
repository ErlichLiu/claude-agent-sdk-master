/**
 * 消息角色枚举
 */
export type MessageRole =
  |'user'
  | 'assistant'
  | 'system'
  | 'tool'
  | 'error'
  | 'plan';

/**
 * Tool 的状态
 */

export type ToolStatus = 'pending' | 'running' | 'completed' | 'failed' | 'backgrounded';

/**
 * Tool 显示信息
 */

export interface ToolDisplayMeta {
  displayName: string;
  iconDateUrl?: string;
  description?: string;
  category?: 'skill' | 'native' | 'mcp';
}

/**
 * 前端展示用的简化消息类型
 */
export interface Message {
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

  /**Tool 相关的 */
  toolName?: string;
  toolUseId?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: string;
  toolStatus?: ToolStatus;
  toolDuration?: number;
  toolIntent?: string;
  toolDisplayName?: string;
  toolDisplayMeta?: ToolDisplayMeta;
  /** 父级 Tool 使用 ID（如果有的话） ，用于子代理场景*/
  parentToolUseId?: string;
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
