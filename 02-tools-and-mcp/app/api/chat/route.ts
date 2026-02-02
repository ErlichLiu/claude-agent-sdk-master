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
import { PromaAgent, type AgentEvent } from '@02-tools-and-mcp/shared/agent';
import type { ChatMessage } from '@02-tools-and-mcp/core';
import { getStorage } from '@/lib/storage';

/**
 * 工具活动临时存储（用于最终保存到消息中）
 */
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
    const { message, sessionId } = body;

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

          console.log('🔍 Starting chat:', {
            hasSessionId: !!finalSessionId,
            shouldResume,
            sessionId: finalSessionId,
          });

          // 创建 PromaAgent 实例
          const agent = new PromaAgent({
            apiKey,
            workingDirectory: process.cwd(),
            resumeSessionId: sessionId,
            onSessionIdUpdate: async (sdkSessionId) => {
              // 当获取到 SDK 的 session_id 时触发
              finalSessionId = sdkSessionId;

              if (isNewSession) {
                // 创建会话元数据
                await storage.createSession({
                  type: 'metadata',
                  sessionId: sdkSessionId,
                  config: {
                    model: 'claude-sonnet-4-5-20250929',
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

          // 处理事件流
          for await (const event of agent.chat(message)) {
            await handleAgentEvent(
              event,
              controller,
              encoder,
              storage,
              finalSessionId,
              assistantContent,
              (content) => { assistantContent = content; },
              assistantMessageId,
              toolActivities
            );
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
async function handleAgentEvent(
  event: AgentEvent,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  storage: ReturnType<typeof getStorage>,
  sessionId: string | undefined,
  assistantContent: string,
  setAssistantContent: (content: string) => void,
  assistantMessageId: string,
  toolActivities: Map<string, ToolActivityRecord>
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

      // 发送完成事件到前端
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

    default: {
      // 未知事件类型
      console.warn('⚠️ Unknown event type:', (event as AgentEvent).type);
      break;
    }
  }
}
