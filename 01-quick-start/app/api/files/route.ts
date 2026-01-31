import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: number;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dirPath = searchParams.get('path') || process.cwd();
    const action = searchParams.get('action') || 'list';

    // 安全检查：确保路径在工作目录内
    const normalizedPath = path.normalize(dirPath);
    const cwd = process.cwd();
    if (!normalizedPath.startsWith(cwd)) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'list') {
      // 列出目录内容
      const entries = await fs.readdir(normalizedPath, { withFileTypes: true });
      const items: FileItem[] = await Promise.all(
        entries
          .filter((entry) => {
            // 过滤隐藏文件和特殊目录
            if (entry.name.startsWith('.')) return false;
            if (entry.name === 'node_modules') return false;
            return true;
          })
          .map(async (entry) => {
            const fullPath = path.join(normalizedPath, entry.name);
            const stats = await fs.stat(fullPath);
            return {
              name: entry.name,
              path: fullPath,
              type: entry.isDirectory() ? 'directory' : 'file',
              size: stats.size,
              modifiedAt: stats.mtimeMs,
            } as FileItem;
          })
      );

      // 排序：目录在前，文件在后
      items.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      return new Response(
        JSON.stringify({ items, currentPath: normalizedPath }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (action === 'read') {
      // 读取文件内容
      const content = await fs.readFile(normalizedPath, 'utf-8');
      return new Response(
        JSON.stringify({ content, path: normalizedPath }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
