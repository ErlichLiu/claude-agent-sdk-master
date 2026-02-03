/**
 * Stateless tool matching for SDK message → AgentEvent conversion.
 *
 * This module extracts tool_start and tool_result events from SDK message
 * content blocks using DIRECT ID matching instead of FIFO queues.
 *
 * Key principle: Every output is derived from the current message + an
 * append-only tool index. No mutable queues, stacks, or order-dependent state.
 */

import type { AgentEvent } from './agent-event';

// ============================================================================
// Tool Index — append-only, order-independent lookup
// ============================================================================

export interface ToolEntry {
  name: string;
  input: Record<string, unknown>;
}

/**
 * Append-only index of tool metadata, built from tool_start events.
 * Order-independent: inserting A then B = inserting B then A.
 * Used to look up tool name/input when processing tool_result blocks
 * (which carry tool_use_id but not tool_name).
 */
export class ToolIndex {
  private entries = new Map<string, ToolEntry>();

  /** Register a tool (idempotent — same ID always maps to same entry) */
  register(toolUseId: string, name: string, input: Record<string, unknown>): void {
    // Update input if we now have more complete data (stream events start with empty input)
    const existing = this.entries.get(toolUseId);
    if (existing && Object.keys(existing.input).length === 0 && Object.keys(input).length > 0) {
      this.entries.set(toolUseId, { name, input });
    } else if (!existing) {
      this.entries.set(toolUseId, { name, input });
    }
  }

  getName(toolUseId: string): string | undefined {
    return this.entries.get(toolUseId)?.name;
  }

  getInput(toolUseId: string): Record<string, unknown> | undefined {
    return this.entries.get(toolUseId)?.input;
  }

  getEntry(toolUseId: string): ToolEntry | undefined {
    return this.entries.get(toolUseId);
  }

  has(toolUseId: string): boolean {
    return this.entries.has(toolUseId);
  }

  get size(): number {
    return this.entries.size;
  }
}

// ============================================================================
// Content block types (subset of Anthropic SDK types we need)
// ============================================================================

/** Represents a tool_use content block from an assistant message */
export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/** Represents a tool_result content block from a user message */
export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content?: unknown;
  is_error?: boolean;
}

/** Represents a text content block */
export interface TextBlock {
  type: 'text';
  text: string;
}

/** Union of content blocks we handle */
export type ContentBlock = ToolUseBlock | ToolResultBlock | TextBlock | { type: string };

// ============================================================================
// Pure extraction functions
// ============================================================================

/**
 * Extract tool_start events from assistant message content blocks.
 *
 * Each tool_use block in the content becomes a tool_start event.
 *
 * @param contentBlocks - Content blocks from SDKAssistantMessage.message.content
 * @param toolIndex - Append-only index to register new tools in
 * @param emittedToolStartIds - Set of tool IDs already emitted (for stream/assistant dedup)
 * @param turnId - Current turn correlation ID
 * @returns Array of tool_start AgentEvents
 */
export function extractToolStarts(
  contentBlocks: ContentBlock[],
  toolIndex: ToolIndex,
  emittedToolStartIds: Set<string>,
  turnId?: string,
): AgentEvent[] {
  const events: AgentEvent[] = [];

  for (const block of contentBlocks) {
    if (block.type !== 'tool_use') continue;
    const toolBlock = block as ToolUseBlock;

    // Register in index (idempotent — handles both stream and assistant events)
    toolIndex.register(toolBlock.id, toolBlock.name, toolBlock.input);

    // Dedup: stream_event arrives before assistant message, both have the same tool_use block.
    // The Set is append-only and order-independent (same ID always deduplicates the same way).
    if (emittedToolStartIds.has(toolBlock.id)) {
      // Already emitted via stream — but check if we now have complete input
      const hasNewInput = Object.keys(toolBlock.input).length > 0;
      if (hasNewInput) {
        // Re-emit with complete input (assistant message has full input, stream has {})
        const intent = extractIntent(toolBlock);
        const displayName = toolBlock.input._displayName as string | undefined;
        events.push({
          type: 'tool_start',
          toolName: toolBlock.name,
          toolUseId: toolBlock.id,
          input: toolBlock.input,
          intent,
          displayName,
          turnId,
        });
      }
      continue;
    }

    emittedToolStartIds.add(toolBlock.id);

    const intent = extractIntent(toolBlock);
    const displayName = toolBlock.input._displayName as string | undefined;

    events.push({
      type: 'tool_start',
      toolName: toolBlock.name,
      toolUseId: toolBlock.id,
      input: toolBlock.input,
      intent,
      displayName,
      turnId,
    });
  }

  return events;
}

