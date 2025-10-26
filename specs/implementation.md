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
  "react": "^19.2.0",
  "ink": "^6.3.1",
  "zod": "^4.1.12",
  "@types/react": "^19.2.2",
  "shell-quote": "^1.8.3"
}
```

**Dependency Justification**:

- **React**: Component-based architecture for TUI
- **Ink**: Terminal interface rendering engine
- **Zod**: Runtime schema validation with TypeScript integration
- **@types/react**: TypeScript definitions for React
- **shell-quote**: Safe argument escaping for shell commands

#### Development Dependencies

```json
{
  "typescript": "^5.9.3",
  "tsx": "^4.20.6",
  "@biomejs/biome": "^2.2.6",
  "@types/node": "^24.8.1",
  "@types/shell-quote": "^1.7.5",
  "npm-run-all2": "^8.0.4",
  "prettier": "^3.6.2",
  "tsup": "^8.5.0",
  "vitest": "^4.0.0",
  "ink-testing-library": "^4.0.0"
}
```

**Dependency Justification**:

- **TypeScript**: Type safety and compile-time error checking
- **tsx**: Development execution of TypeScript files
- **Biome**: Fast linting and formatting
- **@types/node**: Node.js type definitions
- **@types/shell-quote**: TypeScript definitions for shell-quote
- **npm-run-all2**: Script orchestration and parallelization
- **Prettier**: Code formatting for non-JavaScript files
- **tsup**: Fast TypeScript bundler for production builds
- **vitest**: Modern test framework with TypeScript support
- **ink-testing-library**: Testing utilities for Ink components

### Built-in Node.js Modules

```typescript
import { parseArgs } from "node:util";
import { readdir, readFile, stat, readlink, unlink } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, basename, dirname } from "node:path";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
```

## Project Structure

### Directory Layout

```
ccmcp/
├── src/
│   ├── __tests__/           # Unit tests
│   │   ├── __helpers__/    # Test helper utilities
│   │   └── *.test.ts       # Test files
│   ├── schemas/             # Zod validation schemas
│   ├── tui/                 # React/Ink components
│   │   ├── ConfigSelector.tsx
│   │   ├── ConfigPreview.tsx
│   │   ├── ErrorDisplay.tsx
│   │   └── index.ts
│   ├── index.ts            # CLI entry point
│   ├── mcp-scanner.ts      # Configuration discovery
│   ├── console-selector.ts # Interface selection
│   ├── claude-launcher.ts  # Process management
│   ├── selection-cache.ts  # Selection caching
│   ├── cleanup.ts          # Cache cleanup utilities
│   └── utils.ts            # Shared utilities
├── dist/                   # Compiled JavaScript output
├── specs/                  # Comprehensive specifications
├── scripts/                # Development and build scripts
│   ├── release.js          # Release automation
│   └── generate-release-notes.js
├── package.json            # Package configuration
├── tsconfig.json          # TypeScript configuration
├── tsup.config.ts         # Build configuration
├── vitest.config.ts       # Test configuration
├── biome.json             # Linting and formatting config
└── .claude/CLAUDE.md      # Project-specific instructions
```

### Source File Organization

#### Entry Point (`src/index.ts`)

```typescript
#!/usr/bin/env node
import { parseArgs } from "node:util";
import { launchClaudeCode } from "./claude-launcher.js";
import { selectConfigs } from "./console-selector.js";
import { scanMcpConfigs } from "./mcp-scanner.js";

