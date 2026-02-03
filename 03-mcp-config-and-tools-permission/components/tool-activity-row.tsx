"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ToolActivityIcon } from "./tool-activity-icon";
import type { ToolActivity } from "@/lib/tool-activity";
import {
  formatToolDisplay,
  getActivityDuration,
  formatDuration,
} from "@/lib/tool-display";

/**
 * 尺寸配置（对标 Craft Agent）
 */
const SIZE_CONFIG = {
  fontSize: "text-[13px]",
  iconSize: "w-3 h-3",
} as const;

export interface ToolActivityRowProps {
  /** 工具活动数据 */
  activity: ToolActivity;
  /** 是否显示执行时长 */
  showDuration?: boolean;
  /** 点击回调 */
  onClick?: () => void;
  /** 额外的 className */
  className?: string;
}

/**
 * ToolActivityRow - 单个工具活动行
 *
 * 布局：[图标] 工具名 · 描述/参数 (时长)
 *
 * 示例：
 * [✓] Edit · app/page.tsx (0.8s)
 * [↻] Bash · npm install (12s)
 * [●] Task · Running tests (45s)
 *
 * 参考：Craft Agent OSS TurnCard.tsx:685-850
 */
export function ToolActivityRow({
  activity,
  showDuration = true,
  onClick,
  className,
}: ToolActivityRowProps) {
  const { name, description } = formatToolDisplay(activity);
  const [elapsed, setElapsed] = React.useState<number | null>(null);

  // 实时更新运行中工具的耗时
  React.useEffect(() => {
    if (activity.status !== "running" || !showDuration) return;

    const updateElapsed = () => {
      const duration = getActivityDuration(activity);
      setElapsed(duration);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [activity, showDuration]);

  // 获取显示的时长
  const displayDuration = React.useMemo(() => {
    if (!showDuration) return null;

    // 运行中：使用实时更新的 elapsed
    if (activity.status === "running" && elapsed !== null) {
      return formatDuration(elapsed);
    }

    // 已完成/失败：使用最终时长
    if (activity.status === "completed" || activity.status === "error") {
      const duration = getActivityDuration(activity);
      return duration !== null ? formatDuration(duration) : null;
    }

    return null;
  }, [activity, showDuration, elapsed]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 py-0.5 text-muted-foreground transition-colors",
        SIZE_CONFIG.fontSize,
        onClick && "cursor-pointer hover:text-foreground",
        className
      )}
      onClick={onClick}
    >
      {/* 状态图标 */}
      <ToolActivityIcon
        status={activity.status}
        toolName={activity.toolName}
        customIcon={activity.toolDisplayMeta?.iconDateUrl}
      />

      {/* 工具名称 */}
      <span className="shrink-0 font-medium">{name}</span>

      {/* 描述/参数 */}
      {description && (
        <>
          <span className="opacity-60 shrink-0">·</span>
          <span className="truncate min-w-0 flex-1">{description}</span>
        </>
      )}

      {/* 执行时长 */}
      {displayDuration && (
        <span className="opacity-60 shrink-0 tabular-nums ml-auto">
          ({displayDuration})
        </span>
      )}
    </div>
  );
}
