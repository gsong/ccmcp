# Development Guide

This document contains information for developers working on ccmcp.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (package manager)
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

# Build for production
pnpm run build

# Clean build artifacts
pnpm run clean
```

### Code Quality

```bash
# Run linting
pnpm run lint

# Fix linting issues automatically
pnpm run lint:fix

# Format code with Biome
pnpm run format

# Format other files (markdown, JSON, YAML) with Prettier
pnpm run format:other

# Run type checking
pnpm run type-check

# Run tests
pnpm test

# Run all fixes and checks
pnpm run fix
```

### Release Management

```bash
# Generate release notes
pnpm run generate-release-notes

# Clean temporary release files
pnpm run clean-release-files

# Release with version bumps (includes build, tag, and publish)
pnpm run release:patch    # 0.2.0 -> 0.2.1
pnpm run release:minor    # 0.2.0 -> 0.3.0
pnpm run release:major    # 0.2.0 -> 1.0.0

# Dry run release process
pnpm run publish:dry-run
```

### Manual Publishing

```bash
# Create git tag
pnpm run git-tag

# Push git tag
pnpm run git-push-tag

# Publish to npm
pnpm run npm-publish

# Full manual publish process
pnpm run publish:npm
```

## Project Architecture

### File Structure

```
src/
├── index.ts           # Main CLI entry point and argument parsing
├── mcp-scanner.ts     # MCP config discovery and validation logic
├── console-selector.ts # Terminal selection logic with TUI/fallback handling
├── claude-launcher.ts # Claude Code process management and execution
├── schemas/          # Configuration validation schemas
│   └── mcp-config.ts # Zod schema for MCP configuration validation
├── __tests__/        # Test suite
│   └── mcp-config-schema.test.ts # Schema validation tests
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

- **CLI Entry (`index.ts`)**: Handles argument parsing, help/version display, config directory resolution, and orchestrates the main flow
- **MCP Scanner (`mcp-scanner.ts`)**: Discovers and validates MCP configuration files using comprehensive schema validation
- **Schema Validation (`schemas/mcp-config.ts`)**: Zod-based schemas for validating MCP config structure with detailed error messages
- **Test Suite (`__tests__/`)**: Comprehensive unit tests for schema validation covering valid/invalid configurations
- **Console Selector (`console-selector.ts`)**: Manages config selection with TTY detection and TUI/readline fallback
- **TUI Components (`tui/`)**: React/Ink-based terminal user interface with modern navigation and visual feedback
- **Claude Launcher (`claude-launcher.ts`)**: Manages Claude Code process spawning with selected configs

## Build Process

The build process uses TypeScript compilation:

1. **Type Checking**: Validates TypeScript types without emitting files
2. **Linting**: Uses Biome for code quality and style checking
3. **Testing**: Schema validation unit tests using Node.js built-in test runner
4. **Compilation**: Transpiles TypeScript to JavaScript in `dist/` directory
5. **CLI Testing**: CLI functionality testing with `--help` and `--version`

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on:

- Push to `main` branch
- Pull requests targeting `main`

### CI Jobs

**Quality Checks** (runs on Node.js 18.x, 20.x, 22.x):

1. Install dependencies with pnpm
2. Run linting and formatting checks
3. Check Prettier formatting for markdown/JSON/YAML files
4. Run TypeScript type checking
5. Run unit tests for schema validation
6. Build the project
7. Test CLI functionality (`--help`, `--version`)

### Caching Strategy

- Uses pnpm store caching with unique keys per Node.js version
- Cache keys include `pnpm-lock.yaml` hash for dependency changes

## Release Process

The project uses automated release management:

1. **Version Bumping**: Uses `scripts/release.js` to bump version in `package.json`
2. **Release Notes**: Generates changelog from git commits using `scripts/generate-release-notes.js`
3. **Git Tagging**: Creates version tags (e.g., `v0.2.0`)
4. **Publishing**: Publishes to npm with `@gsong/ccmcp` scope

### Release Commands

- `pnpm run release:patch` - Bug fixes and minor changes
- `pnpm run release:minor` - New features, backward compatible
- `pnpm run release:major` - Breaking changes

## Tools and Configuration

### Code Quality Tools

- **Biome**: Linting and formatting for TypeScript/JavaScript
- **Prettier**: Formatting for markdown, JSON, YAML files
- **TypeScript**: Type checking and compilation
- **Node.js Test Runner**: Built-in test framework for unit testing

### Libraries and Frameworks

- **Zod**: Runtime schema validation with TypeScript integration
- **React + Ink**: Terminal user interface framework

### Configuration Files

- `biome.json` - Biome linter and formatter settings
- `tsconfig.json` - TypeScript compiler configuration
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
2. Tests cover schema validation for:
   - Valid STDIO, HTTP, and SSE server configurations
   - Invalid configurations with proper error messages
   - Edge cases and malformed JSON

#### Manual Testing

1. Ensure your changes don't break `--help` and `--version` commands
2. Test MCP config discovery and selection manually with different directory options:
   - Default directory (`~/.claude/mcp-configs/`)
   - Custom directory via `--config-dir`
   - Custom directory via `CCMCP_CONFIG_DIR` environment variable
3. Verify Claude Code launching with various config combinations
4. Test error handling for non-existent config directories and invalid configs
5. Test TUI functionality in TTY environments and readline fallback in non-TTY contexts
6. Test TUI navigation, selection, and error detail expansion

### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes following the code style
4. Run `pnpm run fix` to ensure code quality
5. Test your changes manually
6. Submit a pull request with clear description

The CI pipeline will automatically validate your changes across multiple Node.js versions.
