/**
 * Playground 配置模块
 *
 * 定义配置接口和默认值，管理运行时配置状态。
 */

// ============================================================================
// 配置接口
// ============================================================================

export interface PlaygroundConfig {
  /** 测试的提示词 */
  prompt: string;
  /** 是否显示详细日志 */
  verbose: boolean;
  /** 是否显示原始 JSON */
  showRawJson: boolean;
  /** 工作目录 */
  workingDirectory: string;
  /** 是否启用工具 */
  enableTools: boolean;
  /** 是否流式输出文本 */
  streamText: boolean;
  /** 是否展开内容块详情 */
  expandContent: boolean;
}

// ============================================================================
// 默认配置
// ============================================================================

export const DEFAULT_CONFIG: Omit<PlaygroundConfig, 'prompt'> = {
  verbose: false,
  showRawJson: false,
  workingDirectory: process.cwd(),
  enableTools: true,
  streamText: true,
  expandContent: false,
};

// ============================================================================
// 运行时配置状态
// ============================================================================

/** 当前配置（可在交互中修改） */
export const currentConfig: Omit<PlaygroundConfig, 'prompt'> = { ...DEFAULT_CONFIG };

/** 重置配置为默认值 */
export function resetConfig(): void {
  Object.assign(currentConfig, DEFAULT_CONFIG);
}

/** 获取完整配置（带 prompt） */
export function getFullConfig(prompt: string): PlaygroundConfig {
  return {
    ...currentConfig,
    prompt,
  };
}
