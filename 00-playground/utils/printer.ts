/**
 * 打印输出模块
 *
 * 提供格式化输出、分隔线、SDK 消息打印等功能。
 */

import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type { PlaygroundConfig } from '../lib/config.js';

// ============================================================================
// 格式化工具
// ============================================================================

/** 格式化 JSON 输出 */
export function formatJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

/** 打印分隔线 */
export function printSeparator(title?: string): void {
  const line = '─'.repeat(60);
  if (title) {
    console.log(`\n╭${line}╮`);
    console.log(`│ ${title.padEnd(58)} │`);
    console.log(`╰${line}╯`);
  } else {
    console.log(`\n${line}`);
  }
}

// ============================================================================
// SDK 消息打印
// ============================================================================

/** 打印 SDK 消息的详细信息 */
export function printSDKMessage(msg: SDKMessage, index: number, cfg: PlaygroundConfig): void {
  const prefix = `[${index.toString().padStart(3, '0')}]`;

  switch (msg.type) {
    case 'assistant': {
      console.log(`\n${prefix} 📤 助手消息`);
      if (msg.error) {
        console.log(`  ⚠️  错误: ${msg.error}`);
      }
      if (msg.message?.content) {
        console.log(`  内容块数量: ${msg.message.content.length}`);
        if (cfg.expandContent) {
          for (const block of msg.message.content) {
            if (block.type === 'text') {
              console.log(`  📝 文本: ${block.text?.substring(0, 200)}${(block.text?.length ?? 0) > 200 ? '...' : ''}`);
            } else if (block.type === 'tool_use') {
              console.log(`  🔧 工具: ${block.name} (id: ${block.id})`);
              if (cfg.verbose) {
                console.log(`     输入: ${formatJson(block.input)}`);
              }
            }
          }
        }
      }
      break;
    }

    case 'user': {
      console.log(`\n${prefix} 📥 用户消息`);
      if ('isReplay' in msg && msg.isReplay) {
        console.log(`  (重放消息)`);
      }
      if (msg.tool_use_result !== undefined) {
        console.log(`  🔧 收到工具结果`);
        if (cfg.expandContent && typeof msg.tool_use_result === 'object') {
          const resultStr = formatJson(msg.tool_use_result);
          console.log(`     结果: ${resultStr.substring(0, 300)}${resultStr.length > 300 ? '...' : ''}`);
        }
      }
      break;
    }

    case 'stream_event': {
      const event = msg.event;
      if (cfg.verbose) {
        console.log(`\n${prefix} 🌊 流事件: ${event.type}`);
      }

      // 处理文本流
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        if (cfg.streamText) {
          process.stdout.write(event.delta.text || '');
        }
      }

      // 消息开始
      if (event.type === 'message_start') {
        console.log(`\n${prefix} 🌊 消息开始 (id: ${event.message?.id})`);
      }

      // 消息结束
      if (event.type === 'message_delta') {
        console.log(`\n${prefix} 🌊 消息增量 (停止原因: ${event.delta?.stop_reason})`);
      }

      // 工具使用开始
      if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
        console.log(`\n${prefix} 🔧 工具开始: ${event.content_block.name}`);
      }
      break;
    }

    case 'result': {
      printSeparator('结果');
      console.log(`  状态: ${msg.subtype}`);
      console.log(`  用量统计:`);
      console.log(`    输入 tokens:  ${msg.usage.input_tokens}`);
      console.log(`    输出 tokens: ${msg.usage.output_tokens}`);
      console.log(`    缓存读取:    ${msg.usage.cache_read_input_tokens ?? 0}`);
      console.log(`    缓存创建:  ${msg.usage.cache_creation_input_tokens ?? 0}`);
      console.log(`  费用: $${msg.total_cost_usd.toFixed(6)}`);
      if (msg.subtype !== 'success') {
        const errorMsg = msg as unknown as { errors?: string[] };
        if (errorMsg.errors?.length) {
          console.log(`  错误: ${errorMsg.errors.join(', ')}`);
        }
      }
      break;
    }

    case 'system': {
      console.log(`\n${prefix} ⚙️  系统消息: ${msg.subtype}`);
      if ('status' in msg) {
        console.log(`  状态: ${msg.status}`);
      }
      break;
    }

    default:
      console.log(`\n${prefix} ❓ 未知类型: ${(msg as SDKMessage).type}`);
  }

  // 显示原始 JSON
  if (cfg.showRawJson) {
    console.log(`\n  原始 JSON:`);
    console.log(`  ${formatJson(msg).split('\n').join('\n  ')}`);
  }
}