// CLI argument parsing with passthrough support
// Handles help, version, cleanup, and main selector flow
// Supports caching of selections per project
```

#### Core Modules

- **mcp-scanner.ts**: Configuration file discovery and validation
- **console-selector.ts**: User interface (Ink TUI or readline fallback)
- **claude-launcher.ts**: Process spawning and lifecycle management
- **selection-cache.ts**: Per-project selection caching
- **cleanup.ts**: Cache and symlink cleanup utilities
- **utils.ts**: Shared utilities and error formatting
- **schemas/mcp-config.ts**: Zod schema validation for MCP configs

#### React Components (`src/tui/`)

- **ConfigSelector.tsx**: Main selection interface with keyboard navigation
- **ConfigPreview.tsx**: File content preview panel
- **ErrorDisplay.tsx**: Validation error display
- **index.ts**: Component exports

## Build System Configuration

### TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "lib": ["ES2022"],
    "target": "ES2022",
    "module": "ESNext",
    "moduleDetection": "force",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Key Configuration Decisions**:

- **ES2022 Target**: Modern JavaScript features with Node 18+ support
- **ESNext Module + Bundler Resolution**: Modern module handling optimized for tsup bundler
- **noEmit**: TypeScript used only for type checking; tsup handles compilation
- **Strict Mode**: Maximum type safety with additional strictness flags
- **JSX Support**: React component compilation with react-jsx transform
- **No Unused Variables**: Enforces clean code practices

### Biome Configuration (`biome.json`)

```json
{
  "$schema": "https://biomejs.dev/schemas/2.2.4/schema.json",
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "trailingCommas": "all"
    }
  }
}
```

**Key Configuration Decisions**:

- **Recommended Rules**: Use Biome's recommended linting rules
- **Consistent Formatting**: 2-space indentation, double quotes, trailing commas
- **Fast Performance**: Biome is significantly faster than ESLint + Prettier

### Package Configuration (`package.json`)

#### CLI Binary Configuration

```json
{
  "bin": {
    "ccmcp": "./dist/index.js"
  },
  "type": "module",
  "engines": {
    "node": ">=18.0.0"
  },
  "packageManager": "pnpm@10.17.0"
}
```

#### Scripts Configuration

```json
{
  "scripts": {
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "build": "run-s lint type-check _compile",
    "fix": "run-s lint:fix format type-check",
    "release:patch": "node scripts/release.js patch",
    "release:minor": "node scripts/release.js minor",
    "release:major": "node scripts/release.js major",
    "lint": "biome check src scripts",
    "lint:fix": "biome check --write src scripts",
    "format": "run-s _format:biome _format:prettier",
    "type-check": "tsc --noEmit",
    "_compile": "tsup",
    "_format:biome": "biome format --write src scripts",
    "_format:prettier": "prettier --write '**/*.{md,json,yaml,yml}'"
  }
}
```

**Key Scripts**:

- **dev**: Run CLI in development mode using tsx
- **test**: Run tests using Vitest
- **build**: Full build pipeline (lint → type-check → compile with tsup)
- **fix**: Auto-fix all code quality issues
- **release:\***: Automated release scripts using custom release.js
- **lint/format**: Separate linting (Biome) and formatting (Biome + Prettier for docs)

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
# 1. lint       - Code quality validation using Biome
# 2. type-check - TypeScript compilation check
# 3. _compile   - JavaScript bundling using tsup
```

### Build Configuration (`tsup.config.ts`)

```typescript
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  external: ["ink", "react", "zod", "shell-quote"],
  target: "node18",
  shims: false,
  bundle: true,
});
```

**Key Decisions**:

- **Single Entry Point**: Bundles from src/index.ts
- **ESM Format**: Pure ES modules output
- **Type Declarations**: Generates .d.ts files
- **External Dependencies**: ink, react, zod, shell-quote not bundled
- **No Splitting**: Single output file for CLI

### Testing Strategy

```bash
# Run all tests
pnpm run test

# Run tests in watch mode (during development)
pnpm exec vitest

# Run tests with coverage
pnpm exec vitest --coverage
```

## Testing Implementation

### Unit Testing Framework

- **Vitest**: Modern, fast test runner with TypeScript support
- **Ink Testing Library**: Utilities for testing React/Ink components
- **Test Helpers**: Custom helpers in `__tests__/__helpers__/` for mocking
- **Test Discovery**: `src/**/__tests__/**/*.test.ts` pattern

### Vitest Configuration (`vitest.config.ts`)

```typescript
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
  },
});
```

### Test Structure Example

```typescript
import { describe, expect, it } from "vitest";
import { validateMcpConfig } from "../schemas/mcp-config.js";

describe("MCP Configuration Schema Validation", () => {
  describe("Valid configurations", () => {
    it("should validate STDIO server configuration", () => {
      const config = {
        mcpServers: {
          browser: {
            type: "stdio",
            command: "mcp-server-browsermcp",
            args: [],
            env: {},
          },
        },
      };

      const result = validateMcpConfig(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeTruthy();
      }
    });

    it("should validate HTTP server configuration", () => {
      const config = {
        mcpServers: {
          context7: {
            type: "http",
            url: "https://mcp.context7.com/mcp",
            headers: {
              CONTEXT7_API_KEY: "test-key",
            },
          },
        },
      };

      const result = validateMcpConfig(config);
      expect(result.success).toBe(true);
    });
  });
});
```

