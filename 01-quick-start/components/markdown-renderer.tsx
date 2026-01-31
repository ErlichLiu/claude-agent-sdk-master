'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight, rehypeRaw]}
      components={{
        // 代码块
        code({ className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          const inline = !match;
          return !inline ? (
            <div className="my-4 overflow-hidden rounded-lg border bg-muted">
              <div className="flex items-center justify-between border-b bg-muted px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {match ? match[1] : 'code'}
                </span>
              </div>
              <pre className="overflow-x-auto p-4">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            </div>
          ) : (
            <code
              className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono"
              {...props}
            >
              {children}
            </code>
          );
        },
        // 段落
        p({ children }) {
          return <p className="mb-4 leading-7 last:mb-0">{children}</p>;
        },
        // 标题
        h1({ children }) {
          return (
            <h1 className="mb-4 mt-6 text-2xl font-bold first:mt-0">
              {children}
            </h1>
          );
        },
        h2({ children }) {
          return (
            <h2 className="mb-3 mt-6 text-xl font-semibold first:mt-0">
              {children}
            </h2>
          );
        },
        h3({ children }) {
          return (
            <h3 className="mb-2 mt-4 text-lg font-semibold first:mt-0">
              {children}
            </h3>
          );
        },
        h4({ children }) {
          return (
            <h4 className="mb-2 mt-3 text-base font-semibold first:mt-0">
              {children}
            </h4>
          );
        },
        // 列表
        ul({ children }) {
          return <ul className="mb-4 ml-6 list-disc space-y-2">{children}</ul>;
        },
        ol({ children }) {
          return (
            <ol className="mb-4 ml-6 list-decimal space-y-2">{children}</ol>
          );
        },
        li({ children }) {
          return <li className="leading-7">{children}</li>;
        },
        // 引用块
        blockquote({ children }) {
          return (
            <blockquote className="my-4 border-l-4 border-primary pl-4 italic text-muted-foreground">
              {children}
            </blockquote>
          );
        },
        // 表格
        table({ children }) {
          return (
            <div className="my-4 overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                {children}
              </table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-muted">{children}</thead>;
        },
        tbody({ children }) {
          return <tbody>{children}</tbody>;
        },
        tr({ children }) {
          return <tr className="border-b border-border">{children}</tr>;
        },
        th({ children }) {
          return (
            <th className="px-4 py-2 text-left font-semibold">{children}</th>
          );
        },
        td({ children }) {
          return <td className="px-4 py-2">{children}</td>;
        },
        // 链接
        a({ href, children }) {
          return (
            <a
              href={href}
              className="text-primary underline-offset-4 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          );
        },
        // 分隔线
        hr() {
          return <hr className="my-6 border-t border-border" />;
        },
        // 强调
        strong({ children }) {
          return <strong className="font-semibold">{children}</strong>;
        },
        em({ children }) {
          return <em className="italic">{children}</em>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
