"use client";

import * as React from "react";
import { ToolActivityIcon } from "@/components/tool-activity-icon";
import { ToolActivityRow } from "@/components/tool-activity-row";
import { ToolActivityList } from "@/components/tool-activity-list";
import type { ToolActivity, ActivityStatus } from "@/lib/tool-activity";

export default function ToolComponentsTestPage() {
  const [activities, setActivities] = React.useState<ToolActivity[]>([]);

  // 模拟添加工具活动
  const addActivity = (
    toolName: string,
    status: ActivityStatus,
    intent?: string
  ) => {
    const activity: ToolActivity = {
      id: `tool-${Date.now()}-${Math.random()}`,
      type: "tool",
      status,
      toolName,
      toolUseId: `tool-${Date.now()}`,
      toolInput:
        toolName === "Edit"
          ? { file_path: "app/page.tsx" }
          : toolName === "Bash"
            ? { command: "npm install" }
            : {},
      intent,
      timestamp: Date.now(),
      startTime: Date.now(),
      depth: 0,
    };

    setActivities((prev) => [...prev, activity]);

    // 如果是 running 状态，2 秒后自动完成
    if (status === "running") {
      setTimeout(() => {
        setActivities((prev) =>
          prev.map((a) =>
            a.id === activity.id
              ? { ...a, status: "completed" as ActivityStatus, endTime: Date.now() }
              : a
          )
        );
      }, 2000);
    }
  };

  // 清空所有活动
  const clearActivities = () => {
    setActivities([]);
  };

  return (
    <div className="container mx-auto p-8 space-y-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tool Activity Components Test</h1>
        <button
          onClick={clearActivities}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          清空活动
        </button>
      </div>

      {/* ToolActivityIcon Tests */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">ToolActivityIcon 组件</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg space-y-2">
            <div className="text-sm font-medium">Pending</div>
            <ToolActivityIcon status="pending" />
          </div>

          <div className="p-4 border rounded-lg space-y-2">
            <div className="text-sm font-medium">Running</div>
            <ToolActivityIcon status="running" />
          </div>

          <div className="p-4 border rounded-lg space-y-2">
            <div className="text-sm font-medium">Completed</div>
            <ToolActivityIcon status="completed" />
          </div>

          <div className="p-4 border rounded-lg space-y-2">
            <div className="text-sm font-medium">Error</div>
            <ToolActivityIcon status="error" />
          </div>

          <div className="p-4 border rounded-lg space-y-2">
            <div className="text-sm font-medium">Backgrounded</div>
            <ToolActivityIcon status="backgrounded" />
          </div>

          <div className="p-4 border rounded-lg space-y-2">
            <div className="text-sm font-medium">Edit (完成)</div>
            <ToolActivityIcon status="completed" toolName="Edit" />
          </div>

          <div className="p-4 border rounded-lg space-y-2">
            <div className="text-sm font-medium">Write (完成)</div>
            <ToolActivityIcon status="completed" toolName="Write" />
          </div>

          <div className="p-4 border rounded-lg space-y-2">
            <div className="text-sm font-medium">自定义 Emoji</div>
            <ToolActivityIcon status="completed" customIcon="📖" />
          </div>
        </div>
      </section>

      {/* ToolActivityRow Tests */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">ToolActivityRow 组件</h2>

        <div className="space-y-2 p-4 border rounded-lg bg-card">
          <ToolActivityRow
            activity={{
              id: "1",
              type: "tool",
              status: "running",
              toolName: "Read",
              toolUseId: "tool-1",
              intent: "Reading configuration file",
              timestamp: Date.now(),
              startTime: Date.now() - 5000,
            }}
          />

          <ToolActivityRow
            activity={{
              id: "2",
              type: "tool",
              status: "completed",
              toolName: "Edit",
              toolUseId: "tool-2",
              toolInput: { file_path: "app/page.tsx" },
              intent: "Update homepage layout",
              timestamp: Date.now(),
              startTime: Date.now() - 1500,
              endTime: Date.now() - 700,
            }}
          />

          <ToolActivityRow
            activity={{
              id: "3",
              type: "tool",
              status: "error",
              toolName: "Bash",
              toolUseId: "tool-3",
              toolInput: { command: "npm install" },
              error: "Command failed with exit code 1",
              timestamp: Date.now(),
              startTime: Date.now() - 3000,
              endTime: Date.now(),
            }}
          />

          <ToolActivityRow
            activity={{
              id: "4",
              type: "tool",
              status: "completed",
              toolName: "Write",
              toolUseId: "tool-4",
              toolInput: { file_path: "components/new-component.tsx" },
              intent: "Create new React component",
              timestamp: Date.now(),
              startTime: Date.now() - 2000,
              endTime: Date.now() - 500,
            }}
          />
        </div>
      </section>

      {/* ToolActivityList Tests */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">ToolActivityList 组件</h2>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => addActivity("Read", "running", "Reading file")}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            添加 Read (运行中)
          </button>
          <button
            onClick={() => addActivity("Edit", "running", "Editing file")}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            添加 Edit (运行中)
          </button>
          <button
            onClick={() => addActivity("Bash", "running", "Running command")}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            添加 Bash (运行中)
          </button>
          <button
            onClick={() => addActivity("Write", "completed", "File created")}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            添加 Write (完成)
          </button>
          <button
            onClick={() => addActivity("Grep", "error", "Pattern not found")}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            添加 Grep (错误)
          </button>
        </div>

        <div className="p-4 border rounded-lg bg-card">
          {activities.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              点击上方按钮添加工具活动
            </div>
          ) : (
            <>
              <div className="text-sm font-medium mb-3">
                活动列表 ({activities.length} 个)
              </div>
              <ToolActivityList
                activities={activities}
                showDuration
                maxVisible={10}
                onActivityClick={(activity) =>
                  console.log("点击活动:", activity)
                }
              />
            </>
          )}
        </div>
      </section>

      {/* Animation Demo */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">动画演示</h2>

        <div className="p-4 border rounded-lg bg-card">
          <p className="text-sm text-muted-foreground mb-4">
            点击下方按钮，观察图标状态切换的动画效果
          </p>

          <IconAnimationDemo />
        </div>
      </section>
    </div>
  );
}

// 图标动画演示组件
function IconAnimationDemo() {
  const [status, setStatus] = React.useState<ActivityStatus>("pending");

  const statuses: ActivityStatus[] = [
    "pending",
    "running",
    "completed",
    "error",
    "backgrounded",
  ];

  const cycleStatus = () => {
    const currentIndex = statuses.indexOf(status);
    const nextIndex = (currentIndex + 1) % statuses.length;
    setStatus(statuses[nextIndex]);
  };

  return (
    <div className="flex items-center gap-4">
      <ToolActivityIcon status={status} />
      <div className="flex-1">
        <div className="text-sm font-medium">当前状态: {status}</div>
        <div className="text-xs text-muted-foreground">
          观察图标切换时的淡入淡出和缩放动画
        </div>
      </div>
      <button
        onClick={cycleStatus}
        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
      >
        切换状态
      </button>
    </div>
  );
}
