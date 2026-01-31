import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import type {
  SessionMetadata,
  SessionMessageRecord,
  SessionRecord,
  StoragePaths,
  ChatMessage,
} from '@01-quick-start/core';

export class SessionStorage {
  constructor(private paths: StoragePaths) {}

  async create(metadata: SessionMetadata): Promise<void> {
    const filePath = this.getSessionPath(metadata.sessionId);
    const record: SessionRecord = metadata;
    await fs.writeFile(filePath, JSON.stringify(record) + '\n', 'utf-8');
  }

  async append(sessionId: string, message: ChatMessage): Promise<void> {
    const filePath = this.getSessionPath(sessionId);
    const record: SessionMessageRecord = {
      type: 'message',
      message,
      appendedAt: Date.now(),
    };
    await fs.appendFile(filePath, JSON.stringify(record) + '\n', 'utf-8');
  }

  async read(sessionId: string): Promise<{
    metadata: SessionMetadata;
    messages: ChatMessage[];
  } | null> {
    const filePath = this.getSessionPath(sessionId);

    try {
      const fileStream = createReadStream(filePath);
      const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      let metadata: SessionMetadata | null = null;
      const messages: ChatMessage[] = [];

      for await (const line of rl) {
        if (!line.trim()) continue;

        const record: SessionRecord = JSON.parse(line);

        if (record.type === 'metadata') {
          metadata = record;
        } else if (record.type === 'message') {
          messages.push(record.message);
        }
      }

      if (!metadata) {
        return null;
      }

      return { metadata, messages };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async updateMetadata(
    sessionId: string,
    partial: Partial<SessionMetadata>
  ): Promise<void> {
    const data = await this.read(sessionId);
    if (!data) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const updated: SessionMetadata = {
      ...data.metadata,
      ...partial,
      updatedAt: Date.now(),
    };

    // 重写文件：先写元数据，再追加所有消息
    const filePath = this.getSessionPath(sessionId);
    await fs.writeFile(filePath, JSON.stringify(updated) + '\n', 'utf-8');

    for (const message of data.messages) {
      const record: SessionMessageRecord = {
        type: 'message',
        message,
        appendedAt: Date.now(),
      };
      await fs.appendFile(filePath, JSON.stringify(record) + '\n', 'utf-8');
    }
  }

  async list(): Promise<SessionMetadata[]> {
    try {
      const files = await fs.readdir(this.paths.sessionsDir);
      const sessions: SessionMetadata[] = [];

      for (const file of files) {
        if (!file.endsWith('.jsonl')) continue;

        const sessionId = file.replace('.jsonl', '');
        const data = await this.read(sessionId);

        if (data) {
          sessions.push(data.metadata);
        }
      }

      return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async delete(sessionId: string): Promise<void> {
    const filePath = this.getSessionPath(sessionId);
    await fs.unlink(filePath);
  }

  private getSessionPath(sessionId: string): string {
    return path.join(this.paths.sessionsDir, `${sessionId}.jsonl`);
  }
}
