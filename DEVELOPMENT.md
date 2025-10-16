# Development Guide

This document contains information for developers working on ccmcp.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10.17.0+ (package manager)
- Claude Code installed and available in PATH
- Terminal with TTY support for TUI testing

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Test the CLI during development:
   ```bash
   pnpm run dev
   ```

## Development Scripts

### Core Development

```bash
# Run CLI directly from TypeScript source
pnpm run dev

# Run with custom config directory during development
pnpm run dev -- --config-dir ./test-configs
pnpm run dev -- -c /path/to/configs

# Test cleanup command
pnpm run dev -- cleanup --dry-run --verbose

# Build for production
pnpm run build
```

### Code Quality

```bash
# Run linting
pnpm run lint

# Fix linting issues automatically
pnpm run lint:fix

# Format code (Biome for TypeScript/JavaScript, Prettier for other files)
pnpm run format

# Run type checking
pnpm run type-check

# Run tests (Vitest)
pnpm test

# Run all fixes and checks (lint:fix, format, type-check)
pnpm run fix
```

### Release Management

```bash
# Release with version bumps (includes build, tag, and publish)
pnpm run release:patch    # 1.0.0 -> 1.0.1
pnpm run release:minor    # 1.0.0 -> 1.1.0
pnpm run release:major    # 1.0.0 -> 2.0.0
```

## Project Architecture

### File Structure

```
src/
├── index.ts           # Main CLI entry point and argument parsing
├── mcp-scanner.ts     # MCP config discovery and validation logic
├── console-selector.ts # Terminal selection logic with TUI/fallback handling
├── claude-launcher.ts # Claude Code process management and execution
├── cleanup.ts        # Cleanup command for stale cache and broken symlinks
├── selection-cache.ts # Cache management for persisting config selections per project
├── utils.ts          # Shared utility functions for error formatting
├── schemas/          # Configuration validation schemas
│   └── mcp-config.ts # Zod schema for MCP configuration validation
├── __tests__/        # Test suite
│   ├── mcp-config-schema.test.ts # Schema validation tests
│   ├── utils.test.ts # Utility function tests
│   ├── cleanup.test.ts # Cleanup command tests
│   └── selection-cache.test.ts # Cache management tests
└── tui/              # React/Ink TUI components
    ├── index.ts      # TUI component exports
    ├── ConfigSelector.tsx    # Main TUI config selection interface
    ├── ConfigPreview.tsx     # Individual config preview component
    └── ErrorDisplay.tsx      # Collapsible error details display

scripts/
├── generate-release-notes.js # Automated release notes generation
└── release.js              # Version bumping and release automation
```

### Key Components

- **CLI Entry (`index.ts`)**: Handles argument parsing, help/version display, config directory resolution, and orchestrates the main flow including cleanup command
- **MCP Scanner (`mcp-scanner.ts`)**: Discovers and validates MCP configuration files using comprehensive schema validation
- **Schema Validation (`schemas/mcp-config.ts`)**: Zod-based schemas for validating MCP config structure with detailed error messages, supporting both modern and legacy formats (type field optional, defaults to "stdio")
- **Selection Cache (`selection-cache.ts`)**: Manages persistent caching of config selections per project directory, with support for XDG cache directories on Linux/macOS and AppData on Windows
- **Cleanup (`cleanup.ts`)**: Provides cleanup functionality to remove stale cache entries, invalid server references, and broken symlinks with dry-run and interactive modes
- **Test Suite (`__tests__/`)**: Comprehensive unit tests for schema validation, cache management, cleanup operations, and utility functions using Vitest
- **Console Selector (`console-selector.ts`)**: Manages config selection with TTY detection and TUI/readline fallback
- **TUI Components (`tui/`)**: React/Ink-based terminal user interface with modern navigation and visual feedback
- **Claude Launcher (`claude-launcher.ts`)**: Manages Claude Code process spawning with selected configs

## Build Process

The build process uses modern TypeScript tooling:

1. **Linting**: Uses Biome for code quality and style checking
2. **Type Checking**: Validates TypeScript types without emitting files
3. **Compilation**: Uses tsup to bundle and transpile TypeScript to JavaScript in `dist/` directory
4. **Testing**: Unit tests using Vitest test framework
5. **CLI Testing**: CLI functionality testing with `--help` and `--version`

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on:

- Push to `main` branch
- Pull requests targeting `main`

### CI Jobs

**Quality Checks** (runs on Node.js 18.x, 20.x, 22.x):

