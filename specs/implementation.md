# Implementation Details Specification

This document provides comprehensive technical implementation details including build system, dependencies, testing strategy, and development workflow for the ccmcp project.

## Technology Stack

### Runtime Environment

* __Node.js__: Version 22.18.0+ or 24.2.0+ (excludes 23.x and 24.0-24.1)
* __Platform Support__: Cross-platform (macOS, Linux, Windows)
* __Module System__: ES Modules (ESM) with `.js` extensions
* __Package Manager__: pnpm (recommended), npm compatible

### Core Dependencies

#### Production Dependencies

```json
{
  "react": "^19.1.1",
  "ink": "^6.3.1",
  "zod": "^4.1.11",
  "@types/react": "^19.1.13"
}
```

__Dependency Justification__:

* __React__: Component-based architecture for TUI
* __Ink__: Terminal interface rendering engine
* __Zod__: Runtime schema validation with TypeScript integration
* __@types/react__: TypeScript definitions for React

#### Development Dependencies

```json
{
  "typescript": "^5.9.2",
  "tsx": "^4.20.5",
  "@biomejs/biome": "^2.2.4",
  "@types/node": "^24.5.2",
  "npm-run-all2": "^8.0.4",
  "prettier": "^3.6.2"
}
```

__Dependency Justification__:

* __TypeScript__: Type safety and compile-time error checking
* __tsx__: Development execution of TypeScript files
* __Biome__: Fast linting and formatting
* __@types/node__: Node.js type definitions
* __npm-run-all2__: Script orchestration and parallelization
* __Prettier__: Code formatting for non-JavaScript files

### Built-in Node.js Modules

```typescript
import { parseArgs } from "node:util";
import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve, basename } from "node:path";
import { spawn, exec } from "node:child_process";
import { createReadline } from "node:readline/promises";
```

## Project Structure

### Directory Layout

```
ccmcp/
├── src/
│   ├── __tests__/           # Unit tests
│   ├── schemas/             # Zod validation schemas
│   ├── tui/                 # React/Ink components
│   ├── index.ts            # CLI entry point
│   ├── mcp-scanner.ts      # Configuration discovery
│   ├── console-selector.ts # Interface selection
│   ├── claude-launcher.ts  # Process management
│   └── utils.ts            # Shared utilities
├── dist/                   # Compiled JavaScript output
├── specs/                  # Comprehensive specifications
├── scripts/                # Development and build scripts
├── assets/                 # Static assets and documentation
├── package.json            # Package configuration
├── tsconfig.json          # TypeScript configuration
├── biome.json             # Linting and formatting config
└── CLAUDE.md              # Project-specific instructions
```

### Source File Organization

#### Entry Point (`src/index.ts`)

```typescript
#!/usr/bin/env node
import { parseArgs } from "node:util";
import { main } from "./main.js";

// CLI argument parsing and error handling
// Delegates to main() for application logic
```

#### Core Modules

* __Scanner__: Configuration file discovery and validation
* __Selector__: User interface and interaction handling
* __Launcher__: Process spawning and lifecycle management
* __Utils__: Shared utilities and error formatting

#### React Components (`src/tui/`)

* __ConfigSelector__: Main selection interface
* __ConfigPreview__: File content preview panel
* __ErrorDisplay__: Validation error display
* __index.ts__: Component exports

## Build System Configuration

### TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "jsx": "react-jsx",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "__tests__"]
}
```

__Key Configuration Decisions__:

* __ES2022 Target__: Modern JavaScript features with Node 18+ support
* __Node16 Module Resolution__: Proper ESM handling with file extensions
* __Strict Mode__: Maximum type safety
* __JSX Support__: React component compilation
* __Source Maps__: Development debugging support

### Biome Configuration (`biome.json`)

```json
{
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExcessiveCognitiveComplexity": "warn"
      },
      "style": {
        "useConsistentArrayType": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "organizeImports": {
    "enabled": true
  }
}
```

### Package Configuration (`package.json`)

#### CLI Binary Configuration

```json
{
  "bin": {
    "ccmcp": "dist/index.js"
  },
  "type": "module",
  "engines": {
    "node": "^22.18.0 || >=24.2.0"
  }
}
```

#### Scripts Configuration

```json
{
  "scripts": {
    "build": "npm-run-all lint type-check compile",
    "compile": "tsc --build",
    "dev": "tsx src/index.ts",
    "test": "node --test src/**/*.test.ts",
    "lint": "biome lint src/",
    "lint:fix": "biome lint --write src/",
    "format": "biome format --write src/",
    "type-check": "tsc --noEmit",
    "fix": "npm-run-all lint:fix format type-check",
    "release:patch": "npm version patch && npm run build && npm publish",
    "release:minor": "npm version minor && npm run build && npm publish",
    "release:major": "npm version major && npm run build && npm publish"
  }
}
```

## Development Workflow

### Development Mode

```bash
# Start development with file watching
pnpm run dev -- --config-dir ./test-configs

# Run with specific arguments
pnpm run dev -- --help
pnpm run dev -- --version
```

### Code Quality Pipeline

```bash
# Full quality check (run before commits)
pnpm run fix

# Individual steps
pnpm run lint        # Code linting
pnpm run lint:fix    # Auto-fix lint issues
pnpm run format      # Code formatting
pnpm run type-check  # TypeScript validation
```

### Build Process

```bash
# Complete build pipeline
pnpm run build

