import type { AgentEvent } from '@02-tools-and-mcp/shared/agent';
import type { ToolDisplayMeta } from '@02-tools-and-mcp/core';

/**
 * 工具活动状态
 */
export type ActivityStatus = 'pending' | 'running' | 'completed' | 'error' | 'backgrounded';

/**
 * 工具活动类型
 */
export type ActivityType = 'tool' | 'thinking' | 'intermediate' | 'status';

/**
 * 工具活动记录
 *
 * 表示单个工具的完整生命周期：
 * - 开始（tool_start 事件）
 * - 运行中（状态更新）
 * - 完成/失败（tool_result 事件）
 */
export interface ToolActivity {
  /** 唯一标识（通常是 toolUseId） */
  id: string;

  /** 活动类型 */
  type: ActivityType;

  /** 当前状态 */
  status: ActivityStatus;

  /** 工具名称 */
  toolName?: string;

  /** 工具使用 ID（用于匹配父子关系） */
  toolUseId?: string;

  /** 工具输入参数 */
  toolInput?: Record<string, unknown>;

  /** 文本内容（用于 thinking/intermediate 类型） */
  content?: string;

  /** LLM 生成的意图描述 */
  intent?: string;

  /** 自定义显示名称（用于 MCP 工具） */
  displayName?: string;

  /** 工具显示元数据 */
  toolDisplayMeta?: ToolDisplayMeta;

  /** 时间戳 */
  timestamp: number;

  /** 工具结果 */
  result?: string;

  /** 错误信息 */
  error?: string;

  /** 开始时间 */
  startTime?: number;

  /** 结束时间 */
  endTime?: number;

  /** 父活动 ID（用于子代理场景） */
  parentId?: string;

  /** 嵌套深度（0=根，1=子代理，等等） */
  depth?: number;

  /** 状态类型（例如 'compacting'） */
  statusType?: string;

  /** 后台任务 ID */
  taskId?: string;

  /** 后台 Shell ID */
  shellId?: string;

  /** 已用秒数（用于实时进度更新） */
  elapsedSeconds?: number;

  /** 是否为后台任务 */
  isBackground?: boolean;
}

/**
 * 工具活动管理器
 *
 * 职责：
 * - 将 PromaAgent 的事件流转换为 ToolActivity 状态
 * - 追踪所有工具的生命周期
 * - 管理父子工具的层级关系
 * - 提供工具活动的查询接口
 *
 * 设计原则：
 * - 无状态转换：每个事件独立处理
 * - 幂等性：相同事件多次处理产生相同结果
 * - 实时更新：立即反映状态变化
 */
export class ToolActivityManager {
  private activities = new Map<string, ToolActivity>();
  private listeners: Array<(activities: ToolActivity[]) => void> = [];

  /**
   * 处理 AgentEvent 并更新工具活动状态
   */
  handleEvent(event: AgentEvent): void {
    switch (event.type) {
      case 'tool_start':
        this.handleToolStart(event);
        break;

      case 'tool_result':
        this.handleToolResult(event);
        break;

      case 'status':
      case 'info':
        // 可选：处理状态消息
        break;

      default:
        // 忽略其他事件类型
        break;
    }

    this.notifyListeners();
  }

  /**
   * 处理工具开始事件
   */
  private handleToolStart(event: AgentEvent & { type: 'tool_start' }): void {
    const activity: ToolActivity = {
      id: event.toolUseId,
      type: 'tool',
      status: 'running',
      toolName: event.toolName,
      toolUseId: event.toolUseId,
      toolInput: event.input,
      intent: event.intent,
      displayName: event.displayName,
      timestamp: Date.now(),
      startTime: Date.now(),
      depth: 0, // 默认深度为 0，可以后续根据 parentId 计算
    };

    this.activities.set(event.toolUseId, activity);
  }

  /**
   * 处理工具结果事件
   */
  private handleToolResult(event: AgentEvent & { type: 'tool_result' }): void {
    const activity = this.activities.get(event.toolUseId);

    if (!activity) {
      // 如果没有对应的 tool_start，创建一个新活动
      const newActivity: ToolActivity = {
        id: event.toolUseId,
        type: 'tool',
        status: event.isError ? 'error' : 'completed',
        toolUseId: event.toolUseId,
        toolName: event.toolName,
        toolInput: event.input,
        timestamp: Date.now(),
        result: event.result,
        error: event.isError ? event.result : undefined,
        endTime: Date.now(),
        depth: 0,
      };
      this.activities.set(event.toolUseId, newActivity);
      return;
    }

    // 更新现有活动
    activity.status = event.isError ? 'error' : 'completed';
    activity.result = event.result;
    activity.error = event.isError ? event.result : undefined;
    activity.endTime = Date.now();

    // 如果工具名称在 result 中才有，更新它
    if (event.toolName && !activity.toolName) {
      activity.toolName = event.toolName;
    }
  }

  /**
   * 获取所有工具活动（按时间排序）
   */
  getActivities(): ToolActivity[] {
    return Array.from(this.activities.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );
  }

  /**
   * 获取运行中的工具活动
   */
  getRunningActivities(): ToolActivity[] {
    return this.getActivities().filter((a) => a.status === 'running');
  }

  /**
   * 获取已完成的工具活动
   */
  getCompletedActivities(): ToolActivity[] {
    return this.getActivities().filter((a) => a.status === 'completed');
  }

  /**
   * 获取失败的工具活动
   */
  getErrorActivities(): ToolActivity[] {
    return this.getActivities().filter((a) => a.status === 'error');
  }

  /**
   * 根据 ID 获取工具活动
   */
  getActivity(id: string): ToolActivity | undefined {
    return this.activities.get(id);
  }

  /**
   * 清空所有工具活动
   */
  clear(): void {
    this.activities.clear();
    this.notifyListeners();
  }

  /**
   * 订阅活动变化
   */
  subscribe(listener: (activities: ToolActivity[]) => void): () => void {
    this.listeners.push(listener);

    // 返回取消订阅函数
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 通知所有订阅者
   */
  private notifyListeners(): void {
    const activities = this.getActivities();
    this.listeners.forEach((listener) => listener(activities));
  }

  /**
   * 计算工具的执行时长（毫秒）
   */
  getDuration(id: string): number | null {
    const activity = this.activities.get(id);
    if (!activity || !activity.startTime) return null;

    const endTime = activity.endTime || Date.now();
    return endTime - activity.startTime;
  }

  /**
   * 获取活动统计
   */
  getStats(): {
    total: number;
    running: number;
    completed: number;
    error: number;
  } {
    const activities = this.getActivities();
    return {
      total: activities.length,
      running: activities.filter((a) => a.status === 'running').length,
      completed: activities.filter((a) => a.status === 'completed').length,
      error: activities.filter((a) => a.status === 'error').length,
    };
  }
}

/**
 * 创建工具活动管理器实例
 */
export function createToolActivityManager(): ToolActivityManager {
  return new ToolActivityManager();
}
