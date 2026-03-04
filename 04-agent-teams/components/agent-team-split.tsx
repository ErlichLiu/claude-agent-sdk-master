'use client';

import * as React from 'react';
import {
  Brain, CheckCircle2, XCircle, StopCircle, Loader2,
  Wrench, Clock, FileText, ChevronDown, ChevronUp, ExternalLink,
  MessageSquare, Coins,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeammateState } from '@/lib/agent-team-store';
import type { TeamConfig, ParsedMailboxMessage } from '@/app/api/agent-teams/route';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { Spinner } from '@/components/ui/spinner';

// ============================================================================
// 辅助函数
// ============================================================================

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
}

function getTaskTypeLabel(taskType?: string): string {
  if (!taskType || taskType === 'in_process_teammate') return 'Teammate';
  return taskType
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractShortTitle(description: string): string {
  const words = description.trim().split(/\s+/);
  let title = '';
  for (const word of words) {
    if ((title + ' ' + word).trim().length > 40) break;
    title = (title + ' ' + word).trim();
  }
  return title || description.slice(0, 40);
}

// ============================================================================
// StatusBadge
// ============================================================================

function StatusBadge({ status }: { status: TeammateState['status'] }) {
  if (status === 'running') {
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-blue-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        running
      </span>
    );
  }
  if (status === 'completed') {
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-500">
        <CheckCircle2 className="h-3 w-3" />
        done
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-destructive">
        <XCircle className="h-3 w-3" />
        failed
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
      <StopCircle className="h-3 w-3" />
      stopped
    </span>
  );
}

// ============================================================================
// ToolHistoryRow
// ============================================================================

function ToolHistoryRow({ history, currentToolName }: { history: string[]; currentToolName?: string }) {
  const displayed = history.filter((t) => t !== currentToolName).slice(-6);
  if (displayed.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {displayed.map((tool, i) => (
        <span
          key={`${tool}-${i}`}
          className="inline-block rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground/70"
        >
          {tool}
        </span>
      ))}
    </div>
  );
}

// ============================================================================
// SectionHeader — 内容区段标题
// ============================================================================

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[12px] font-medium text-muted-foreground">{title}</span>
      {count !== undefined && (
        <span className="text-[11px] text-muted-foreground/50">({count})</span>
      )}
    </div>
  );
}

// ============================================================================
// dedupeToolHistory — 统计工具使用频次
// ============================================================================

interface ToolCount {
  name: string;
  count: number;
}