# Build steps breakdown:
# 1. lint       - Code quality validation
# 2. type-check - TypeScript compilation check
# 3. compile    - JavaScript generation
```

### Testing Strategy

```bash
# Run all tests
pnpm run test

# Run specific test files
node --test src/__tests__/mcp-config-schema.test.ts
node --test src/__tests__/utils.test.ts
```

## Testing Implementation

### Unit Testing Framework

* __Built-in Node.js Test Runner__: No external dependencies
* __Assert Module__: Node.js built-in assertions
* __Test Discovery__: `src/**/*.test.ts` pattern

### Test Structure Example

```typescript
import { test, describe } from "node:test";
import assert from "node:assert";
import { mcpConfigSchema } from "../schemas/mcp-config.js";

describe("MCP Configuration Schema", () => {
  test("validates valid STDIO configuration", () => {
    const config = {
      mcpServers: {
        test: {
          type: "stdio",
          command: "node",
          args: ["server.js"],
        },
      },
    };

    const result = mcpConfigSchema.safeParse(config);
    assert.strictEqual(result.success, true);
  });

  test("rejects invalid configuration", () => {
    const config = {
      mcpServers: {
        test: {
          type: "stdio",
          // Missing required 'command' field
        },
      },
    };

    const result = mcpConfigSchema.safeParse(config);
    assert.strictEqual(result.success, false);
  });
});
```

### Test Categories

1. __Schema Validation Tests__: Comprehensive validation rule testing
2. __Utility Function Tests__: Error formatting and helper functions
3. __Integration Tests__: End-to-end workflow testing
4. __CLI Argument Tests__: Argument parsing validation

### Test Coverage Goals

* __Schema Validation__: 100% of validation rules tested
* __Error Handling__: All error paths covered
* __Utility Functions__: Complete function coverage
* __Edge Cases__: Boundary conditions and error states

## Error Handling Strategy

### Error Types and Handling

```typescript
// System errors (file access, permissions)
class SystemError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "SystemError";
  }
}

// Validation errors (schema failures)
class ValidationError extends Error {
  constructor(
    message: string,
    public errors: string[],
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

// User input errors
class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}
```

### Error Recovery Patterns

* __Graceful Degradation__: Continue with partial success
* __User Guidance__: Provide actionable error messages
* __Fallback Options__: Alternative execution paths
* __Resource Cleanup__: Proper cleanup on failures

## Performance Optimizations

### Async/Await Patterns

```typescript
// Parallel configuration processing
const configResults = await Promise.all(
  configPaths.map(async (path) => {
    try {
      const content = await readFile(path, "utf-8");
      return await validateConfig(content, path);
    } catch (error) {
      return { path, error: formatError(error) };
    }
  }),
);
```

### Memory Management

* __Streaming__: Large files processed incrementally
* __Cleanup__: Explicit resource disposal
* __Minimal Footprint__: Only load necessary data into memory

### Startup Performance

* __Lazy Loading__: Components loaded on demand
* __Parallel Operations__: File scanning and validation
* __Minimal Dependencies__: Small production bundle

## Security Considerations

### Input Validation

```typescript
// Path sanitization
function sanitizePath(inputPath: string): string {
  const resolved = resolve(inputPath);
  if (!resolved.startsWith(homedir())) {
    throw new Error("Path must be within user home directory");
  }
  return resolved;
}

// Command argument validation
function validateCommand(command: string): void {
  if (command.includes("..") || command.includes("/")) {
    throw new Error("Command cannot contain path traversal");
  }
}
```

### Process Security

* __Minimal Privileges__: Child processes spawn with limited access
* __Environment Isolation__: Controlled environment variable passing
* __Signal Handling__: Proper cleanup on termination

## Release Management

### Versioning Strategy

* __Semantic Versioning__: MAJOR.MINOR.PATCH format
* __Patch Releases__: Bug fixes and minor improvements
* __Minor Releases__: New features with backward compatibility
* __Major Releases__: Breaking changes

### Release Process

```bash
# Patch release (0.1.0 -> 0.1.1)
pnpm run release:patch

# Minor release (0.1.1 -> 0.2.0)
pnpm run release:minor

# Major release (0.2.0 -> 1.0.0)
pnpm run release:major
```

### Release Checklist

1. __Tests Pass__: All unit tests successful
2. __Build Success__: Clean compilation without errors
3. __Linting Clean__: No linting violations
4. __Type Check__: TypeScript validation passes
5. __Manual Testing__: CLI functionality verified
6. __Documentation Updated__: CHANGELOG.md updated

## Deployment and Distribution

### NPM Package Publishing

* __Registry__: npmjs.com public registry
* __Package Scope__: Scoped package name `@gsong/ccmcp`
* __Binary Installation__: Global installation via `npm install -g @gsong/ccmcp`

### Package Contents

```
dist/
├── index.js           # CLI entry point
├── index.js.map       # Source map
├── *.js              # Compiled modules
├── *.js.map          # Source maps
├── *.d.ts            # Type definitions
└── *.d.ts.map        # Type definition maps
```

### Installation Verification

```bash
# Global installation
npm install -g @gsong/ccmcp

# Verify installation
ccmcp --version
ccmcp --help

# Local development installation
npm install @gsong/ccmcp
npx @gsong/ccmcp --version
```

This implementation specification provides complete technical guidance for building, testing, and deploying the ccmcp application with professional software development practices.