/**
 * Extract tool_result events from user message content blocks.
 *
 * Each tool_result content block carries an explicit `tool_use_id` that
 * directly identifies which tool the result belongs to. No FIFO matching needed.
 *
 * Falls back to the convenience field `tool_use_result` when content blocks
 * don't contain tool_result entries.
 *
 * @param contentBlocks - Content blocks from SDKUserMessage.message.content (may be empty)
 * @param toolUseResultValue - Convenience field tool_use_result from SDK message
 * @param toolIndex - Read-only lookup for tool name/input
 * @param turnId - Current turn correlation ID
 * @returns Array of tool_result AgentEvents
 */
export function extractToolResults(
  contentBlocks: ContentBlock[],
  toolUseResultValue: unknown,
  toolIndex: ToolIndex,
  turnId?: string,
): AgentEvent[] {
  const events: AgentEvent[] = [];

  // Primary path: extract tool_use_id directly from content blocks
  const toolResultBlocks = contentBlocks.filter(
    (b): b is ToolResultBlock => b.type === 'tool_result'
  );

  if (toolResultBlocks.length > 0) {
    // Direct ID matching — each block explicitly identifies its tool
    for (const block of toolResultBlocks) {
      const toolUseId = block.tool_use_id;
      const entry = toolIndex.getEntry(toolUseId);

      const resultStr = serializeResult(block.content);
      const isError = block.is_error ?? isToolResultError(block.content);

      events.push({
        type: 'tool_result',
        toolUseId,
        toolName: entry?.name,
        result: resultStr,
        isError,
        input: entry?.input,
        turnId,
      });
    }
  } else if (toolUseResultValue !== undefined) {
    // Fallback: use convenience field when content blocks are unavailable.
    // Generate a synthetic ID so the result isn't silently dropped.
    const toolUseId = `fallback-${turnId ?? 'unknown'}`;
    const entry = toolIndex.getEntry(toolUseId);

    const resultStr = serializeResult(toolUseResultValue);
    const isError = isToolResultError(toolUseResultValue);

    events.push({
      type: 'tool_result',
      toolUseId,
      toolName: entry?.name,
      result: resultStr,
      isError,
      input: entry?.input,
      turnId,
    });
  }

  return events;
}

// ============================================================================
// Helpers (pure)
// ============================================================================

/** Extract intent from a tool_use block's input */
function extractIntent(toolBlock: ToolUseBlock): string | undefined {
  const input = toolBlock.input;
  if (!input || typeof input !== 'object') return undefined;

  // Check common intent field names
  if ('description' in input && typeof input.description === 'string') {
    return input.description;
  }
  if ('intent' in input && typeof input.intent === 'string') {
    return input.intent;
  }
  if ('prompt' in input && typeof input.prompt === 'string') {
    return input.prompt;
  }

  return undefined;
}

/**
 * Convert a tool result to a string.
 * Handles strings, objects, arrays, and primitives.
 */
export function serializeResult(result: unknown): string {
  if (result === null || result === undefined) {
    return '';
  }

  if (typeof result === 'string') {
    return result;
  }

  if (Array.isArray(result)) {
    // Handle array of content blocks (common in Anthropic SDK)
    const textParts: string[] = [];
    for (const item of result) {
      if (typeof item === 'string') {
        textParts.push(item);
      } else if (item && typeof item === 'object' && 'text' in item) {
        textParts.push(String(item.text));
      } else if (item && typeof item === 'object' && 'type' in item && item.type === 'text' && 'text' in item) {
        textParts.push(String(item.text));
      }
    }
    if (textParts.length > 0) {
      return textParts.join('\n');
    }
    // Fallback to JSON for non-text arrays
    return JSON.stringify(result, null, 2);
  }

  if (typeof result === 'object') {
    // Check for text content block
    if ('text' in result) {
      return String(result.text);
    }
    if ('type' in result && result.type === 'text' && 'text' in result) {
      return String(result.text);
    }
    // Fallback to JSON
    return JSON.stringify(result, null, 2);
  }

  // Primitives
  return String(result);
}

/**
 * Check if a tool result indicates an error.
 * Looks for "Error:" prefix in string results.
 */
export function isToolResultError(result: unknown): boolean {
  const resultStr = serializeResult(result);
  return resultStr.trimStart().startsWith('Error:');
}
