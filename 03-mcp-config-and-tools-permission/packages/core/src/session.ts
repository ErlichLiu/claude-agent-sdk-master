import type { PermissionMode } from '@anthropic-ai/claude-agent-sdk';

/**
 * 会话配置
 */
export interface SessionConfig {
  /** 会话 ID（用于 resume） */
  sessionId?: string;
  /** 是否继续最近的会话 */
  continue?: boolean;
  /** 权限模式 */
  permissionMode?: PermissionMode;
  /** 最大对话轮数 */
  maxTurns?: number;
  /** 最大预算（USD） */
  maxBudgetUsd?: number;
  /** 使用的模型 */
  model?: string;
}

/**
 * 会话状态
 */
export interface SessionState {
  /** 会话 ID */
  sessionId: string;
  /** 是否活跃 */
  isActive: boolean;
  /** 当前轮数 */
  currentTurn: number;
  /** 累计成本 */
  totalCostUsd: number;
  /** 创建时间 */
  createdAt: number;
  /** 最后更新时间 */
  updatedAt: number;
}

/**
 * 会话结果
 */
export interface SessionResult {
  /** 会话 ID */
  sessionId: string;
  /** 最终结果文本 */
  result: string;
  /** 是否出错 */
  isError: boolean;
  /** 对话轮数 */
  numTurns: number;
  /** 总成本 */
  totalCostUsd: number;
  /** 执行时长（毫秒） */
  durationMs: number;
  /** API 调用时长（毫秒） */
  durationApiMs: number;
}
