'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send } from 'lucide-react';
import type { ChatMessage } from '@01-quick-start/core';
import { SessionList } from './session-list';
import { FileExplorer } from './file-explorer';
import { MarkdownRenderer } from './markdown-renderer';

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 加载选中的会话
  const loadSession = async (id: string) => {
    try {
      const response = await fetch(`/api/sessions/${id}`);
      const data = await response.json();
      if (data.messages) {
        setMessages(data.messages);
        setSessionId(id);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  // 开始新对话
  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
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

    // 创建助手消息占位符
    const assistantMessageId = `msg-${Date.now()}-assistant`;
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
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

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
              // 更新流式内容
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: msg.content + data.data }
                    : msg
                )
              );
              if (data.sessionId && !sessionId) {
                setSessionId(data.sessionId);
              }
            } else if (data.type === 'result') {
              // 完成
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
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
              // 错误
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
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
      console.error('Error:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
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
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <Card
                    className={`max-w-[80%] p-4 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <p className="whitespace-pre-wrap wrap-break-word">
                        {message.content}
                      </p>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <MarkdownRenderer content={message.content} />
                        {message.isStreaming && (
                          <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-current" />
                        )}
                      </div>
                    )}
                  </Card>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Input - Fixed */}
        <div className="shrink-0 border-t bg-background p-6">
          <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isStreaming}
                className="flex-1"
              />
              <Button type="submit" disabled={!input.trim() || isStreaming}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Sidebar - File Explorer */}
      <FileExplorer />
    </div>
  );
}
