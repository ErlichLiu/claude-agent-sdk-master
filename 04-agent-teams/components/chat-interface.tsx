'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Send, Square } from 'lucide-react';
import type { ChatMessage } from '@04-agent-teams/core';
import { SessionList } from './session-list';
import { FileExplorer } from './file-explorer';
import { MarkdownRenderer } from './markdown-renderer';
import { LoadingIndicator } from './ui/loading-indicator';
import { ToolActivityManager, type ToolActivity, type AgentActivityNode } from '@/lib/tool-activity';
import { AgentTeamStore, type TeammateState } from '@/lib/agent-team-store';
import { PermissionSelector, type PermissionRequest } from './permission-selector';
import { AgentTeamView } from './agent-team-view';
import { AgentTeamSplit } from './agent-team-split';
import { AgentTaskList } from './agent-task-list';
import type { AgentEvent } from '@04-agent-teams/shared/agent';
import type { AgentTeamData } from '@/app/api/agent-teams/route';

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [toolActivities, setToolActivities] = useState<ToolActivity[]>([]);
  const [activityTree, setActivityTree] = useState<AgentActivityNode[]>([]);
  const [teammates, setTeammates] = useState<TeammateState[]>([]);
  const [permissionQueue, setPermissionQueue] = useState<PermissionRequest[]>([]);
  const [permissionMode, setPermissionMode] = useState<string>('default');
  const [agentTeamData, setAgentTeamData] = useState<AgentTeamData | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 用于终止请求的 refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  // 跟踪当前活跃的 assistant message ID（resume 时会更新为新 message）
  const currentAssistantIdRef = useRef<string>('');

  // 创建 ToolActivityManager 实例
  const toolActivityManager = useMemo(() => new ToolActivityManager(), []);
  // 创建 AgentTeamStore 实例
  const agentTeamStore = useMemo(() => new AgentTeamStore(), []);

  // 订阅工具活动更新
  useEffect(() => {
    const unsubscribe = toolActivityManager.subscribe((activities) => {
      setToolActivities(activities);
      setActivityTree(toolActivityManager.getActivityTree());
    });
    return unsubscribe;
  }, [toolActivityManager]);

  // 订阅 Agent Team 更新
  useEffect(() => {
    const unsubscribe = agentTeamStore.subscribe(setTeammates);
    return unsubscribe;
  }, [agentTeamStore]);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 轮询 Agent Teams 任务列表（每 2 秒，仅在有 sessionId 且 streaming 时）
  useEffect(() => {
    if (!sessionId) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/agent-teams?sessionId=${sessionId}`);
        const data = await res.json() as AgentTeamData & { team: null | AgentTeamData['team'] };
        if (data.team) {
          setAgentTeamData(data as AgentTeamData);
        }
      } catch {
        // 忽略轮询错误
      }
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [sessionId, isStreaming]);

  // 加载选中的会话
  const loadSession = async (id: string) => {
    try {
      const response = await fetch(`/api/sessions/${id}`);
      const data = await response.json();
      if (data.messages) {
        setMessages(data.messages);
        setSessionId(id);

        // 清空当前工具活动（历史工具活动会在消息渲染中显示）
        toolActivityManager.clear();
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  // 开始新对话
  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setPermissionQueue([]);
    setAgentTeamData(null);
    agentTeamStore.clear();
  };

  // 终止 Agent 运行
  const handleStop = () => {
    // 取消 fetch 请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 取消流式读取
    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }

    // 更新状态
    setIsStreaming(false);
    setPermissionQueue([]);
    agentTeamStore.finalizeRunning();

    // 标记最后一条消息为已完成
    setMessages((prev) =>
      prev.map((msg, index) =>
        index === prev.length - 1 && msg.isStreaming
          ? { ...msg, isStreaming: false, content: msg.content || '(已终止)' }
          : msg
      )
    );
  };

  // 处理权限决策
  const handlePermissionDecision = async (
    requestId: string,
    behavior: 'allow' | 'deny',
    message?: string,
    updatedInput?: Record<string, unknown>,
    updatedPermissions?: unknown[],
  ) => {
    setPermissionQueue(prev => prev.filter(r => r.requestId !== requestId));
    await fetch('/api/chat/permission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, behavior, message, updatedInput, updatedPermissions }),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    // 清空工具活动（新的对话轮次）
    toolActivityManager.clear();
    agentTeamStore.clear();

    // 创建 AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // 创建助手消息占位符
    const assistantMessageId = `msg-${Date.now()}-assistant`;
    currentAssistantIdRef.current = assistantMessageId;
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          sessionId,
          permissionMode,
        }),
        signal: abortController.signal, // 添加 signal 支持取消
      });

      if (!response.ok) {
        throw new Error('Failed to fetch');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      // 保存 reader 引用以便取消
      readerRef.current = reader;

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'content') {
              // 更新流式内容（使用 ref 跟踪的当前 message ID）
              const targetId = currentAssistantIdRef.current;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === targetId
                    ? { ...msg, content: msg.content + data.data }
                    : msg
                )
              );
              if (data.sessionId && !sessionId) {
                setSessionId(data.sessionId);
              }
            } else if (data.type === 'waiting_workers' || data.type === 'waiting_resume') {
              // 正在等待 Worker 完成 / 正在收集 teammate 结果
              // 保持前端 streaming 状态，无需额外操作
            } else if (data.type === 'resume_start') {
              // resume 开始：结束当前 assistant message，创建新的 streaming message
              const resumeMessageId = data.data.messageId as string;
              const prevId = currentAssistantIdRef.current;
              currentAssistantIdRef.current = resumeMessageId;
              setMessages((prev) => {
                // 结束前一个 assistant message 的 streaming 光标
                const updated = prev.map((msg) =>
                  msg.id === prevId && msg.isStreaming
                    ? { ...msg, isStreaming: false }
                    : msg
                );
                // 添加新的 resume assistant message
                return [...updated, {
                  id: resumeMessageId,
                  role: 'assistant' as const,
                  content: '',
                  timestamp: Date.now(),
                  isStreaming: true,
                }];
              });
            } else if (data.type === 'resume_complete') {
              // LEGACY：向后兼容旧版一次性 resume 事件
              setMessages((prev) => [...prev, {
                id: data.data.messageId,
                role: 'assistant' as const,
                content: data.data.content,
                timestamp: Date.now(),
                isStreaming: false,
              }]);
            } else if (data.type === 'tool_start') {
              // 处理工具开始事件
              const toolEvent: AgentEvent = {
                type: 'tool_start',
                toolName: data.data.toolName,
                toolUseId: data.data.toolUseId,
                input: data.data.input,
                intent: data.data.intent,
                displayName: data.data.displayName,
                parentToolUseId: data.data.parentToolUseId,
              };
              toolActivityManager.handleEvent(toolEvent);
            } else if (data.type === 'tool_result') {
              // 处理工具结果事件
              const toolEvent: AgentEvent = {
                type: 'tool_result',
                toolUseId: data.data.toolUseId,
                toolName: data.data.toolName,
                result: data.data.result,
                isError: data.data.isError,
                parentToolUseId: data.data.parentToolUseId,
              };
              toolActivityManager.handleEvent(toolEvent);
            } else if (data.type === 'task_started') {
              console.log('🚀 task_started:', data.data);
              agentTeamStore.handleEvent({ type: 'task_started', ...data.data });
            } else if (data.type === 'task_progress') {
              agentTeamStore.handleEvent({ type: 'task_progress', ...data.data });
            } else if (data.type === 'task_notification') {
              console.log('📋 task_notification:', data.data);
              agentTeamStore.handleEvent({ type: 'task_notification', ...data.data });
            } else if (data.type === 'tool_progress') {
              agentTeamStore.handleEvent({ type: 'tool_progress', ...data.data });
            } else if (data.type === 'tool_message') {
              // 添加工具消息到 messages 数组
              setMessages((prev) => [...prev, data.data]);
            } else if (data.type === 'permission_request') {
              setPermissionQueue(prev => [...prev, data.data]);
            } else if (data.type === 'result') {
              // 完成 — 将剩余 running teammates 标记为 stopped（兜底）
              agentTeamStore.finalizeRunning();
              const targetId = currentAssistantIdRef.current;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === targetId
                    ? { ...msg, isStreaming: false }
                    : msg
                )
              );
              if (data.data.sessionId) {
                setSessionId(data.data.sessionId);
              }
              // 触发会话列表刷新
              setRefreshTrigger(prev => prev + 1);
            } else if (data.type === 'error') {
              // 错误 — 同样兜底未完成的 teammates
              agentTeamStore.finalizeRunning();
              const targetId = currentAssistantIdRef.current;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === targetId
                    ? {
                        ...msg,
                        content: `Error: ${data.data.error}`,
                        isStreaming: false,
                      }
                    : msg
                )
              );
            }
          }
        }
      }
    } catch (error) {
      // 如果是用户主动取消，不显示错误
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request aborted by user');
        return;
      }

      console.error('Error:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === currentAssistantIdRef.current
            ? {
                ...msg,
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
      // 清理 refs
      abortControllerRef.current = null;
      readerRef.current = null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar - Session List */}
      <SessionList
        currentSessionId={sessionId}
        onSessionSelect={loadSession}
        onNewChat={handleNewChat}
        refreshTrigger={refreshTrigger}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header - Fixed */}
        <div className="shrink-0 border-b bg-background px-6 py-4">
          <h1 className="text-2xl font-semibold">Claude Agent SDK - Quick Start</h1>
          {sessionId && (
            <p className="text-sm text-muted-foreground">Session: {sessionId}</p>
          )}
        </div>

        {/* Messages - Scrollable */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6"
        >
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  Send a message to start chatting with Claude.
                </p>
              </Card>
            ) : (
              messages.map((message, index) => {
                // 收集跟随当前消息的工具消息（用于显示历史工具活动）
                const followingToolMessages: ChatMessage[] = [];
                if (message.role === 'assistant') {
                  let nextIndex = index + 1;
                  while (nextIndex < messages.length && messages[nextIndex].role === 'tool') {
                    followingToolMessages.push(messages[nextIndex]);
                    nextIndex++;
                  }
                }

                // 转换工具消息为 ToolActivity
                const historicalToolActivities: ToolActivity[] = followingToolMessages.map(toolMsg => ({
                  id: toolMsg.toolUseId || toolMsg.id,
                  type: 'tool' as const,
                  status: (toolMsg.toolStatus || 'completed') as any,
                  toolName: toolMsg.toolName,
                  toolUseId: toolMsg.toolUseId,
                  toolInput: toolMsg.toolInput,
                  intent: toolMsg.toolIntent,
                  displayName: toolMsg.toolDisplayName,
                  timestamp: toolMsg.timestamp,
                  startTime: toolMsg.timestamp - (toolMsg.toolDuration || 0),
                  endTime: toolMsg.timestamp,
                  result: toolMsg.toolResult,
                  error: toolMsg.toolStatus === 'failed' ? toolMsg.toolResult : undefined,
                  depth: 0,
                }));

                // 跳过独立的工具消息（已经在助手消息下显示）
                if (message.role === 'tool') {
                  return null;
                }

                return (
                <div key={message.id}>
                  {/* 工具活动卡片 - 显示在最上方 */}
                  {message.role === 'assistant' && (
                    <>
                      {/* 实时工具活动（当前正在执行） */}
                      {message.isStreaming && activityTree.length > 0 && (
                        <div className="flex justify-start mb-2">
                          <Card className="w-[80%] p-3 bg-transparent border-border/50 shadow-none">
                            <AgentTeamView nodes={activityTree} />
                          </Card>
                        </div>
                      )}

                      {/* 历史工具活动（已完成） */}
                      {!message.isStreaming && historicalToolActivities.length > 0 && (
                        <div className="flex justify-start mb-2">
                          <Card className="w-[80%] p-3 bg-transparent border-border/50 shadow-none">
                            <AgentTeamView
                              nodes={historicalToolActivities.map((a) => ({ activity: a, children: [] }))}
                            />
                          </Card>
                        </div>
                      )}
                    </>
                  )}

                  {/* Loading Indicator - 显示在工具活动下方 */}
                  {message.role === 'assistant' && message.isStreaming && !message.content && toolActivities.length === 0 && teammates.length === 0 && (
                    <div className="flex justify-start mb-2">
                      <div className="w-[80%] px-1">
                        <LoadingIndicator
                          label="正在思考..."
                          showElapsed
                          className="text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* 消息卡片 */}
                  {/* 助手消息：只在有内容时才渲染 */}
                  {!(message.role === 'assistant' && !message.content) && (
                    <div
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <Card
                        className={`p-4 ${
                          message.role === 'user'
                            ? 'max-w-[80%] bg-primary text-primary-foreground'
                            : 'w-[80%] bg-background/50 backdrop-blur-sm shadow-lg border-border/50'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <p className="whitespace-pre-wrap wrap-break-word">
                            {message.content}
                          </p>
                        ) : (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <MarkdownRenderer content={message.content} />
                            {message.isStreaming && message.content && (
                              <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-current" />
                            )}
                          </div>
                        )}
                      </Card>
                    </div>
                  )}
                </div>
              )})
            )}
          </div>
        </div>

        {/* Input - Fixed */}
        <div className="shrink-0 border-t bg-background p-6">
          <div className="mx-auto max-w-3xl space-y-3">
            {/* Agent Teams 任务列表（从文件系统实时读取） */}
            {agentTeamData && (
              <AgentTaskList
                teamName={agentTeamData.teamName}
                team={agentTeamData.team}
                tasks={agentTeamData.tasks}
                inboxes={agentTeamData.inboxes}
              />
            )}
            {/* Agent Teams Split 视图 - 持久显示，不依赖 isStreaming */}
            {teammates.length > 0 && (
              <AgentTeamSplit
                teammates={teammates}
                members={agentTeamData?.team.members}
                inboxes={agentTeamData?.inboxes}
              />
            )}
            {permissionQueue.length > 0 && (
              <PermissionSelector
                request={permissionQueue[0]}
                onDecision={handlePermissionDecision}
              />
            )}
            <form onSubmit={handleSubmit}>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    if (input.trim() && !isStreaming) {
                      handleSubmit(e as unknown as React.FormEvent);
                    }
                  }
                }}
                placeholder="Type your message... (Ctrl+Enter to send)"
                disabled={isStreaming}
                className="min-h-[80px] max-h-[200px] resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <select
                  value={permissionMode}
                  onChange={(e) => setPermissionMode(e.target.value)}
                  disabled={isStreaming}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="default">default</option>
                  <option value="acceptEdits">acceptEdits</option>
                  <option value="bypassPermissions">bypassPermissions</option>
                  <option value="plan">plan</option>
                </select>
                {isStreaming ? (
                  <Button
                    type="button"
                    onClick={handleStop}
                    variant="destructive"
                    size="sm"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={!input.trim()}
                    size="sm"
                  >
                    <Send className="h-4 w-4 mr-1" /> Send
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Right Sidebar - File Explorer */}
      <FileExplorer />
    </div>
  );
}