### Test Categories

1. **Schema Validation Tests** (`mcp-config-schema.test.ts`): Comprehensive Zod schema validation
2. **Utility Function Tests** (`utils.test.ts`): Error formatting and helper functions
3. **Scanner Tests** (`mcp-scanner.test.ts`): Config discovery and validation
4. **Cache Tests** (`selection-cache.test.ts`): Selection caching logic
5. **Cleanup Tests** (`cleanup.test.ts`): Cache cleanup utilities
6. **Launcher Tests** (`claude-launcher.test.ts`): Process spawning logic
7. **UI Tests** (`config-selection-ui.test.ts`, `cli-ux.test.ts`): TUI and readline interfaces

### Test Helpers (`__tests__/__helpers__/`)

- **async.ts**: Async utilities and delays
- **child-process.ts**: Process mocking utilities
- **temp-dir.ts**: Temporary directory management
- **tty.ts**: TTY simulation helpers
- **ink.ts**: Ink component testing helpers
- **readline.ts**: Readline interface mocking

### Test Coverage Goals

- **Schema Validation**: All validation rules and edge cases tested
- **Error Handling**: All error paths covered
- **Utility Functions**: Complete function coverage
- **UI Components**: Interactive behavior tested with ink-testing-library
- **Integration**: End-to-end workflow testing

## CLI Features

### Selection Caching

The tool implements per-project selection caching to remember which MCP configs were previously selected:

- **Cache Location**: `~/.cache/ccmcp/` (or `$XDG_CACHE_HOME/ccmcp/`)
- **Cache Key**: Based on current working directory (project-specific)
- **Cache Content**: Selected config names and config directory path
- **Flags**:
  - `--ignore-cache` / `-i`: Skip loading cached selections
  - `--no-save` / `-n`: Don't save current selections (ephemeral mode)
  - `--clear-cache`: Clear all cached selections

### Cleanup Command

The `cleanup` subcommand removes stale cache entries and broken symlinks:

```bash
ccmcp cleanup [--dry-run] [--yes]
```

Features:

- Removes cache entries for configs that no longer exist
- Cleans up broken server references in cache files
- Removes broken symlinks in config directory
- `--dry-run`: Preview changes without making them
- `--yes`: Skip confirmation prompts

### Argument Passthrough

The CLI separates ccmcp-specific flags from Claude Code arguments:

- **ccmcp flags**: `--help`, `--version`, `--config-dir`, `--ignore-cache`, `--clear-cache`, `--no-save`, `--cleanup`, `--dry-run`, `--yes`
- **All other arguments**: Passed through to Claude Code unchanged
- **Combined short flags**: Supports `-in` for `-i -n`

Example:

```bash
ccmcp -i --project /path/to/project
# -i is for ccmcp, --project passes to claude
```

### TTY Detection

The selector automatically adapts to the environment:

- **TTY Environment**: Uses Ink-based interactive TUI
- **Non-TTY Environment**: Falls back to readline-based selection

## Error Handling Strategy

### Error Types and Handling

```typescript
// Missing config directory error
class MissingConfigDirectoryError extends Error {
  readonly directoryPath: string;
  constructor(directoryPath: string) {
    super(`Config directory not found: ${directoryPath}`);
    this.directoryPath = directoryPath;
    this.name = "MissingConfigDirectoryError";
  }
}

// Validation errors from Zod schemas
// Formatted using formatValidationErrors() from schemas/mcp-config.ts
```

**Error Handling Patterns**:

- **MissingConfigDirectoryError**: Special handling for missing config directory
- **Validation Errors**: Formatted using Zod error messages
- **JSON Parse Errors**: Separate handling with clear syntax error messages
- **Process Errors**: Child process spawn errors handled gracefully

### Error Recovery Patterns