function dedupeToolHistory(history: string[]): ToolCount[] {
  const map = new Map<string, number>();
  for (const tool of history) {
    map.set(tool, (map.get(tool) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
}

// ============================================================================
// TeammateOutputSheet — 产出内容查看抽屉
// ============================================================================

interface TeammateOutputSheetProps {
  teammate: TeammateState;
  agentName?: string;
  inboxMessages?: ParsedMailboxMessage[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function TeammateOutputSheet({ teammate, agentName, inboxMessages, open, onOpenChange }: TeammateOutputSheetProps) {
  const [content, setContent] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [toolsExpanded, setToolsExpanded] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (!teammate.outputFile) return;

    setLoading(true);
    setContent(null);
    setError(null);

    fetch('/api/agent-output', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputFile: teammate.outputFile }),
    })
      .then((res) => res.json())
      .then((data: { content?: string; error?: string }) => {
        if (data.error) {
          setError(data.error);
        } else {
          setContent(data.content ?? '');
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [open, teammate.outputFile]);

  const typeLabel = getTaskTypeLabel(teammate.taskType);
  const durationMs = teammate.endedAt
    ? teammate.endedAt - teammate.startedAt
    : Date.now() - teammate.startedAt;

  // 过滤掉系统消息，获取有效的 inbox 消息
  const filteredInbox = React.useMemo(() => {
    if (!inboxMessages) return [];
    return inboxMessages.filter((m) => {
      try {
        const parsed = JSON.parse(m.text) as Record<string, unknown>;
        const t = parsed.type;
        if (t === 'idle_notification' || t === 'shutdown_request' || t === 'shutdown_approved') return false;
      } catch { /* 非 JSON，保留 */ }
      return true;
    });
  }, [inboxMessages]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[600px] sm:max-w-[600px] flex flex-col gap-0 p-0"
      >
        {/* 头部 */}
        <SheetHeader className="border-b px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-500 shrink-0" />
            <span className="text-[11px] text-violet-400/80 font-medium">
              #{teammate.index} {typeLabel}
            </span>
            <StatusBadge status={teammate.status} />
          </div>
          <SheetTitle className="text-base leading-snug">
            {agentName ?? `Teammate #${teammate.index}`}
          </SheetTitle>
          <SheetDescription className="text-[12px] leading-snug sr-only">
            Agent teammate 详细工作报告
          </SheetDescription>
        </SheetHeader>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto">

          {/* ── 1. 执行概览 ── */}
          <div className="px-6 py-4 border-b border-border/30">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center rounded-lg bg-muted/30 px-3 py-2.5">
                <Clock className="h-3.5 w-3.5 text-blue-500 mb-1" />
                <span className="text-[13px] font-semibold tabular-nums">{formatMs(durationMs)}</span>
                <span className="text-[10px] text-muted-foreground">耗时</span>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-muted/30 px-3 py-2.5">
                <Wrench className="h-3.5 w-3.5 text-amber-500 mb-1" />
                <span className="text-[13px] font-semibold tabular-nums">
                  {teammate.usage?.toolUses ?? teammate.toolHistory.length}
                </span>
                <span className="text-[10px] text-muted-foreground">工具调用</span>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-muted/30 px-3 py-2.5">
                <Coins className="h-3.5 w-3.5 text-emerald-500 mb-1" />
                <span className="text-[13px] font-semibold tabular-nums">
                  {teammate.usage ? `${(teammate.usage.totalTokens / 1000).toFixed(1)}k` : '-'}
                </span>
                <span className="text-[10px] text-muted-foreground">tokens</span>
              </div>
            </div>

            {/* 时间信息 */}
            <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground/60 tabular-nums">
              <span>开始: {new Date(teammate.startedAt).toLocaleTimeString()}</span>
              {teammate.endedAt && (
                <span>结束: {new Date(teammate.endedAt).toLocaleTimeString()}</span>
              )}
            </div>
          </div>

          {/* ── 2. 任务描述 ── */}
          <div className="px-6 py-4 border-b border-border/30">
            <SectionHeader icon={<FileText className="h-3.5 w-3.5" />} title="任务描述" />
            <div className="mt-2 rounded-lg border border-violet-500/20 bg-violet-500/5 px-4 py-3">
              <div className="prose prose-sm dark:prose-invert max-w-none text-[13px]">
                <MarkdownRenderer content={teammate.description} />
              </div>
            </div>
          </div>

          {/* ── 3. 工作摘要 ── */}
          {teammate.summary && (
            <div className="px-6 py-4 border-b border-border/30">
              <SectionHeader icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />} title="工作摘要" />
              <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                <div className="prose prose-sm dark:prose-invert max-w-none text-[13px]">
                  <MarkdownRenderer content={teammate.summary} />
                </div>
              </div>
            </div>
          )}

          {/* ── 4. 工具使用记录 ── */}
          {teammate.toolHistory.length > 0 && (
            <div className="px-6 py-4 border-b border-border/30">
              <button
                onClick={() => setToolsExpanded((v) => !v)}
                className="flex items-center gap-2 w-full group"
              >
                <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] font-medium text-muted-foreground">
                  工具使用记录
                </span>
                <span className="text-[11px] text-muted-foreground/50">
                  ({teammate.toolHistory.length} 次)
                </span>
                <span className="ml-auto">
                  {toolsExpanded
                    ? <ChevronUp className="h-3 w-3 text-muted-foreground/50" />
                    : <ChevronDown className="h-3 w-3 text-muted-foreground/50" />}
                </span>
              </button>
              {toolsExpanded && (
                <div className="mt-3 space-y-1">
                  {teammate.toolHistory.map((tool, i) => (
                    <div
                      key={`${tool}-${i}`}
                      className="flex items-center gap-2 rounded px-2 py-1 text-[11px] hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-[10px] text-muted-foreground/40 tabular-nums w-5 text-right shrink-0">
                        {i + 1}
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500/60 shrink-0" />
                      <span className="font-mono text-foreground/70">{tool}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* 不展开时显示紧凑标签 */}
              {!toolsExpanded && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {dedupeToolHistory(teammate.toolHistory).map(({ name, count }) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-0.5 rounded bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/70"
                    >
                      {name}
                      {count > 1 && (
                        <span className="text-[9px] text-muted-foreground/40">×{count}</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 5. 通信记录（Inbox 消息） ── */}
          {filteredInbox.length > 0 && (
            <div className="px-6 py-4 border-b border-border/30">
              <SectionHeader
                icon={<MessageSquare className="h-3.5 w-3.5" />}
                title={`${agentName ?? 'Agent'} 发送的消息`}
                count={filteredInbox.length}
              />
              <div className="mt-3 space-y-3">
                {filteredInbox.map((msg, i) => {
                  let displayText = msg.text;
                  try {
                    const parsed = JSON.parse(msg.text) as Record<string, unknown>;
                    if (typeof parsed.content === 'string') displayText = parsed.content;
                  } catch { /* 非 JSON */ }
                  return (
                    <div key={i} className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
                      {msg.summary && (
                        <p className="text-[10px] font-medium text-blue-500/70 mb-2">{msg.summary}</p>
                      )}
                      <div className="prose prose-sm dark:prose-invert max-w-none text-[13px]">
                        <MarkdownRenderer content={displayText} />
                      </div>
                      {msg.timestamp && (
                        <p className="text-[9px] text-muted-foreground/40 mt-2 pt-2 border-t border-border/20">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 6. 产出文件 ── */}
          {teammate.outputFile && (
            <div className="px-6 py-4">
              <SectionHeader icon={<ExternalLink className="h-3.5 w-3.5" />} title="产出文件" />
              <div className="mt-2 flex items-center gap-1.5 rounded bg-muted/40 px-2 py-1 text-[10px] font-mono text-muted-foreground/60">
                <FileText className="h-3 w-3 shrink-0" />
                <span className="break-all">{teammate.outputFile}</span>
              </div>

              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                  <Spinner className="h-4 w-4" />
                  <span>读取文件中...</span>
                </div>
              )}

              {error && (
                <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {content !== null && !loading && (
                <div className="mt-3 prose prose-sm dark:prose-invert max-w-none rounded-lg border border-border/30 px-4 py-3">
                  <MarkdownRenderer content={content} />
                </div>
              )}
            </div>
          )}

          {/* 没有任何内容时的空状态 */}
          {!teammate.outputFile && !teammate.summary && filteredInbox.length === 0 && (
            <div className="px-6 py-4">
              <div className="rounded-lg border border-muted bg-muted/20 px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {teammate.status === 'stopped'
                    ? '任务被提前终止，未收到产出报告'
                    : '暂无产出内容'}
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">
                  task_notification 未到达，可查看主对话了解详情
                </p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// TeammateCard — 单个 teammate 的状态卡片
// ============================================================================

interface TeammateCardProps {
  teammate: TeammateState;
  agentName?: string;
  inboxMessages?: ParsedMailboxMessage[];
}

function TeammateCard({ teammate, agentName, inboxMessages }: TeammateCardProps) {
  const isRunning = teammate.status === 'running';
  const [detailExpanded, setDetailExpanded] = React.useState(false);
  const [outputSheetOpen, setOutputSheetOpen] = React.useState(false);

  // 实时更新当前工具耗时
  const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(forceUpdate, 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const durationMs = teammate.endedAt
    ? teammate.endedAt - teammate.startedAt
    : Date.now() - teammate.startedAt;

  const borderColor =
    teammate.status === 'running'
      ? 'border-blue-500/40 bg-blue-500/5'
      : teammate.status === 'completed'
      ? 'border-emerald-500/30 bg-emerald-500/5'
      : teammate.status === 'failed'
      ? 'border-destructive/30 bg-destructive/5'
      : 'border-border/50 bg-muted/20';

  const typeLabel = getTaskTypeLabel(teammate.taskType);
  const shortTitle = extractShortTitle(teammate.description);
  const hasToolHistory = teammate.toolHistory.length > 0;
  // 只要任务结束（无论是否有 summary/outputFile）就显示按钮
  const canViewOutput = !isRunning;

  return (
    <>
      <div
        className={cn(
          'flex min-w-[220px] max-w-[300px] flex-col gap-2 rounded-lg border p-3 text-[12px] transition-colors',
          borderColor,
        )}
      >
        {/* 头部：序号 + 类型 + 状态 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Brain className="h-3.5 w-3.5 shrink-0 text-violet-500" />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-medium text-violet-400/80 shrink-0">
                  #{teammate.index}
                </span>
                <span className="text-[10px] text-muted-foreground/60 shrink-0">
                  {typeLabel}
                </span>
              </div>
              <p className="truncate font-semibold text-foreground/90 text-[12px] leading-tight">
                {shortTitle}
              </p>
            </div>
          </div>
          <StatusBadge status={teammate.status} />
        </div>

        {/* 完整任务描述（截断时才显示） */}
        {teammate.description !== shortTitle && (
          <p className="text-muted-foreground leading-snug text-[11px] line-clamp-2 border-l-2 border-violet-500/30 pl-2">
            {teammate.description}
          </p>
        )}

        {/* 当前工具（运行中） */}
        {isRunning && teammate.currentToolName && (
          <div className="flex items-center gap-1.5 rounded-md bg-background/60 px-2 py-1.5 border border-border/40">
            <Wrench className="h-3 w-3 shrink-0 text-amber-500 animate-pulse" />
            <span className="font-mono text-[11px] text-foreground/80 truncate flex-1">
              {teammate.currentToolName}
            </span>
            {teammate.currentToolElapsedSeconds !== undefined && (
              <span className="shrink-0 tabular-nums text-[10px] text-muted-foreground">
                {formatElapsed(teammate.currentToolElapsedSeconds)}
              </span>
            )}
          </div>
        )}

        {/* 进度描述（运行中始终显示） */}
        {isRunning && teammate.progressDescription && (
          <p className="italic text-muted-foreground text-[11px] line-clamp-2 leading-snug">
            {teammate.progressDescription}
          </p>
        )}

        {/* 完成摘要（截断，可通过查看产出看全文） */}
        {!isRunning && teammate.summary && (
          <p className="text-muted-foreground text-[11px] leading-snug line-clamp-2">
            {teammate.summary}
          </p>
        )}

        {/* 工具历史（可折叠） */}
        {hasToolHistory && (
          <>
            <button
              onClick={() => setDetailExpanded((v) => !v)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors self-start"
            >
              {detailExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {detailExpanded ? '收起' : `${teammate.toolHistory.length} 次工具调用`}
            </button>
            {detailExpanded && (
              <ToolHistoryRow
                history={teammate.toolHistory}
                currentToolName={isRunning ? teammate.currentToolName : undefined}
              />
            )}
          </>
        )}

        {/* 底部：时长 + 用量 + 查看产出按钮 */}
        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 tabular-nums">
            <Clock className="h-2.5 w-2.5 shrink-0" />
            <span>{formatMs(durationMs)}</span>
            {teammate.usage && (
              <>
                <span className="opacity-40">·</span>
                <span>{teammate.usage.toolUses} tools</span>
                <span className="opacity-40">·</span>
                <span>{(teammate.usage.totalTokens / 1000).toFixed(1)}k tok</span>
              </>
            )}
          </div>

          {/* 查看产出按钮 */}
          {canViewOutput && (
            <button
              onClick={() => setOutputSheetOpen(true)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors shrink-0"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              查看 Agent 工作
            </button>
          )}
        </div>
      </div>

      {/* 产出查看抽屉 */}
      <TeammateOutputSheet
        teammate={teammate}
        agentName={agentName}
        inboxMessages={inboxMessages}
        open={outputSheetOpen}
        onOpenChange={setOutputSheetOpen}
      />
    </>
  );
}

// ============================================================================
// AgentTeamSplit — 主组件
// ============================================================================

export interface AgentTeamSplitProps {
  teammates: TeammateState[];
  members?: TeamConfig['members'];
  inboxes?: Record<string, ParsedMailboxMessage[]>;
  className?: string;
}

export function AgentTeamSplit({ teammates, members, inboxes, className }: AgentTeamSplitProps) {
  if (teammates.length === 0) return null;

  const runningCount = teammates.filter((t) => t.status === 'running').length;
  const doneCount = teammates.filter((t) => t.status !== 'running').length;

  return (
    <div className={cn('space-y-2', className)}>
      {/* 标题栏 */}
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
        <Brain className="h-3.5 w-3.5 text-violet-500" />
        <span className="font-semibold text-foreground/70">Agent Team</span>
        <span className="text-[11px]">
          {teammates.length} teammate{teammates.length > 1 ? 's' : ''}
        </span>
        {runningCount > 0 && (
          <span className="flex items-center gap-1 text-blue-500 text-[11px]">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
            {runningCount} running
          </span>
        )}
        {doneCount > 0 && runningCount === 0 && (
          <span className="text-emerald-500 text-[11px]">all done</span>
        )}
      </div>

      {/* Teammate 卡片横向排列，可滚动 */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {teammates.map((tm) => {
          // members[0] = team-lead, members[tm.index] = 对应的 worker
          const member = members?.[tm.index];
          const agentName = member?.name;
          // 从 team-lead inbox 找到此 agent 发出的消息
          const inboxMessages = agentName
            ? inboxes?.['team-lead']?.filter((m) => m.from === agentName)
            : undefined;
          return (
            <TeammateCard
              key={tm.taskId}
              teammate={tm}
              agentName={agentName}
              inboxMessages={inboxMessages}
            />
          );
        })}
      </div>
    </div>
  );
}
