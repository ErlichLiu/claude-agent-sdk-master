/**
 * 流式对话 API Route
 *
 * 🎯 核心概念：Agent SDK 的自动上下文管理
 *
 * 与传统 LLM API（如 OpenAI）的关键区别：
 *
 * ❌ 传统方式：需要手动拼接 messages 数组
 * const messages = [...previousMessages, newMessage];
 * const response = await llm.chat({ messages });
 *
 * ✅ Agent SDK 方式：自动管理上下文
 * const result = query({
 *   prompt: newMessage,
 *   options: { resume: sessionId } // SDK 自动加载完整历史！
 * });
 *
 * 开发者只需：
 * 1. 新会话：直接调用 query()，SDK 自动创建 session
 * 2. 继续会话：传入 resume: sessionId，SDK 自动恢复完整上下文
 * 3. SDK 内部维护完整对话历史，存储到文件系统
 *
 * 这让我们的代码专注于业务逻辑，而非繁琐的状态管理！
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { NextRequest } from 'next/server';
import type { ChatMessage } from '@01-quick-start/core';
import { getStorage } from '@/lib/storage';

interface ChatRequest {
  message: string;
  sessionId?: string;
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

    // 确定会话 ID 和是否需要恢复
    let finalSessionId: string | undefined = sessionId;
    const shouldResume = !!sessionId;

    // 如果是新会话,等待 SDK 生成 session_id 后再创建
    // 这样可以使用 SDK 的原生 session_id

    // 注意: 用户消息将在流式处理中与 SDK session_id 一起保存

    // 创建 SSE 响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 调用 Claude Agent SDK
          // 如果有 sessionId,使用 resume 恢复会话上下文
          console.log('🔍 Query options:', {
            hasSessionId: !!finalSessionId,
            shouldResume,
            sessionId: finalSessionId,
          });

          // 构建 query options
          const queryOptions: any = {
            includePartialMessages: true,
            permissionMode: 'bypassPermissions',
            allowDangerouslySkipPermissions: true,
          };

          // 只在确认要恢复会话时添加 resume 参数
          if (shouldResume && finalSessionId) {
            queryOptions.resume = finalSessionId;
            console.log('📂 Attempting to resume session:', finalSessionId);
          } else {
            console.log('🆕 Creating new session');
          }

          const result = query({
            prompt: message,
            options: queryOptions,
          });

          let assistantContent = '';
          const assistantMessageId = `msg-${Date.now()}-assistant`;
          let sdkSessionId: string | null = null;
          const isNewSession = !shouldResume;

          // 处理流式响应
          for await (const sdkMessage of result) {
            // 提取 SDK 生成的 session_id
            if (!sdkSessionId && 'session_id' in sdkMessage) {
              sdkSessionId = sdkMessage.session_id;
              finalSessionId = sdkSessionId;

              // 如果是新会话,创建会话元数据
              if (isNewSession) {
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

                // 保存用户消息
                const userMessage: ChatMessage = {
                  id: `msg-${Date.now()}-user`,
                  role: 'user',
                  content: message,
                  timestamp: Date.now(),
                };
                await storage.appendMessage(sdkSessionId, userMessage);
              } else {
                // 恢复会话,只保存新的用户消息
                const userMessage: ChatMessage = {
                  id: `msg-${Date.now()}-user`,
                  role: 'user',
                  content: message,
                  timestamp: Date.now(),
                };
                await storage.appendMessage(sdkSessionId, userMessage);
              }
            }

            if (sdkMessage.type === 'stream_event') {
              // 流式文本事件
              const event = sdkMessage.event;
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                const text = event.delta.text;
                assistantContent += text;

                // 只有在获取到 session_id 后才发送流式数据
                if (finalSessionId) {
                  // 发送流式数据
                  const data = JSON.stringify({
                    type: 'content',
                    data: text,
                    sessionId: finalSessionId,
                  });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
              }
            } else if (sdkMessage.type === 'result') {
              // 结果消息
              if (sdkMessage.subtype === 'success') {
                // 确保有 session_id
                if (!finalSessionId) {
                  throw new Error('Session ID not found in SDK messages');
                }

                // 保存助手消息
                const assistantMessage: ChatMessage = {
                  id: assistantMessageId,
                  role: 'assistant',
                  content: assistantContent || sdkMessage.result,
                  timestamp: Date.now(),
                };
                await storage.appendMessage(finalSessionId, assistantMessage);

                // 更新会话状态
                await storage.updateSessionMetadata(finalSessionId, {
                  state: {
                    sessionId: finalSessionId,
                    isActive: false,
                    currentTurn: sdkMessage.num_turns,
                    totalCostUsd: sdkMessage.total_cost_usd,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  },
                  updatedAt: Date.now(),
                });

                // 发送完成事件
                const resultData = JSON.stringify({
                  type: 'result',
                  data: {
                    sessionId: finalSessionId,
                    totalCostUsd: sdkMessage.total_cost_usd,
                    durationMs: sdkMessage.duration_ms,
                    numTurns: sdkMessage.num_turns,
                  },
                });
                controller.enqueue(encoder.encode(`data: ${resultData}\n\n`));
              } else {
                // 错误结果
                const errorData = JSON.stringify({
                  type: 'error',
                  data: {
                    error: sdkMessage.errors?.join(', ') || 'Unknown error',
                  },
                });
                controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
              }
            }
          }

          controller.close();
        } catch (error) {
          console.error('❌ Error in query stream:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const errorStack = error instanceof Error ? error.stack : '';
          console.error('Error stack:', errorStack);

          // 检查是否是 session 不存在的错误
          let userFriendlyMessage = errorMessage;
          if (errorMessage.includes('exited with code 1') || errorMessage.includes('Session') || errorMessage.includes('resume')) {
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
          controller.close();
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
