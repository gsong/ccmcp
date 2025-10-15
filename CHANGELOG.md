# Changelog

All notable changes to this project will be documented in this file.

## [v1.2.0] - 2025-10-15

### Bug Fixes

- Resolve CLI flag collisions with Claude Code passthrough

### Improvements

- Document git worktree support, TUI shortcuts, and cleanup behaviors

## [v1.1.0] - 2025-10-14

### Features

- Add git worktree support for shared selections

### Bug Fixes

- Isolate cache directories in parallel test execution
- Prefix unused cmd parameter with underscore in tests

## [v1.0.0] - 2025-10-13

### Features

- Add cleanup command to remove stale configurations

### Bug Fixes

- Move temp file cleanup after GitHub release creation

### Improvements

- Reorganize npm scripts with public/private separation

## [v0.6.0] - 2025-10-12

### Features

- Display version number in TUI header
- Add GitHub release creation to release script

### Bug Fixes

- Replace manual shell escaping with shell-quote library for safer command execution

### Improvements

- Apply minor code quality improvements
- Add TypeScript erasableSyntaxOnly and verbatimModuleSyntax flags
- Add dependency injection for better testability
- Centralize process.exit() handling for better testability
- Extract package version reading to shared utility
- Optimize bundle size with tsup

## [v0.5.0] - 2025-10-12

### Features

- Remember user's last MCP config selections per project
- Display config labels at full width by default
- Add reusable test helper infrastructure
- Add project specifications

### Bug Fixes

- Handle missing config directory per specification
- Restore vi.resetModules() call in config selection UI tests
- Replace non-null assertions with proper type narrowing in tests

### Improvements

- Remove 24 biome-ignore suppressions by improving test helper types
- Migrate claude-launcher tests to Vitest with improved mocking
- Adopt test helpers across multiple test files
- Remove unused replaceProcess option from claude-launcher
- Expand test coverage for ConfigSelector, mcp-scanner, and Claude Code launch behavior

## [v0.4.0] - 2025-09-24

### Features

- Improve UI display for MCP configurations
- Add support for optional type field in MCP server configuration
- Implement comprehensive MCP configuration schema validation
- Add demo GIF to README
- Add concurrency control to CI workflow to cancel previous runs

### Bug Fixes

- Remove duplicate filename display in config preview header
- Resolve React key warning in ConfigPreview
- Improve test command to handle multiple test files
- Correct changelog generation and structure

### Improvements

- Remove StatusIndicator component completely
- Enable stricter TypeScript settings
- Extract shared formatErrorMessage utility
- Add comprehensive tests for formatErrorMessage utility
- Add test step to GitHub Actions workflow

## [v0.3.1] - 2025-09-23

### Features

- Add prettier formatting to CHANGELOG.md generation

### Bug Fixes

- Fix CLI arguments not being properly passed through to Claude

### Improvements

- Improve CHANGELOG formatting with consistent spacing
- Update documentation for v0.3.0 TUI features

## [v0.3.0] - 2025-09-23

### Features

- Add Ink TUI for interactive config selection
- Hide invalid configs option when no invalid configs exist
- Add collapsible error details in TUI invalid configs view
- Improve TUI color scheme and visual clarity
- Support configurable MCP config directory location

### Bug Fixes

- Use unique cache keys per Node.js version in CI workflow

### Improvements

- Improve src/ code quality and error handling
- Simplify release notes generation output

## [v0.2.0] - 2025-09-22

### Features

- Add automated release script and notes generation system
- Read CLI version dynamically from package.json
- Add git tagging and npm publish scripts
- Add github-issue-creator agent configuration
- Add WebSearch permission and agent configurations

### Bug Fixes

- Use pnpm for publishing and add public access flag

### Improvements

- Improve build system with separate compile and check scripts
- Update dependencies and build scripts
- Add project documentation and configuration

## [v0.1.0] - 2025-09-22

Initial release
