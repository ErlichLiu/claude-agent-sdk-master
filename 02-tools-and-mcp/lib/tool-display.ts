import type { ToolActivity } from './tool-activity';

/**
 * 获取工具的显示名称
 * - 移除 MCP 前缀
 * - 应用友好名称映射
 */
export function getToolDisplayName(toolName: string): string {
  // 移除 MCP 前缀 (例如 mcp__server__tool -> tool)
  const stripped = toolName.replace(/^mcp__[^_]+__/, '');

  // 友好名称映射
  const displayNames: Record<string, string> = {
    TodoWrite: 'Todo List Updated',
    TaskCreate: 'Task Created',
    TaskUpdate: 'Task Updated',
  };

  return displayNames[stripped] || stripped;
}

/**
 * 格式化工具输入参数为简洁摘要
 *
 * 规则：
 * - Edit/Write 工具只显示 file_path
 * - 跳过内部字段（_intent, description）
 * - 最多显示 2 个参数
 * - 长文本截断
 */
export function formatToolInput(
  input?: Record<string, unknown>,
  toolName?: string
): string {
  if (!input || Object.keys(input).length === 0) return '';

  const parts: string[] = [];
  const isEditOrWrite = toolName === 'Edit' || toolName === 'Write';

  for (const [key, value] of Object.entries(input)) {
    // 跳过内部字段
    if (
      key === '_intent' ||
      key === 'description' ||
      value === undefined ||
      value === null
    )
      continue;

    // Edit/Write 工具只显示 file_path
    if (isEditOrWrite && key !== 'file_path') continue;

    let valStr =
      typeof value === 'string'
        ? value.replace(/\s+/g, ' ').trim()
        : JSON.stringify(value);

    // 截断长文本
    if (valStr.length > 100) {
      valStr = valStr.substring(0, 97) + '...';
    }

    parts.push(valStr);
    if (parts.length >= 2) break; // 最多 2 个参数
  }

  return parts.join(' · ');
}

/**
 * 格式化工具显示信息
 *
 * 返回：
 * - name: 显示名称
 * - description: 描述文本（intent 或 输入摘要）
 */
export function formatToolDisplay(activity: ToolActivity): {
  name: string;
  description?: string;
} {
  const { toolName, displayName, intent, toolInput } = activity;

  // 使用自定义 displayName 或默认名称
  const name = displayName || (toolName ? getToolDisplayName(toolName) : 'Unknown');

  // 描述：优先使用 intent，否则使用格式化的输入
  let description: string | undefined;

  if (intent) {
    description = intent;
  } else if (toolInput) {
    description = formatToolInput(toolInput, toolName);
  }

  return { name, description };
}

/**
 * 计算工具执行时长（毫秒）
 */
export function getActivityDuration(activity: ToolActivity): number | null {
  if (!activity.startTime) return null;

  const endTime = activity.endTime || Date.now();
  return endTime - activity.startTime;
}

/**
 * 格式化时长为易读形式
 * @param ms 毫秒数
 * @returns 不足一分钟返回 "0.8s"，超过一分钟返回 "1:02"
 */
export function formatDuration(ms: number): string {
  const seconds = ms / 1000;

  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * 获取工具的图标 emoji（可选功能）
 */
export function getToolIcon(toolName?: string): string | undefined {
  if (!toolName) return undefined;

  const icons: Record<string, string> = {
    Read: '📖',
    Write: '✍️',
    Edit: '✏️',
    Bash: '💻',
    Task: '📋',
    Glob: '🔍',
    Grep: '🔎',
  };

  return icons[toolName];
}

/**
 * 检查工具是否是文件操作类型
 */
export function isFileOperation(toolName?: string): boolean {
  if (!toolName) return false;
  return ['Read', 'Write', 'Edit', 'Glob'].includes(toolName);
}

/**
 * 提取文件路径（如果是文件操作工具）
 */
export function extractFilePath(activity: ToolActivity): string | null {
  if (!isFileOperation(activity.toolName)) return null;

  const input = activity.toolInput;
  if (!input) return null;

  // Edit/Write 工具的 file_path
  if ('file_path' in input && typeof input.file_path === 'string') {
    return input.file_path;
  }

  // Read 工具的 file_path
  if ('file_path' in input && typeof input.file_path === 'string') {
    return input.file_path;
  }

  // Glob 工具的 pattern
  if ('pattern' in input && typeof input.pattern === 'string') {
    return input.pattern;
  }

  return null;
}