1. Checkout code and setup pnpm 10.17.0
2. Install dependencies with frozen lockfile
3. Run Biome linting and formatting checks
4. Check Prettier formatting for markdown/JSON/YAML files
5. Run TypeScript type checking
6. Run unit tests with Vitest
7. Build the project
8. Test CLI functionality (`--help`, `--version`)

### Caching Strategy

- Uses pnpm store caching with unique keys per Node.js version
- Cache keys include `pnpm-lock.yaml` hash for dependency changes

### Concurrency

- Cancels in-progress workflows when new commits are pushed to the same PR or branch

## Release Process

The project uses automated release management with GitHub Actions for publishing:

1. **Version Bumping**: Uses `scripts/release.js` to bump version in `package.json`
2. **Release Notes**: Generates changelog from git commits using `scripts/generate-release-notes.js`
3. **Git Tagging**: Creates version tags (e.g., `v1.0.0`) and pushes to GitHub
4. **CI Publishing**: GitHub Actions automatically builds and publishes to npm via OIDC

### Release Commands

- `pnpm run release:patch` - Bug fixes and minor changes (1.0.0 → 1.0.1)
- `pnpm run release:minor` - New features, backward compatible (1.0.0 → 1.1.0)
- `pnpm run release:major` - Breaking changes (1.0.0 → 2.0.0)

### Publishing Workflow

The project uses **npm Trusted Publishers (OIDC)** for secure, token-free publishing:

- Release scripts run locally and push a git tag
- GitHub Actions workflow (`.github/workflows/publish.yml`) triggers on tag push
- Workflow builds project and publishes to npm using OIDC authentication
- No npm tokens required anywhere

### Initial Setup (One-Time)

To enable automated publishing, configure Trusted Publishers on npmjs.com:

1. Go to https://www.npmjs.com/package/@gsong/ccmcp/access
2. Click "Publishing access" → "Add a publisher"
3. Select "GitHub Actions"
4. Configure:
   - Repository: `gsong/ccmcp`
   - Workflow: `publish.yml`
   - Environment: (leave blank)

## Tools and Configuration

### Code Quality Tools

- **Biome**: Linting and formatting for TypeScript/JavaScript
- **Prettier**: Formatting for markdown, JSON, YAML files
- **TypeScript**: Type checking
- **Vitest**: Modern unit testing framework
- **tsup**: TypeScript bundler for building the project

### Libraries and Frameworks

- **Zod**: Runtime schema validation with TypeScript integration
- **React + Ink**: Terminal user interface framework
- **shell-quote**: Command-line argument parsing for safe shell command construction
- **npm-run-all2**: Utility for running multiple npm scripts sequentially or in parallel

### Configuration Files

- `biome.json` - Biome linter and formatter settings
- `tsconfig.json` - TypeScript compiler configuration
- `tsup.config.ts` - tsup bundler configuration
- `vitest.config.ts` - Vitest test framework configuration
- `.prettierignore` - Files excluded from Prettier formatting
- `.gitignore` - Git ignore patterns including build artifacts

## Contributing

### Code Style

- Follow existing TypeScript conventions
- Use Biome for code formatting
- Ensure type safety (no `any` types without justification)
- Write descriptive commit messages following conventional commits

### Testing

The project includes both unit tests and manual CLI testing. Before contributing:

#### Unit Tests

1. Run the test suite: `pnpm test`
2. Tests cover:
   - Schema validation for valid STDIO, HTTP, and SSE server configurations
   - Invalid configurations with proper error messages
   - Edge cases and malformed JSON
   - Utility functions for error formatting
   - Selection cache management (load, save, clear)
   - Cleanup operations (stale entries, invalid references, broken symlinks)

#### Manual Testing

1. Ensure your changes don't break `--help` and `--version` commands
2. Test MCP config discovery and selection manually with different directory options:
   - Default directory (`~/.claude/mcp-configs/`)
   - Custom directory via `--config-dir`
   - Custom directory via `CCMCP_CONFIG_DIR` environment variable
3. Test selection caching:
   - Verify selections are remembered per project
   - Test `--ignore-cache` flag
   - Test `--clear-cache` flag
4. Test cleanup command:
   - Run `cleanup --dry-run` to preview changes
   - Test with `--yes` and `--verbose` flags
   - Verify removal of stale entries, invalid references, and broken symlinks
5. Verify Claude Code launching with various config combinations
6. Test error handling for non-existent config directories and invalid configs
7. Test TUI functionality in TTY environments and readline fallback in non-TTY contexts
8. Test TUI navigation, selection, and error detail expansion

### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes following the code style
4. Run `pnpm run fix` to ensure code quality
5. Test your changes manually
6. Submit a pull request with clear description

The CI pipeline will automatically validate your changes across multiple Node.js versions.
