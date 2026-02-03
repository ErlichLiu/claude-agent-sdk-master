'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Folder,
  File,
  ChevronRight,
  ChevronDown,
  X,
  FileText
} from 'lucide-react';

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: number;
}

interface FileExplorerProps {
  initialPath?: string;
}

export function FileExplorer({ initialPath = '' }: FileExplorerProps) {
  const [items, setItems] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);

  // 初始化时加载当前工作目录
  useEffect(() => {
    loadDirectory('');
  }, []);

  useEffect(() => {
    if (currentPath && currentPath !== initialPath) {
      loadDirectory(currentPath);
    }
  }, [currentPath]);

  const loadDirectory = async (path: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/files?path=${encodeURIComponent(path)}&action=list`);
      const data = await response.json();
      setItems(data.items || []);
      setCurrentPath(data.currentPath);
    } catch (error) {
      console.error('Failed to load directory:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFileContent = async (path: string) => {
    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(path)}&action=read`);
      const data = await response.json();
      setFileContent(data.content);
      setSelectedFile(path);
    } catch (error) {
      console.error('Failed to load file:', error);
      setFileContent('Error loading file content');
    }
  };

  const toggleDirectory = (path: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);
  };

  const handleItemClick = (item: FileItem) => {
    if (item.type === 'directory') {
      toggleDirectory(item.path);
    } else {
      loadFileContent(item.path);
    }
  };

  const formatSize = (bytes: number | undefined) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getRelativePath = (fullPath: string) => {
    const cwd = currentPath;
    if (fullPath.startsWith(cwd)) {
      return fullPath.slice(cwd.length + 1);
    }
    return fullPath;
  };

  return (
    <div className="flex h-full w-80 flex-col border-l bg-muted/10">
      <div className="p-4">
        <h2 className="text-lg font-semibold">Workspace Files</h2>
        <p className="text-xs text-muted-foreground">
          {getRelativePath(currentPath) || 'Root'}
        </p>
      </div>
      <Separator />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* File tree */}
        <ScrollArea className="flex-1 border-b">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No files</div>
          ) : (
            <div className="space-y-0.5 p-2">
              {items.map((item) => (
                <div
                  key={item.path}
                  className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent ${
                    selectedFile === item.path ? 'bg-accent' : ''
                  }`}
                  onClick={() => handleItemClick(item)}
                >
                  {item.type === 'directory' ? (
                    <>
                      {expandedDirs.has(item.path) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Folder className="h-4 w-4 text-blue-500" />
                    </>
                  ) : (
                    <>
                      <div className="w-4" />
                      <File className="h-4 w-4 text-muted-foreground" />
                    </>
                  )}
                  <span className="flex-1 truncate">{item.name}</span>
                  {item.type === 'file' && item.size && (
                    <span className="text-xs text-muted-foreground">
                      {formatSize(item.size)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* File preview */}
        {selectedFile && fileContent !== null && (
          <div className="flex h-1/2 flex-col">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {selectedFile.split('/').pop()}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFile(null);
                  setFileContent(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <pre className="p-4 text-xs">
                <code>{fileContent}</code>
              </pre>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
