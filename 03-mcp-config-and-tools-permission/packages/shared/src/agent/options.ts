/**
 * SDK Options 配置构建器
 *
 * 参考：Craft Agent OSS packages/shared/src/agent/options.ts
 */

import type { Options, McpServerConfig } from '@anthropic-ai/claude-agent-sdk';

/**
 * 工具配置选项
 */
export interface ToolOptions {
  /** 工作目录 */
  workingDirectory: string;
  /** 是否使用完整的默认工具集（默认 true） */
  useFullToolSet?: boolean;
  /** 额外的 MCP 服务器 */
  mcpServers?: Record<string, McpServerConfig>;
}

/**
 * 获取默认的 SDK Options
 *
 * 包含：
 * - 默认工具集（claude_code preset）
 * - 工作目录配置
 * - 基础环境变量
 */
export function getDefaultOptions(options: ToolOptions): Partial<Options> {
  const { workingDirectory, useFullToolSet = true, mcpServers = {} } = options;

  // 默认工具配置
  const tools: Options['tools'] = useFullToolSet
    ? { type: 'preset', preset: 'claude_code' }
    : [
        'Read',
        'Edit',
        'Write',
        'Glob',
        'Grep',
        'Bash',
      ];

  // 基础配置
  const sdkOptions: Partial<Options> = {
    tools,
    cwd: workingDirectory,
    mcpServers: Object.keys(mcpServers).length > 0 ? mcpServers : undefined,
  };

  return sdkOptions;
}

/**
 * 合并多个 MCP 服务器配置
 */
export function mergeMcpServers(
  ...configs: Array<Record<string, McpServerConfig> | undefined>
): Record<string, McpServerConfig> {
  const merged: Record<string, McpServerConfig> = {};

  for (const config of configs) {
    if (config) {
      Object.assign(merged, config);
    }
  }

  return merged;
}

/**
 * 创建 HTTP MCP 服务器配置
 */
export function createHttpMcpServer(
  url: string,
  headers?: Record<string, string>
): McpServerConfig {
  return {
    type: 'http',
    url,
    headers,
  };
}

/**
 * 创建 Stdio MCP 服务器配置
 */
export function createStdioMcpServer(
  command: string,
  args?: string[],
  env?: Record<string, string>
): McpServerConfig {
  return {
    type: 'stdio',
    command,
    args,
    env,
  };
}

// Re-export SDK's McpServerConfig for convenience
export type { McpServerConfig } from '@anthropic-ai/claude-agent-sdk';

