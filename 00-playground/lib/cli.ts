/**
 * 交互式命令行模块
 *
 * 提供命令行交互界面、用户输入处理、命令解析等功能。
 */

import * as readline from 'readline';
import { currentConfig, type PlaygroundConfig } from './config.js';

// ============================================================================
// Readline 工具
// ============================================================================

/** 创建 readline 接口 */
export function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/** 提示用户输入，支持默认值 */
export async function prompt(
  rl: readline.Interface,
  question: string,
  defaultValue?: string
): Promise<string> {
  const defaultHint = defaultValue !== undefined ? ` [${defaultValue}]` : '';
  return new Promise((resolve) => {
    rl.question(`${question}${defaultHint}: `, (answer) => {
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

/** 提示用户输入是/否 */
export async function promptYesNo(
  rl: readline.Interface,
  question: string,
  defaultValue: boolean
): Promise<boolean> {
  const defaultHint = defaultValue ? '[Y/n]' : '[y/N]';
  return new Promise((resolve) => {
    rl.question(`${question} ${defaultHint}: `, (answer) => {
      const a = answer.trim().toLowerCase();
      if (a === '') {
        resolve(defaultValue);
      } else {
        resolve(a === 'y' || a === 'yes' || a === '是');
      }
    });
  });
}

// ============================================================================
// 配置显示
// ============================================================================

/** 显示当前配置 */
export function showCurrentConfig(): void {
  console.log('\n📋 当前配置:');
  console.log(`  启用工具: ${currentConfig.enableTools ? '是' : '否'}`);
  console.log(`  详细模式: ${currentConfig.verbose ? '是' : '否'}`);
  console.log(`  展开内容块: ${currentConfig.expandContent ? '是' : '否'}`);
  console.log(`  显示原始 JSON: ${currentConfig.showRawJson ? '是' : '否'}`);
  console.log(`  流式输出: ${currentConfig.streamText ? '是' : '否'}`);
  console.log(`  工作目录: ${currentConfig.workingDirectory}`);
  console.log(`  API Base URL: ${process.env.ANTHROPIC_BASE_URL || '(默认)'}`);
}

/** 显示帮助信息 */
export function showHelp(): void {
  console.log(`
📚 可用命令:
  /config   - 修改配置选项
  /show     - 显示当前配置
  /tools    - 切换工具启用状态
  /verbose  - 切换详细模式
  /expand   - 切换展开内容块
  /json     - 切换原始 JSON 显示
  /stream   - 切换流式输出
  /help     - 显示此帮助
  /quit     - 退出程序

💡 提示:
  - 直接输入文本发送给 Claude
  - 回车使用默认配置快速测试
  - Ctrl+C 中断当前操作
`);
}

/** 修改配置 */
export async function modifyConfig(rl: readline.Interface): Promise<void> {
  console.log('\n⚙️  修改配置 (直接回车保持当前值):');

  currentConfig.enableTools = await promptYesNo(rl, '启用工具?', currentConfig.enableTools);
  currentConfig.verbose = await promptYesNo(rl, '详细模式?', currentConfig.verbose);
  currentConfig.expandContent = await promptYesNo(rl, '展开内容块?', currentConfig.expandContent);
  currentConfig.showRawJson = await promptYesNo(rl, '显示原始 JSON?', currentConfig.showRawJson);
  currentConfig.streamText = await promptYesNo(rl, '流式输出?', currentConfig.streamText);

  const newCwd = await prompt(rl, '工作目录', currentConfig.workingDirectory);
  if (newCwd) {
    currentConfig.workingDirectory = newCwd;
  }

  console.log('\n✅ 配置已更新');
  showCurrentConfig();
}

// ============================================================================
// 交互式循环
// ============================================================================

/** 查询执行器类型 */
export type QueryExecutor = (cfg: PlaygroundConfig) => Promise<void>;

/** 主交互循环 */
export async function interactiveLoop(executeQuery: QueryExecutor): Promise<void> {
  const rl = createReadline();

  console.log('🚀 Claude Agent SDK Playground');
  console.log('━'.repeat(40));
  showCurrentConfig();
  console.log('\n输入 /help 查看帮助，或直接输入提示词开始测试\n');

  const promptUser = (): void => {
    rl.question('📝 输入提示词 (或命令): ', async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        // 空输入，使用默认提示词快速测试
        console.log('使用默认提示词: "你好！请用一句话介绍你自己。"');
        try {
          await executeQuery({
            ...currentConfig,
            prompt: '你好！请用一句话介绍你自己。',
          });
        } catch (error) {
          console.error('❌ 执行错误:', error);
        }
        promptUser();
        return;
      }

      // 处理命令
      if (trimmed.startsWith('/')) {
        const cmd = trimmed.toLowerCase();

        switch (cmd) {
          case '/quit':
          case '/exit':
          case '/q':
            console.log('\n👋 再见！');
            rl.close();
            process.exit(0);

          case '/help':
          case '/h':
            showHelp();
            break;

          case '/config':
            await modifyConfig(rl);
            break;

          case '/show':
            showCurrentConfig();
            break;

          case '/tools':
            currentConfig.enableTools = !currentConfig.enableTools;
            console.log(`工具已${currentConfig.enableTools ? '启用' : '禁用'}`);
            break;

          case '/verbose':
            currentConfig.verbose = !currentConfig.verbose;
            console.log(`详细模式已${currentConfig.verbose ? '开启' : '关闭'}`);
            break;

          case '/expand':
            currentConfig.expandContent = !currentConfig.expandContent;
            console.log(`展开内容块已${currentConfig.expandContent ? '开启' : '关闭'}`);
            break;

          case '/json':
            currentConfig.showRawJson = !currentConfig.showRawJson;
            console.log(`原始 JSON 显示已${currentConfig.showRawJson ? '开启' : '关闭'}`);
            break;

          case '/stream':
            currentConfig.streamText = !currentConfig.streamText;
            console.log(`流式输出已${currentConfig.streamText ? '开启' : '关闭'}`);
            break;

          default:
            console.log(`未知命令: ${cmd}，输入 /help 查看帮助`);
        }

        promptUser();
        return;
      }

      // 执行查询
      try {
        await executeQuery({
          ...currentConfig,
          prompt: trimmed,
        });
      } catch (error) {
        console.error('❌ 执行错误:', error);
      }

      promptUser();
    });
  };

  promptUser();
}
