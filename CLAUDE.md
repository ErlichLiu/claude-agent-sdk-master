# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a tutorial repository for the Claude Agent SDK, structured as a monorepo containing multiple Next.js-based tutorial projects. The naming convention (01-quick-start, 02-xxx, etc.) indicates sequential learning modules.

## Package Manager

**Always use pnpm** - This project exclusively uses pnpm as the package manager.

```bash
# Install dependencies
pnpm install

# Run commands in specific workspace
cd 01-quick-start && pnpm dev
```

## Project Structure

- **Monorepo Layout**: Each numbered directory (01-quick-start, etc.) is a self-contained Next.js tutorial project
- **Individual workspaces**: Each tutorial project has its own package.json and can be run independently
- **Shared configuration**: Root-level .npmrc and .gitignore apply to all projects

## Development Commands

Within each tutorial project directory:

```bash
pnpm dev      # Start Next.js development server on http://localhost:3000
pnpm build    # Production build
pnpm start    # Start production server
pnpm lint     # Run ESLint
```

## TypeScript Configuration

- **Strict mode enabled**: All projects use strict TypeScript settings
- **Path aliases**: `@/*` maps to the project root (e.g., `@/app/components`)
- **Never use 'any' type**: Always create proper interfaces/types
- **Target**: ES2017 with modern ESNext modules

## Code Style Requirements

1. **Type Safety**: Create interfaces instead of using `any` type
2. **Communication**: Always explain design decisions before making significant changes
3. **Next.js App Router**: Projects use Next.js 16+ with App Router (not Pages Router)
4. **React Server Components**: Default to Server Components; use 'use client' only when needed

## Documentation Requirements

**CRITICAL - MUST FOLLOW**: 所有文件变化都必须同步更新到 CLAUDE.md 文档中:

1. **根目录文件变化** → 必须更新根目录的 `CLAUDE.md`
   - 添加/删除配置文件(.gitignore, .npmrc, tsconfig.json 等)
   - 修改项目结构(添加新的教程目录等)
   - 更新依赖或工具链

2. **教程项目内文件变化** → 必须更新对应项目的 `CLAUDE.md`
   - 例如: `01-quick-start/` 内的变化 → 更新 `01-quick-start/CLAUDE.md`
   - 包括: 新增组件、修改配置、添加工具函数、更新依赖等
   - 如果项目还没有 CLAUDE.md,考虑创建一个

3. **更新内容要求**:
   - 说明新文件的用途和位置
   - 记录重要的配置变化
   - 更新相关的开发命令或工作流程
   - 保持文档与代码同步

**违反此规则会导致未来的 Claude 实例无法正确理解项目状态**

## Technology Stack

### 01-quick-start
- Next.js 16.1.6 (App Router)
- React 19.2.3
- TypeScript 5
- Tailwind CSS 4
- ESLint with Next.js config

### Key Files
- `app/layout.tsx`: Root layout with Geist font configuration
- `app/page.tsx`: Homepage
- `app/globals.css`: Global Tailwind styles
- `next.config.ts`: Next.js configuration
- `tsconfig.json`: TypeScript configuration with strict mode

## Common Patterns

### Adding New Tutorial Projects

When adding a new tutorial (e.g., 02-xxx):
1. Create new directory with sequential numbering
2. Initialize as Next.js project with TypeScript
3. Add its own README.md and optionally CLAUDE.md
4. Ensure it follows the same configuration patterns (TypeScript strict, pnpm, Tailwind)

### Working with Environment Variables

All .env* files are gitignored. Each tutorial project should:
- Use .env.local for local development secrets
- Document required environment variables in its README.md

### Path Aliases

Use the `@/*` alias for imports:
```typescript
// Good
import { Component } from '@/app/components/Component'

// Avoid
import { Component } from '../../../components/Component'
```
