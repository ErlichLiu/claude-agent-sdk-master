/**
 * 流式对话 API Route (PromaAgent 重构版)
 *
 * 🎯 核心改进：事件驱动架构
 *
 * ✅ 使用 PromaAgent 类：
 * - 将 SDK 消息转换为标准化的 AgentEvents
 * - 无状态工具匹配（ToolIndex + 直接 ID 匹配）
 * - 清晰的三层架构：SDK → AgentEvents → Frontend
 *
 * 优势：
 * 1. 可测试性：PromaAgent 可独立测试
 * 2. 可复用性：同样的事件可用于 WebSocket、gRPC 等
 * 3. 简洁性：269 行 → ~150 行
 * 4. 可扩展性：轻松添加工具调用、后台任务等功能
 */

import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { PromaAgent, type AgentEvent } from '@04-agent-teams/shared/agent';
import type { ChatMessage } from '@04-agent-teams/core';
import type { CanUseTool } from '@anthropic-ai/claude-agent-sdk';
import { getStorage } from '@/lib/storage';
import { addPending, resolvePending } from '@/lib/permission-store';

const TEAMS_DIR = path.join(os.homedir(), '.claude', 'teams');

interface InboxMessage {
  from: string;
  text: string;
  summary?: string;
  timestamp?: string;
  read?: boolean;
}

/**
 * 通过 sessionId 查找对应的 team 名称和 inbox 路径
 */
