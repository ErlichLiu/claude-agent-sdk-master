'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import type { SessionMetadata } from '@01-quick-start/core';
import { MessageSquare, Clock, Plus } from 'lucide-react';

interface SessionListProps {
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
  refreshTrigger?: number;
}

export function SessionList({ currentSessionId, onSessionSelect, onNewChat, refreshTrigger }: SessionListProps) {
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  // 当 refreshTrigger 变化时，刷新会话列表
  useEffect(() => {
    if (refreshTrigger) {
      loadSessions();
    }
  }, [refreshTrigger]);

  // 当 currentSessionId 变化时，延迟刷新会话列表
  // 延迟确保会话数据已保存到存储
  useEffect(() => {
    if (currentSessionId) {
      const timer = setTimeout(() => {
        loadSessions();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentSessionId]);

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/10">
      <div className="p-4 space-y-3">
        <h2 className="text-lg font-semibold">Chat History</h2>
        <Button
          onClick={onNewChat}
          className="w-full"
          variant="default"
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No chat history</div>
        ) : (
          <div className="space-y-1 p-2">
            {sessions.map((session) => (
              <Card
                key={session.sessionId}
                className={`cursor-pointer p-3 transition-colors hover:bg-accent ${
                  currentSessionId === session.sessionId ? 'bg-accent' : ''
                }`}
                onClick={() => onSessionSelect(session.sessionId)}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {session.sessionId.replace('session-', 'Chat ')}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(session.updatedAt)}
                    </div>
                    {session.state.totalCostUsd > 0 && (
                      <p className="text-xs text-muted-foreground">
                        ${session.state.totalCostUsd.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
