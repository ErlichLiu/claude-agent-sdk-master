/**
 * 工具图标配置示例
 *
 * 在应用启动时注册自定义工具图标（MCP 工具等）
 */

import { registerToolIcon } from "@/components/tool-activity-icon";
import { Database, Globe, Mail, FileJson } from "lucide-react";

/**
 * 初始化工具图标注册
 *
 * 在 app/layout.tsx 或应用入口调用此函数
 */
export function initializeToolIcons(): void {
  // 示例：注册 MCP 工具图标

  // 方式 1: 使用 Lucide Icons
  registerToolIcon("mcp__database__query", {
    icon: Database,
    color: "text-cyan-500",
  });

  registerToolIcon("mcp__web__fetch", {
    icon: Globe,
    color: "text-indigo-500",
  });

  registerToolIcon("mcp__email__send", {
    icon: Mail,
    color: "text-rose-500",
  });

  // 方式 2: 使用 Emoji
  registerToolIcon("mcp__weather__get", {
    icon: "🌤️",
  });

  registerToolIcon("mcp__translate__text", {
    icon: "🌐",
  });

  registerToolIcon("mcp__calendar__create", {
    icon: "📅",
  });

  // 方式 3: 使用 JSON 处理工具
  registerToolIcon("mcp__json__parse", {
    icon: FileJson,
    color: "text-amber-500",
  });
}