async function findTeamLeadInboxPath(sessionId: string): Promise<{ teamName: string; inboxPath: string } | null> {
  let teamEntries: string[];
  try {
    teamEntries = await fs.readdir(TEAMS_DIR);
  } catch {
    return null;
  }

  for (const teamName of teamEntries) {
    const configPath = path.join(TEAMS_DIR, teamName, 'config.json');
    try {
      const raw = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(raw) as { leadSessionId?: string };
      if (config.leadSessionId === sessionId) {
        const inboxPath = path.join(TEAMS_DIR, teamName, 'inboxes', 'team-lead.json');
        return { teamName, inboxPath };
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * 读取 team-lead 收件箱中未读的消息（排除系统类型）
 */
async function readUnreadTeamLeadMessages(inboxPath: string): Promise<InboxMessage[]> {
  try {
    const raw = await fs.readFile(inboxPath, 'utf-8');
    const messages: InboxMessage[] = JSON.parse(raw);
    return messages.filter((m) => {
      if (m.read) return false;
      // 跳过纯系统通知（idle_notification、shutdown_*、permission_request）
      try {
        const parsed = JSON.parse(m.text) as Record<string, unknown>;
        const t = parsed.type;
        if (
          t === 'idle_notification' ||
          t === 'shutdown_request' ||
          t === 'shutdown_approved' ||
          t === 'permission_request'
        ) {
          return false;
        }
      } catch {
        // 不是 JSON，保留
      }
      return true;
    });
  } catch {
    return [];
  }
}

/**
 * 将收件箱中所有消息标记为已读
 */
async function markInboxAsRead(inboxPath: string): Promise<void> {
  try {
    const raw = await fs.readFile(inboxPath, 'utf-8');
    const messages: InboxMessage[] = JSON.parse(raw);
    const updated = messages.map((m) => ({ ...m, read: true }));
    await fs.writeFile(inboxPath, JSON.stringify(updated, null, 2), 'utf-8');
  } catch {
    // 忽略错误
  }
}

/**
 * 格式化未读收件箱消息，作为自动恢复的 prompt（包含完整 text 内容）
 */
function formatInboxPrompt(messages: InboxMessage[]): string {
  const sections = messages.map((m) => {
    const header = `**来自 ${m.from}**${m.summary ? `（${m.summary}）` : ''}:`;
    // 尝试解析 JSON 消息中的 content 字段
    let body = m.text;
    try {
      const parsed = JSON.parse(m.text) as Record<string, unknown>;
      if (typeof parsed.content === 'string') body = parsed.content;
    } catch { /* 非 JSON */ }
    return `${header}\n${body}`;
  });
  return (
    `[系统通知] 你的工作者 Agent 已完成任务，以下是他们发送的完整工作结果：\n\n` +
    sections.join('\n\n---\n\n') +
    `\n\n请基于以上工作结果，向用户提供完整、详尽的最终回复。`
  );
}



/**
 * 检测所有工作者 Agent 是否已进入 idle 状态（已发送 idle_notification）
 * 用于检测 Worker 卡死状态：Task 工具仍在等待但 Workers 已停止工作
 */
async function areAllWorkersIdle(sessionId: string, startedCount: number): Promise<boolean> {
  if (startedCount === 0) return false;
  const inboxInfo = await findTeamLeadInboxPath(sessionId);
  if (!inboxInfo) return false;
  try {
    const raw = await fs.readFile(inboxInfo.inboxPath, 'utf-8');
    const messages: InboxMessage[] = JSON.parse(raw);
    const idleWorkers = new Set<string>();
    for (const msg of messages) {
      try {
        const parsed = JSON.parse(msg.text) as Record<string, unknown>;
        if (parsed.type === 'idle_notification') {
          idleWorkers.add(msg.from);
        }
      } catch { /* non-JSON */ }
    }
    return idleWorkers.size >= startedCount;
  } catch {
    return false;
  }
}


/** task_notification 收集的摘要信息（用作 inbox 为空时的 fallback） */
interface TaskNotificationSummary {
  taskId: string;
  status: 'completed' | 'failed' | 'stopped';
  summary: string;
  outputFile?: string;
}

/** inbox 重试轮询配置 */
interface InboxRetryConfig {
  maxAttempts: number;
  delayMs: number;
}

const INBOX_RETRY_CONFIG: InboxRetryConfig = {
  maxAttempts: 5,
  delayMs: 2000,
};

/**
 * 带重试的 inbox 轮询
 * Workers 写入 inbox 有时序延迟，需要多次尝试
 */
async function pollInboxWithRetry(
  inboxPath: string,
  config: InboxRetryConfig,
): Promise<InboxMessage[]> {
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    const messages = await readUnreadTeamLeadMessages(inboxPath);
    if (messages.length > 0) {
      console.log(`📬 Inbox poll attempt ${attempt}/${config.maxAttempts}: found ${messages.length} messages`);
      return messages;
    }
    if (attempt < config.maxAttempts) {
      console.log(`📭 Inbox poll attempt ${attempt}/${config.maxAttempts}: empty, retrying in ${config.delayMs}ms`);
      await new Promise<void>((resolve) => setTimeout(resolve, config.delayMs));
    }
  }
  console.log(`📭 Inbox poll: exhausted ${config.maxAttempts} attempts, inbox still empty`);
  return [];
}

/**
 * 用 task_notification 的 summaries 构造 fallback resume prompt
 * 当 inbox 为空但有 task 完成摘要时使用
 */
function formatSummaryFallbackPrompt(summaries: TaskNotificationSummary[]): string {
  const sections = summaries.map((s) => {
    const statusLabel = s.status === 'completed' ? '✅ 已完成' : `⚠️ ${s.status}`;
    return `- **Task ${s.taskId}** (${statusLabel}): ${s.summary}`;
  });
  return (
    `[系统通知] 你的工作者 Agent 已完成任务。以下是各任务的完成摘要：\n\n` +
    sections.join('\n') +
    `\n\n请基于以上任务摘要，向用户提供完整、详尽的最终回复。`
  );
}

interface ToolActivityRecord {
  toolUseId: string;
  toolName: string;
  toolInput?: Record<string, unknown>;
  toolResult?: string;
  toolStatus?: 'pending' | 'running' | 'completed' | 'failed';
  toolIntent?: string;
  toolDisplayName?: string;
  startTime?: number;
  endTime?: number;
  isError?: boolean;
}

interface ChatRequest {
  message: string;
  sessionId?: string;
  permissionMode?: string;
}

/**
 * 安全地关闭 ReadableStream controller
 * 避免在 controller 已关闭时抛出错误
 */
function safeCloseController(controller: ReadableStreamDefaultController): void {
  try {
    // desiredSize 为 null 表示 controller 已关闭
    if (controller.desiredSize !== null) {
      controller.close();
    }
  } catch (error) {
    // 忽略关闭错误（可能已经被 abort 关闭）
    console.log('Controller already closed:', error instanceof Error ? error.message : 'Unknown error');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { message, sessionId, permissionMode } = body;

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 检查环境变量
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 初始化存储
    const storage = getStorage(process.cwd());
    await storage.initialize();

    // 确定是否需要恢复会话
    const shouldResume = !!sessionId;

    // 创建 SSE 响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let finalSessionId: string | undefined = sessionId;
          let assistantContent = '';
          const assistantMessageId = `msg-${Date.now()}-assistant`;
          const isNewSession = !shouldResume;
          const toolActivities = new Map<string, ToolActivityRecord>();
          // 跟踪 Worker 任务状态（用于判断是否需要等待 inbox 消息）
          const startedTaskIds = new Set<string>();
          const completedTaskIds = new Set<string>();
          // 收集 task_notification 的 summaries（用作 inbox 为空时的 fallback）
          const taskNotificationSummaries: TaskNotificationSummary[] = [];
          // 延迟发送的 result 数据（teams 活跃时不立即发送 result SSE）
          interface DeferredUsage {
            costUsd: number;
            inputTokens: number;
            outputTokens: number;
          }
          let deferredUsage: DeferredUsage | null = null;

          console.log('🔍 Starting chat:', {
            hasSessionId: !!finalSessionId,
            shouldResume,
            sessionId: finalSessionId,
          });

          // 创建 canUseTool 权限回调
          const canUseTool: CanUseTool = async (toolName, input, options) => {
            // Agent Teams: 子 Agent (Worker) 的工具请求直接自动批准
            // Worker 通过 agentID 标识（非空），等待用户审批会导致超时而提前终止
            if (options.agentID) {
              console.log(`✅ Auto-approving worker tool: ${toolName} (agentID: ${options.agentID})`);
              return { behavior: 'allow' };
            }

            // 主 Agent 的工具请求通过 SSE 发给前端等待用户决策
            const requestId = `perm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

            // 通过 SSE 发送权限请求到前端
            const permEvent = JSON.stringify({
              type: 'permission_request',
              data: {
                requestId,
                toolName,
                toolUseId: options.toolUseID,
                input,
                decisionReason: options.decisionReason,
                suggestions: options.suggestions,
              },
              sessionId: finalSessionId,
            });
            controller.enqueue(encoder.encode(`data: ${permEvent}\n\n`));

            // 等待用户决策，同时监听 abort signal
            const pending = addPending(requestId, toolName, options.toolUseID);

            if (options.signal) {
              options.signal.addEventListener('abort', () => {
                resolvePending(requestId, {
                  behavior: 'deny',
                  message: 'Request aborted',
                });
              }, { once: true });
            }

            return pending;
          };

          // 创建 PromaAgent 实例
          const isBypass = permissionMode === 'bypassPermissions';
          const agent = new PromaAgent({
            apiKey,
            workingDirectory: process.cwd(),
            resumeSessionId: sessionId,
            ...(!isBypass && { canUseTool }),
            ...(permissionMode && { permissionMode: permissionMode as 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan' }),
            onSessionIdUpdate: async (sdkSessionId) => {
              // 当获取到 SDK 的 session_id 时触发
              finalSessionId = sdkSessionId;

              if (isNewSession) {
                // 创建会话元数据
                await storage.createSession({
                  type: 'metadata',
                  sessionId: sdkSessionId,
                  config: {
                    model: 'claude-sonnet-4-6',
                  },
                  state: {
                    sessionId: sdkSessionId,
                    isActive: true,
                    currentTurn: 0,
                    totalCostUsd: 0,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  },
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                });
              }

              // 保存用户消息
              const userMessage: ChatMessage = {
                id: `msg-${Date.now()}-user`,
                role: 'user',
                content: message,
                timestamp: Date.now(),
              };
              await storage.appendMessage(sdkSessionId, userMessage);
            },
          });

          // 处理事件流（带 Watchdog：检测 Worker 卡死的死锁状态）
          //
          // 死锁场景：Worker 发送 idle_notification 后等待 team-lead 继续指派工作，
          // 但 team-lead 被 Task 工具阻塞，无法读取收件箱，造成相互等待。
          // Watchdog 每 5 秒检查一次，若所有 Worker 均已 idle 但 Task 工具未返回，
          // 则强制终止主循环并触发 auto-resume（注入 inbox 内容让 team-lead 汇总结果）。
          const loopAbort = new AbortController();
          let abortedByWatchdog = false;
          let completeSeen = false; // 标记是否收到过 complete 事件

          // Watchdog 并行运行，每隔 5 秒检查一次 Worker idle 状态（安全网）
          const WATCHDOG_INTERVAL_MS = 5_000;
          const watchdogDone = (async () => {
            while (!loopAbort.signal.aborted) {
              // 等待 WATCHDOG_INTERVAL_MS 或 abort 信号
              await new Promise<void>((resolve) => {
                const tid = setTimeout(resolve, WATCHDOG_INTERVAL_MS);
                loopAbort.signal.addEventListener('abort', () => { clearTimeout(tid); resolve(); }, { once: true });
              });
              if (loopAbort.signal.aborted) break;

              // 只有在有 Worker 启动 且 未全部收到 task_notification 时才检查
              if (startedTaskIds.size > 0 && completedTaskIds.size < startedTaskIds.size && finalSessionId) {
                const allIdle = await areAllWorkersIdle(finalSessionId, startedTaskIds.size);
                if (allIdle) {
                  console.log(`⚠️ Watchdog: all ${startedTaskIds.size} workers idle but Task tool still pending — aborting for auto-resume`);
                  abortedByWatchdog = true;
                  loopAbort.abort();
                  break;
                }
              }
            }
          })();

          // 主事件循环：手动 .next() 以支持 Promise.race 中断
          const chatGen = agent.chat(message);
          let pendingNext: Promise<IteratorResult<AgentEvent>> | null = null;

          while (!loopAbort.signal.aborted) {
            // 保持唯一的 pending .next() 引用
            if (!pendingNext) {
              pendingNext = chatGen.next() as Promise<IteratorResult<AgentEvent>>;
            }

            // 等待下一个事件 OR watchdog abort
            const abortPromise = new Promise<null>((resolve) => {
              if (loopAbort.signal.aborted) { resolve(null); return; }
              loopAbort.signal.addEventListener('abort', () => resolve(null), { once: true });
            });

            const raceResult = await Promise.race([
              pendingNext.then((r) => ({ kind: 'event' as const, result: r })),
              abortPromise.then(() => ({ kind: 'abort' as const, result: null })),
            ]);

            if (raceResult.kind === 'abort') {
              // Watchdog 触发：终止 generator 并跳出循环
              pendingNext = null;
              await chatGen.return(undefined).catch(() => {});
              break;
            }

            // 收到正常事件
            pendingNext = null;
            if (raceResult.result!.done) break;
            const event = raceResult.result!.value;

            // 跟踪 Worker 任务状态
            if (event.type === 'task_started') startedTaskIds.add(event.taskId);
            if (event.type === 'task_notification') {
              completedTaskIds.add(event.taskId);
              // 收集 summary 用作 fallback
              if (event.summary) {
                taskNotificationSummaries.push({
                  taskId: event.taskId,
                  status: event.status as 'completed' | 'failed' | 'stopped',
                  summary: event.summary,
                  outputFile: event.outputFile,
                });
              }
            }
            if (event.type === 'complete') {
              completeSeen = true;
              // 当有 teams 活跃时，存储 usage 但不立即发送 result SSE
              if (startedTaskIds.size > 0 && event.usage) {
                deferredUsage = {
                  costUsd: event.usage.costUsd ?? 0,
                  inputTokens: event.usage.inputTokens ?? 0,
                  outputTokens: event.usage.outputTokens ?? 0,
                };
              }
            }

            // 是否延迟 result SSE（teams 活跃时延迟到 resume 之后）
            const shouldDeferResult = startedTaskIds.size > 0 && event.type === 'complete';

            await handleAgentEvent(
              event,
              controller,
              encoder,
              storage,
              finalSessionId,
              assistantContent,
              (content) => { assistantContent = content; },
              assistantMessageId,
              toolActivities,
              shouldDeferResult,
            );
          }

          // 停止 watchdog
          loopAbort.abort();
          await watchdogDone;

          const hasActiveTeam = startedTaskIds.size > 0;

          // query() 结束（正常完成或 Watchdog 终止）
          console.log(`📊 Workers: started=${startedTaskIds.size} completed=${completedTaskIds.size} watchdog=${abortedByWatchdog}`);

          // === Auto-Resume：teammates 完成后注入结果让 team-lead 生成最终汇总 ===
          //
          // 当有 teammates 时：
          // 1. result SSE 已被延迟（deferredUsage 存储了 usage 数据）
          // 2. 先发送 waiting_resume 通知前端保持 streaming 状态
          // 3. 轮询 inbox 获取 worker 结果（带重试）
          // 4. 用 inbox 内容或 task_notification summaries 作为 prompt resume session
          // 5. 流式传输 resume 响应到前端
          // 6. 最后发送延迟的 result SSE
          if (hasActiveTeam && finalSessionId) {
            // 通知前端：正在收集 teammate 结果
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'waiting_resume',
              data: { message: '正在收集 teammate 工作结果...' },
            })}\n\n`));

            // 构造 resume prompt（优先 inbox，fallback 到 summaries）
            let resumePrompt: string | null = null;

            const inboxInfo = await findTeamLeadInboxPath(finalSessionId);
            if (inboxInfo) {
              const unreadMessages = await pollInboxWithRetry(
                inboxInfo.inboxPath,
                INBOX_RETRY_CONFIG,
              );
              if (unreadMessages.length > 0) {
                await markInboxAsRead(inboxInfo.inboxPath);
                resumePrompt = formatInboxPrompt(unreadMessages);
                console.log(`📬 Using ${unreadMessages.length} inbox messages for resume`);
              }
            }

            // Fallback：用 task_notification summaries
            if (!resumePrompt && taskNotificationSummaries.length > 0) {
              console.log(`📋 Inbox empty, using ${taskNotificationSummaries.length} task summaries as fallback`);
              resumePrompt = formatSummaryFallbackPrompt(taskNotificationSummaries);
            }

            if (resumePrompt) {
              // 创建 Resume PromaAgent（恢复同一会话）
              const resumeAgent = new PromaAgent({
                apiKey,
                workingDirectory: process.cwd(),
                resumeSessionId: finalSessionId,
                ...(!isBypass && { canUseTool }),
                ...(permissionMode && {
                  permissionMode: permissionMode as 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan',
                }),
              });

              const resumeMessageId = `msg-${Date.now()}-resume`;

              // 通知前端：开始 resume 流式输出（前端创建新的 assistant message）
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'resume_start',
                data: { messageId: resumeMessageId },
              })}\n\n`));

              let resumeContent = '';

              try {
                for await (const event of resumeAgent.chat(resumePrompt)) {
                  if (event.type === 'text_delta') {
                    resumeContent += event.text;
                    // 流式传输每个 text delta 到前端（复用 content 事件）
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      type: 'content',
                      data: event.text,
                      sessionId: finalSessionId,
                    })}\n\n`));
                  }
                  // resume 期间的工具事件也转发到前端
                  if (event.type === 'tool_start') {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      type: 'tool_start',
                      data: {
                        toolName: event.toolName,
                        toolUseId: event.toolUseId,
                        input: event.input,
                        intent: event.intent,
                        displayName: event.displayName,
                        parentToolUseId: event.parentToolUseId,
                      },
                      sessionId: finalSessionId,
                    })}\n\n`));
                  }
                  if (event.type === 'tool_result') {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      type: 'tool_result',
                      data: {
                        toolUseId: event.toolUseId,
                        toolName: event.toolName,
                        result: event.result,
                        isError: event.isError,
                        parentToolUseId: event.parentToolUseId,
                      },
                      sessionId: finalSessionId,
                    })}\n\n`));
                  }
                }
              } catch (resumeError) {
                console.error('❌ Resume agent error:', resumeError);
                // 已流式的部分内容保留，继续发送 result
              }

              // 保存 resume 消息到存储
              if (resumeContent) {
                const resumeMessage: ChatMessage = {
                  id: resumeMessageId,
                  role: 'assistant',
                  content: resumeContent,
                  timestamp: Date.now(),
                };
                await storage.appendMessage(finalSessionId, resumeMessage);
              }

              console.log(`✅ Resume complete, content length: ${resumeContent.length}`);
            } else {
              console.log('⚠️ No resume content available (no inbox messages, no summaries)');
            }

            // 发送延迟的 result SSE
            const resultPayload = deferredUsage ?? { costUsd: 0, inputTokens: 0, outputTokens: 0 };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'result',
              data: {
                sessionId: finalSessionId,
                totalCostUsd: resultPayload.costUsd,
                inputTokens: resultPayload.inputTokens,
                outputTokens: resultPayload.outputTokens,
              },
            })}\n\n`));
          } else if (abortedByWatchdog && !completeSeen) {
            // Watchdog 终止但没收到 complete 事件：发送兜底 result
            console.log('🔔 Watchdog aborted without complete — sending synthetic result');
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'result',
              data: {
                sessionId: finalSessionId || sessionId,
                totalCostUsd: 0,
                inputTokens: 0,
                outputTokens: 0,
              },
            })}\n\n`));
          }

          safeCloseController(controller);
        } catch (error) {
          console.error('❌ Error in agent chat:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const errorStack = error instanceof Error ? error.stack : '';
          console.error('Error stack:', errorStack);

          // 检查是否是 session 不存在的错误
          let userFriendlyMessage = errorMessage;
          if (
            errorMessage.includes('exited with code 1') ||
            errorMessage.includes('Session') ||
            errorMessage.includes('resume')
          ) {
            userFriendlyMessage = '会话已过期或不存在。请开始新的对话。';
          }

          const errorData = JSON.stringify({
            type: 'error',
            data: {
              error: userFriendlyMessage,
              details: process.env.DEBUG === 'true' ? errorStack : undefined,
            },
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          safeCloseController(controller);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * 处理单个 AgentEvent
 *
 * 这是事件驱动架构的核心：每种事件类型都有对应的处理逻辑
 */
/** 快捷辅助：发送 Agent Teams 相关的 SSE 事件 */
function agentTeamEventSSE(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  type: string,
  data: Record<string, unknown>
): void {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`));
}

async function handleAgentEvent(
  event: AgentEvent,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  storage: ReturnType<typeof getStorage>,
  sessionId: string | undefined,
  assistantContent: string,
  setAssistantContent: (content: string) => void,
  assistantMessageId: string,
  toolActivities: Map<string, ToolActivityRecord>,
  deferResult?: boolean,
): Promise<void> {
  switch (event.type) {
    case 'text_delta': {
      // 累积文本内容
      setAssistantContent(assistantContent + event.text);

      // 发送流式数据到前端
      if (sessionId) {
        const data = JSON.stringify({
          type: 'content',
          data: event.text,
          sessionId,
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }
      break;
    }

    case 'text_complete': {
      // 文本完整时不需要特殊处理（已经通过 text_delta 发送）
      // 但可以记录日志或发送元数据
      console.log('✅ Text complete:', {
        isIntermediate: event.isIntermediate,
        length: event.text.length,
      });
      break;
    }

    case 'tool_start': {
      // 工具开始调用
      console.log('🔧 Tool start:', event.toolName, event.toolUseId);

      // 记录工具活动
      toolActivities.set(event.toolUseId, {
        toolUseId: event.toolUseId,
        toolName: event.toolName,
        toolInput: event.input,
        toolIntent: event.intent,
        toolDisplayName: event.displayName,
        toolStatus: 'running',
        startTime: Date.now(),
      });

      // 发送工具开始事件到前端
      const data = JSON.stringify({
        type: 'tool_start',
        data: {
          toolName: event.toolName,
          toolUseId: event.toolUseId,
          input: event.input,
          intent: event.intent,
          displayName: event.displayName,
          parentToolUseId: event.parentToolUseId,
        },
        sessionId,
      });
      controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      break;
    }

    case 'tool_result': {
      // 工具执行结果
      console.log('✅ Tool result:', event.toolUseId, event.isError ? '(error)' : '(success)');

      // 更新工具活动记录
      const activity = toolActivities.get(event.toolUseId);
      if (activity) {
        activity.toolResult = event.result;
        activity.toolStatus = event.isError ? 'failed' : 'completed';
        activity.isError = event.isError;
        activity.endTime = Date.now();
      } else {
        // 如果没有对应的 tool_start，创建新记录
        toolActivities.set(event.toolUseId, {
          toolUseId: event.toolUseId,
          toolName: event.toolName || 'Unknown',
          toolInput: event.input,
          toolResult: event.result,
          toolStatus: event.isError ? 'failed' : 'completed',
          isError: event.isError,
          endTime: Date.now(),
        });
      }

      // 发送工具结果事件到前端
      const data = JSON.stringify({
        type: 'tool_result',
        data: {
          toolUseId: event.toolUseId,
          toolName: event.toolName,
          result: event.result,
          isError: event.isError,
          parentToolUseId: event.parentToolUseId,
        },
        sessionId,
      });
      controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      break;
    }

    case 'complete': {
      // 对话完成
      if (!sessionId) {
        console.warn('⚠️ No session ID when completing');
        break;
      }

      // 1. 保存助手消息
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: assistantContent,
        timestamp: Date.now(),
      };
      await storage.appendMessage(sessionId, assistantMessage);

      // 2. 保存所有工具活动作为独立消息
      for (const [toolUseId, activity] of toolActivities) {
        const toolMessage: ChatMessage = {
          id: `tool-${toolUseId}`,
          role: 'tool',
          content: activity.toolResult || '',
          timestamp: activity.endTime || Date.now(),
          toolName: activity.toolName,
          toolUseId: activity.toolUseId,
          toolInput: activity.toolInput,
          toolResult: activity.toolResult,
          toolStatus: activity.toolStatus,
          toolDuration: activity.startTime && activity.endTime
            ? activity.endTime - activity.startTime
            : undefined,
          toolIntent: activity.toolIntent,
          toolDisplayName: activity.toolDisplayName,
        };
        await storage.appendMessage(sessionId, toolMessage);

        // 发送工具消息到前端（让客户端添加到 messages 数组）
        const toolMessageData = JSON.stringify({
          type: 'tool_message',
          data: toolMessage,
          sessionId,
        });
        controller.enqueue(encoder.encode(`data: ${toolMessageData}\n\n`));
      }

      // 3. 更新会话元数据
      if (event.usage) {
        await storage.updateSessionMetadata(sessionId, {
          state: {
            sessionId,
            isActive: false,
            currentTurn: 0, // 这个值应该从 SDK 获取，暂时用 0
            totalCostUsd: event.usage.costUsd ?? 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          updatedAt: Date.now(),
        });
      }

      // 发送完成事件到前端（teams 活跃时延迟发送，等 resume 完成后再发）
      if (!deferResult) {
        const resultData = JSON.stringify({
          type: 'result',
          data: {
            sessionId,
            totalCostUsd: event.usage?.costUsd ?? 0,
            inputTokens: event.usage?.inputTokens ?? 0,
            outputTokens: event.usage?.outputTokens ?? 0,
          },
        });
        controller.enqueue(encoder.encode(`data: ${resultData}\n\n`));
      } else {
        console.log('⏳ Result deferred — waiting for auto-resume');
      }
      break;
    }

    case 'error': {
      // 错误事件
      console.error('❌ Agent error:', event.message);

      const errorData = JSON.stringify({
        type: 'error',
        data: {
          error: event.message,
        },
      });
      controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
      break;
    }

    case 'status':
    case 'info': {
      // 状态/信息事件（可选处理）
      console.log(`ℹ️ ${event.type}:`, event.message);
      break;
    }

    case 'task_started': {
      console.log('🤖 Task started:', event.taskId, event.description);
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'task_started',
        data: { taskId: event.taskId, toolUseId: event.toolUseId, description: event.description, taskType: event.taskType },
      })}\n\n`));
      break;
    }

    case 'task_progress': {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'task_progress',
        data: { taskId: event.taskId, toolUseId: event.toolUseId, description: event.description, lastToolName: event.lastToolName, usage: event.usage },
      })}\n\n`));
      break;
    }

    case 'task_notification': {
      console.log('✅ Task notification:', event.taskId, event.status);
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'task_notification',
        data: { taskId: event.taskId, toolUseId: event.toolUseId, status: event.status, summary: event.summary, outputFile: event.outputFile, usage: event.usage },
      })}\n\n`));
      break;
    }

    case 'tool_progress': {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'tool_progress',
        data: { toolUseId: event.toolUseId, toolName: event.toolName, parentToolUseId: event.parentToolUseId, elapsedSeconds: event.elapsedSeconds, taskId: event.taskId },
      })}\n\n`));
      break;
    }

    default: {
      // 未知事件类型
      console.warn('⚠️ Unknown event type:', (event as AgentEvent).type);
      break;
    }
  }
}
