"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ToolActivityRow } from "./tool-activity-row";
import type { ToolActivity } from "@/lib/tool-activity";

/**
 * 尺寸配置
 */
const SIZE_CONFIG = {
  maxVisibleActivities: 14, // 最多显示 14 个活动
  activityRowHeight: 24, // 每行高度（px）
  maxVisibleRows: 8, // 超过 8 行开始滚动
} as const;

export interface ToolActivityListProps {
  /** 工具活动列表 */
  activities: ToolActivity[];
  /** 是否显示执行时长 */
  showDuration?: boolean;
  /** 最多显示几条（默认 14） */
  maxVisible?: number;
  /** 是否自动滚动到最新 */
  autoScroll?: boolean;
  /** 点击活动的回调 */
  onActivityClick?: (activity: ToolActivity) => void;
  /** 额外的 className */
  className?: string;
}

/**
 * ToolActivityList - 工具活动列表容器
 *
 * 特性：
 * - 自动滚动到最新活动
 * - 限制最大显示数量
 * - 支持点击展开详情
 * - 动画进入/退出
 *
 * 参考：Craft Agent OSS TurnCard.tsx
 */
export function ToolActivityList({
  activities,
  showDuration = true,
  maxVisible = SIZE_CONFIG.maxVisibleActivities,
  autoScroll = true,
  onActivityClick,
  className,
}: ToolActivityListProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // 显示所有活动（不限制数量，让卡片自动扩展）
  const visibleActivities = activities;

  // 自动滚动到底部
  React.useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [activities, autoScroll]);

  if (activities.length === 0) {
    return null;
  }

  // 计算最大高度：6 行 × 24px + 间距
  const maxHeight = SIZE_CONFIG.maxVisibleRows * SIZE_CONFIG.activityRowHeight +
    (SIZE_CONFIG.maxVisibleRows - 1) * 2; // space-y-0.5 = 2px

  return (
    <div
      ref={containerRef}
      className={cn(
        "space-y-0.5 overflow-y-auto scrollbar-hide",
        className
      )}
      style={{
        maxHeight: `${maxHeight}px`,
        scrollbarWidth: 'none',  // Firefox
        msOverflowStyle: 'none', // IE/Edge
      }}
    >
      <AnimatePresence initial={false}>
        {visibleActivities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{
              duration: 0.2,
              ease: "easeOut",
              // 交错动画：前 10 个活动有延迟
              delay: index < 10 ? index * 0.05 : 0,
            }}
          >
            <ToolActivityRow
              activity={activity}
              showDuration={showDuration}
              onClick={
                onActivityClick ? () => onActivityClick(activity) : undefined
              }
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
