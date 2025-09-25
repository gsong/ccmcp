# Implementation Details Specification

This document provides comprehensive technical implementation details including build system, dependencies, testing strategy, and development workflow for the ccmcp project.

## Technology Stack

### Runtime Environment

- **Node.js**: Minimum version 18.0.0
- **Platform Support**: Cross-platform (macOS, Linux, Windows)
- **Module System**: ES Modules (ESM) with `.js` extensions
- **Package Manager**: pnpm (recommended), npm compatible

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

**Dependency Justification**:

- **React**: Component-based architecture for TUI
- **Ink**: Terminal interface rendering engine
- **Zod**: Runtime schema validation with TypeScript integration
- **@types/react**: TypeScript definitions for React

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

**Dependency Justification**:

- **TypeScript**: Type safety and compile-time error checking
- **tsx**: Development execution of TypeScript files
- **Biome**: Fast linting and formatting
- **@types/node**: Node.js type definitions
- **npm-run-all2**: Script orchestration and parallelization
- **Prettier**: Code formatting for non-JavaScript files

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

- **Scanner**: Configuration file discovery and validation
- **Selector**: User interface and interaction handling
- **Launcher**: Process spawning and lifecycle management
- **Utils**: Shared utilities and error formatting

#### React Components (`src/tui/`)

- **ConfigSelector**: Main selection interface
- **ConfigPreview**: File content preview panel
- **ErrorDisplay**: Validation error display
- **index.ts**: Component exports

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

**Key Configuration Decisions**:

- **ES2022 Target**: Modern JavaScript features with Node 18+ support
- **Node16 Module Resolution**: Proper ESM handling with file extensions
- **Strict Mode**: Maximum type safety
- **JSX Support**: React component compilation
- **Source Maps**: Development debugging support

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
    "node": ">=18.0.0"
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

- **Built-in Node.js Test Runner**: No external dependencies
- **Assert Module**: Node.js built-in assertions
- **Test Discovery**: `src/**/*.test.ts` pattern

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

1. **Schema Validation Tests**: Comprehensive validation rule testing
2. **Utility Function Tests**: Error formatting and helper functions
3. **Integration Tests**: End-to-end workflow testing
4. **CLI Argument Tests**: Argument parsing validation

### Test Coverage Goals

- **Schema Validation**: 100% of validation rules tested
- **Error Handling**: All error paths covered
- **Utility Functions**: Complete function coverage
- **Edge Cases**: Boundary conditions and error states

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

- **Graceful Degradation**: Continue with partial success
- **User Guidance**: Provide actionable error messages
- **Fallback Options**: Alternative execution paths
- **Resource Cleanup**: Proper cleanup on failures

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

- **Streaming**: Large files processed incrementally
- **Cleanup**: Explicit resource disposal
- **Minimal Footprint**: Only load necessary data into memory

### Startup Performance

- **Lazy Loading**: Components loaded on demand
- **Parallel Operations**: File scanning and validation
- **Minimal Dependencies**: Small production bundle

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

- **Minimal Privileges**: Child processes spawn with limited access
- **Environment Isolation**: Controlled environment variable passing
- **Signal Handling**: Proper cleanup on termination

## Release Management

### Versioning Strategy

- **Semantic Versioning**: MAJOR.MINOR.PATCH format
- **Patch Releases**: Bug fixes and minor improvements
- **Minor Releases**: New features with backward compatibility
- **Major Releases**: Breaking changes

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

1. **Tests Pass**: All unit tests successful
2. **Build Success**: Clean compilation without errors
3. **Linting Clean**: No linting violations
4. **Type Check**: TypeScript validation passes
5. **Manual Testing**: CLI functionality verified
6. **Documentation Updated**: CHANGELOG.md updated

## Deployment and Distribution

### NPM Package Publishing

- **Registry**: npmjs.com public registry
- **Package Scope**: Scoped package name `@gsong/ccmcp`
- **Binary Installation**: Global installation via `npm install -g @gsong/ccmcp`

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
