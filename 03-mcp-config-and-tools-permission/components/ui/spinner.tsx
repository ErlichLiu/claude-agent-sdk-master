import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpinnerProps {
  /** 额外的 className */
  className?: string;
}

/**
 * Spinner - 基于 SpinKit Grid 的 3x3 网格加载动画
 *
 * 特性:
 * - 默认使用 muted-foreground 颜色（灰色）
 * - 使用 em 单位（随 font-size 缩放）
 * - 3x3 方块网格，带有交错的缩放动画
 * - 纯 CSS 动画（无 JS 状态）
 *
 * 使用示例:
 * ```tsx
 * // 使用默认灰色
 * <Spinner />
 *
 * // 通过 className 覆盖颜色和尺寸
 * <Spinner className="text-blue-500 text-lg" />
 * ```
 */
export function Spinner({ className }: SpinnerProps) {
  return (
    <span
      className={cn("spinner text-muted-foreground", className)}
      role="status"
      aria-label="Loading"
    >
      <span className="spinner-cube" />
      <span className="spinner-cube" />
      <span className="spinner-cube" />
      <span className="spinner-cube" />
      <span className="spinner-cube" />
      <span className="spinner-cube" />
      <span className="spinner-cube" />
      <span className="spinner-cube" />
      <span className="spinner-cube" />
    </span>
  );
}
