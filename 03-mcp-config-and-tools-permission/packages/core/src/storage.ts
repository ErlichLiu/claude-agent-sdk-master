import type { Message } from './message';
import type { SessionState, SessionConfig } from './session';

/**
 * 配置存储结构
 */
export interface StoredConfig {
  /** 默认模型 */
  defaultModel?: string;
  /** 默认最大轮数 */
  defaultMaxTurns?: number;
  /** 最近使用的会话 ID */
  recentSessionId?: string;
  /** 创建时间 */
  createdAt: number;
  /** 最后更新时间 */
  updatedAt: number;
}

/**
 * 会话元数据（JSONL 文件的第一行）
 */
export interface SessionMetadata {
  type: 'metadata';
  sessionId: string;
  config: SessionConfig;
  state: SessionState;
  createdAt: number;
  updatedAt: number;
}

/**
 * 会话消息记录（JSONL 文件的后续行）
 */
export interface SessionMessageRecord {
  type: 'message';
  message: Message;
  /** 消息追加时间 */
  appendedAt: number;
}

/**
 * JSONL 行类型（联合类型）
 */
export type SessionRecord = SessionMetadata | SessionMessageRecord;

/**
 * 存储路径配置
 */
export interface StoragePaths {
  /** 数据根目录 */
  dataDir: string;
  /** 配置文件路径 */
  configPath: string;
  /** 会话目录 */
  sessionsDir: string;
}

/**
 * 存储操作接口
 */
export interface StorageAdapter {
  /**
   * 初始化存储（创建必要的目录）
   */
  initialize(): Promise<void>;

  /**
   * 读取配置
   */
  readConfig(): Promise<StoredConfig | null>;

  /**
   * 写入配置
   */
  writeConfig(config: StoredConfig): Promise<void>;

  /**
   * 创建新会话
   */
  createSession(metadata: SessionMetadata): Promise<void>;

  /**
   * 追加消息到会话
   */
  appendMessage(sessionId: string, message: Message): Promise<void>;

  /**
   * 读取会话（包括元数据和所有消息）
   */
  readSession(sessionId: string): Promise<{
    metadata: SessionMetadata;
    messages: Message[];
  } | null>;

  /**
   * 更新会话元数据
   */
  updateSessionMetadata(sessionId: string, metadata: Partial<SessionMetadata>): Promise<void>;

  /**
   * 列出所有会话
   */
  listSessions(): Promise<SessionMetadata[]>;

  /**
   * 删除会话
   */
  deleteSession(sessionId: string): Promise<void>;
}
