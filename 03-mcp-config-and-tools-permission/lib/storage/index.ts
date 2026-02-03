import fs from 'fs/promises';
import path from 'path';
import type { StorageAdapter, StoragePaths } from '@03-mcp-config-and-tools-permission/core';
import { ConfigStorage } from './config';
import { SessionStorage } from './session';

export class FileSystemStorage implements StorageAdapter {
  private config: ConfigStorage;
  private session: SessionStorage;

  constructor(private paths: StoragePaths) {
    this.config = new ConfigStorage(paths);
    this.session = new SessionStorage(paths);
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.paths.dataDir, { recursive: true });
    await fs.mkdir(this.paths.sessionsDir, { recursive: true });
  }

  async readConfig() {
    return this.config.read();
  }

  async writeConfig(config: Parameters<ConfigStorage['write']>[0]) {
    return this.config.write(config);
  }

  async createSession(metadata: Parameters<SessionStorage['create']>[0]) {
    return this.session.create(metadata);
  }

  async appendMessage(sessionId: string, message: Parameters<SessionStorage['append']>[1]) {
    return this.session.append(sessionId, message);
  }

  async readSession(sessionId: string) {
    return this.session.read(sessionId);
  }

  async updateSessionMetadata(sessionId: string, metadata: Parameters<SessionStorage['updateMetadata']>[1]) {
    return this.session.updateMetadata(sessionId, metadata);
  }

  async listSessions() {
    return this.session.list();
  }

  async deleteSession(sessionId: string) {
    return this.session.delete(sessionId);
  }
}

/**
 * 获取默认存储路径
 */
export function getDefaultPaths(projectRoot: string): StoragePaths {
  const dataDir = path.join(projectRoot, '.data');
  return {
    dataDir,
    configPath: path.join(dataDir, 'config.json'),
    sessionsDir: path.join(dataDir, 'sessions'),
  };
}

/**
 * 单例存储实例
 */
let storageInstance: FileSystemStorage | null = null;

/**
 * 获取存储实例
 */
export function getStorage(projectRoot: string = process.cwd()): FileSystemStorage {
  if (!storageInstance) {
    const paths = getDefaultPaths(projectRoot);
    storageInstance = new FileSystemStorage(paths);
  }
  return storageInstance;
}

export { ConfigStorage } from './config';
export { SessionStorage } from './session';
