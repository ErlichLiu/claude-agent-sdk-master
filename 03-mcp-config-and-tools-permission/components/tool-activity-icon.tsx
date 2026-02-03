"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Circle,
  CheckCircle2,
  XCircle,
  Pencil,
  FilePenLine,
  FileText,
  Terminal,
  Search,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "./ui/spinner";
import type { ActivityStatus } from "@/lib/tool-activity";

/**
 * 尺寸配置
 */
const SIZE_CONFIG = {
  iconSize: "w-3 h-3",
  spinnerSize: "text-[10px]",
} as const;

/**
 * 工具图标配置
 *
 * 支持两种配置方式：
 * 1. Lucide Icon 组件
 * 2. Emoji 字符串
 *
 * 可在应用启动时通过 registerToolIcon() 注册新工具图标
 */
interface ToolIconConfig {
  icon: LucideIcon | string;
  color?: string;
}

const TOOL_ICON_REGISTRY = new Map<string, ToolIconConfig>([
  // 文件操作工具
  ["Edit", { icon: Pencil, color: "text-blue-500" }],
  ["Write", { icon: FilePenLine, color: "text-blue-500" }],
  ["Read", { icon: FileText, color: "text-green-500" }],

  // 搜索工具
  ["Grep", { icon: Search, color: "text-purple-500" }],
  ["Glob", { icon: Search, color: "text-purple-500" }],

  // 执行工具
  ["Bash", { icon: Terminal, color: "text-orange-500" }],

  // MCP 工具可以使用 emoji
  ["mcp__example__tool", { icon: "🔧" }],
]);

/**
 * 注册新工具图标（应用启动时调用）
 */
export function registerToolIcon(toolName: string, config: ToolIconConfig): void {
  TOOL_ICON_REGISTRY.set(toolName, config);
}

/**
 * 获取工具图标配置
 */
function getToolIconConfig(toolName?: string): ToolIconConfig | undefined {
  if (!toolName) return undefined;
  return TOOL_ICON_REGISTRY.get(toolName);
}

export interface ToolActivityIconProps {
  /** 工具状态 */
  status: ActivityStatus;
  /** 工具名称（用于特殊图标） */
  toolName?: string;
  /** 自定义图标（emoji 或 data URL） */
  customIcon?: string;
  /** 额外的 className */
  className?: string;
}

/**
 * ToolActivityIcon - 工具状态图标（带动画过渡）
 *
 * 状态映射：
 * - pending: 空心圆圈
 * - running: 旋转 Spinner
 * - completed: 根据工具名称显示特定图标（参见 TOOL_ICON_REGISTRY）
 * - error: 红色叉号
 * - backgrounded: 蓝色 Spinner
 *
 * 工具图标配置：
 * - 内置工具：Edit, Write, Read, Bash, Grep, Glob
 * - MCP 工具：可通过 registerToolIcon() 注册
 * - 自定义图标：通过 customIcon prop 传入 emoji 或 URL
 *
 * 参考：Craft Agent OSS TurnCard.tsx:604-683
 */
export function ToolActivityIcon({
  status,
  toolName,
  customIcon,
  className,
}: ToolActivityIconProps) {
  const renderIcon = () => {
    // 完成状态：优先使用自定义图标
    if (status === "completed" && customIcon) {
      // 检查是否为 emoji（短字符串，非 URL）
      const isLikelyEmoji =
        customIcon.length <= 8 && !/^(https?:\/\/|data:)/.test(customIcon);

      if (isLikelyEmoji) {
        return (
          <span
            className={cn(
              SIZE_CONFIG.iconSize,
              "shrink-0 flex items-center justify-center text-[10px] leading-none"
            )}
          >
            {customIcon}
          </span>
        );
      }

      // 否则是 data URL 或 HTTP URL
      return (
        <img
          src={customIcon}
          alt=""
          className={cn(
            SIZE_CONFIG.iconSize,
            "shrink-0 rounded-sm object-contain"
          )}
        />
      );
    }

    // 根据状态渲染默认图标
    switch (status) {
      case "pending":
        return (
          <Circle
            className={cn(
              SIZE_CONFIG.iconSize,
              "shrink-0 text-muted-foreground/50"
            )}
          />
        );

      case "running":
        return (
          <div
            className={cn(
              SIZE_CONFIG.iconSize,
              "flex items-center justify-center shrink-0"
            )}
          >
            <Spinner className={SIZE_CONFIG.spinnerSize} />
          </div>
        );

      case "backgrounded":
        return (
          <div
            className={cn(
              SIZE_CONFIG.iconSize,
              "flex items-center justify-center shrink-0"
            )}
          >
            <Spinner className={cn(SIZE_CONFIG.spinnerSize, "text-blue-500")} />
          </div>
        );

      case "completed":
        // 查找工具图标配置
        const toolConfig = getToolIconConfig(toolName);
        if (toolConfig) {
          const IconComponent = toolConfig.icon;

          // 如果是字符串（emoji）
          if (typeof IconComponent === "string") {
            return (
              <span
                className={cn(
                  SIZE_CONFIG.iconSize,
                  "shrink-0 flex items-center justify-center text-[10px] leading-none",
                  toolConfig.color
                )}
              >
                {IconComponent}
              </span>
            );
          }

          // 如果是 Lucide Icon 组件
          return (
            <IconComponent
              className={cn(
                SIZE_CONFIG.iconSize,
                "shrink-0",
                toolConfig.color || "text-green-500"
              )}
            />
          );
        }

        // 默认绿色勾选
        return (
          <CheckCircle2
            className={cn(SIZE_CONFIG.iconSize, "shrink-0 text-green-500")}
          />
        );

      case "error":
        return (
          <XCircle
            className={cn(SIZE_CONFIG.iconSize, "shrink-0 text-red-500")}
          />
        );

      default:
        return (
          <Circle
            className={cn(
              SIZE_CONFIG.iconSize,
              "shrink-0 text-muted-foreground/50"
            )}
          />
        );
    }
  };

  // 使用 AnimatePresence 实现状态切换的淡入淡出动画
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn("shrink-0", className)}
      >
        {renderIcon()}
      </motion.div>
    </AnimatePresence>
  );
}
