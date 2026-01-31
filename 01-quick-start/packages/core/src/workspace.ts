import type { SettingSource } from '@anthropic-ai/claude-agent-sdk';
import type { SessionConfig } from './session';

/**
 * 工作空间配置
 */
export interface WorkspaceConfig {
  /** 当前工作目录 */
  cwd: string;
  /** 额外的可访问目录 */
  additionalDirectories?: string[];
  /** 设置来源 */
  settingSources?: SettingSource[];
  /** 允许的工具列表 */
  allowedTools?: string[];
  /** 禁止的工具列表 */
  disallowedTools?: string[];
}

/**
 * 环境变量配置
 */
export interface EnvConfig {
  /** Anthropic API Key */
  ANTHROPIC_API_KEY?: string;
  /** Anthropic API Base URL */
  ANTHROPIC_BASE_URL?: string;
}

/**
 * Agent SDK 初始化选项
 */
export interface AgentOptions extends WorkspaceConfig {
  /** 环境变量 */
  env?: EnvConfig;
  /** 会话配置 */
  session?: SessionConfig;
  /** 是否包含部分消息（流式） */
  includePartialMessages?: boolean;
}