- **Graceful Degradation**: Continue with partial success
- **User Guidance**: Provide actionable error messages
- **Fallback Options**: Alternative execution paths
- **Resource Cleanup**: Proper cleanup on failures

## Performance Optimizations

### Async/Await Patterns

```typescript
// Parallel configuration processing in mcp-scanner.ts
const configs = await Promise.all(
  jsonFiles.map(async (file): Promise<McpConfig> => {
    const filePath = join(resolvedConfigDir, file);
    const content = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(content);
    const validationResult = validateMcpConfig(parsed);
    // ... process result
  }),
);
```

**Key Patterns**:

- **Parallel File Reading**: All config files read concurrently
- **Parallel Validation**: Zod schema validation runs in parallel
- **Error Isolation**: Individual file errors don't block others

### Memory Management

- **Minimal Footprint**: Only config file metadata kept in memory
- **On-demand Preview**: File contents loaded only when preview is shown
- **Bundled Output**: Single bundled file reduces startup overhead

### Startup Performance

- **Fast Bundler**: tsup provides near-instant startup
- **Parallel Operations**: File scanning and validation run concurrently
- **Optimized Dependencies**: External dependencies reduce bundle size

## Security Considerations

### Input Validation

```typescript
// Config directory validation (from index.ts)
export function validateConfigDir(configDir: string): void {
  if (configDir.trim() === "") {
    throw new Error("Config directory cannot be empty");
  }
  if (configDir.includes("\0")) {
    throw new Error("Config directory contains invalid characters");
  }
}
```

### Command Argument Escaping

The project uses the `shell-quote` library for safe command argument escaping:

```typescript
import { quote } from "shell-quote";

// Safe argument construction for child processes
const args = quote([configPath, ...passthroughArgs]);
```

This prevents command injection attacks when passing user-provided arguments to child processes.

### Process Security

- **Spawn vs Exec**: Uses `spawn()` instead of `exec()` to avoid shell interpretation
- **Argument Array**: Passes arguments as array, not concatenated strings
- **Signal Handling**: Proper cleanup on SIGINT/SIGTERM
- **Environment Variables**: Only passes necessary environment variables

## Release Management

### Versioning Strategy

- **Semantic Versioning**: MAJOR.MINOR.PATCH format
- **Patch Releases**: Bug fixes and minor improvements
- **Minor Releases**: New features with backward compatibility
- **Major Releases**: Breaking changes

### Release Process

The project uses a custom automated release script (`scripts/release.js`) that handles:

1. Working directory validation (ensures clean git state)
2. Version bumping using npm version
3. Full build pipeline execution
4. Git tag creation
5. Publication to npm registry
6. Git push with tags

```bash
# Patch release (1.2.1 -> 1.2.2)
pnpm run release:patch

# Minor release (1.2.1 -> 1.3.0)
pnpm run release:minor

# Major release (1.2.1 -> 2.0.0)
pnpm run release:major
```

**Release Script Features**:

- Pre-flight validation (clean working directory, correct branch)
- Automated build verification
- Safe git operations
- Automatic tag creation and pushing
- Error handling with rollback capability

### Release Checklist

The release script automatically validates:

1. **Clean Working Directory**: No uncommitted changes
2. **Tests Pass**: All Vitest tests successful
3. **Build Success**: Clean compilation without errors
4. **Linting Clean**: No Biome violations
5. **Type Check**: TypeScript validation passes

Manual steps:

6. **Functional Testing**: Verify CLI functionality with real configs
7. **Documentation**: Update CHANGELOG.md if needed

## Deployment and Distribution

### NPM Package Publishing

- **Registry**: npmjs.com public registry
- **Package Scope**: Scoped package name `@gsong/ccmcp`
- **Binary Installation**: Global installation via `npm install -g @gsong/ccmcp`

### Package Contents

The published package (controlled by `"files"` in package.json) includes:

```
dist/
├── index.js           # Bundled CLI entry point (ESM)
├── index.d.ts         # Type definitions
├── index.d.mts        # Module type definitions
└── index.d.ts.map     # Type definition source maps
README.md
LICENSE
```

Note: With tsup bundling, the entire application is bundled into a single `index.js` file, with external dependencies (React, Ink, Zod, shell-quote) loaded from node_modules.

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
