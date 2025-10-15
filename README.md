# Claude Code MCP Selector

[![CI](https://github.com/gsong/ccmcp/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/gsong/ccmcp/actions/workflows/ci.yml)

A CLI tool that intelligently discovers, validates, and selects MCP (Model Context Protocol) server configurations for Claude Code.

![CCMCP Demo](./assets/ccmcp.gif)

## What it does

Ever have multiple MCP server configs but only want to use specific ones for different tasks? This tool:

- 🔍 **Discovers** all MCP configurations in your config directory
- ✅ **Validates** config files and shows clear error details for invalid ones
- 🎯 **Interactive selection** via modern terminal interface
- 💾 **Remembers** your selections per project for faster launches
- 🌳 **Git worktree aware** - selections are shared across worktrees of the same repository
- 🚀 **Launches Claude Code** with only your chosen configs
- 🧹 **Cleanup** stale cache entries and broken symlinks
- 👻 **Ephemeral mode** for one-off selections without saving
- ⚙️ **Configurable** via CLI options or environment variables

## Installation

```bash
# Install globally
npm install -g @gsong/ccmcp

# Or run without installing
npx @gsong/ccmcp
```

Works with npm, pnpm, or yarn. See [DEVELOPMENT.md](DEVELOPMENT.md) for building from source.

## Usage

### Quick Start

1. Run `ccmcp`
2. Select configs with arrow keys and spacebar
3. Press Enter to launch Claude Code

### Commands

```bash
# Launch with default config directory (~/.claude/mcp-configs/)
ccmcp

# Use custom directory
ccmcp --config-dir /path/to/configs

# Or use environment variable
CCMCP_CONFIG_DIR=/path/to/configs ccmcp

# Pass options to Claude Code
ccmcp --resume

# Cache management
ccmcp -i                      # Skip loading previous selections (short flag)
ccmcp --ignore-cache          # Skip loading previous selections (long flag)
ccmcp -n                      # Don't save selections (ephemeral mode)
ccmcp --no-save               # Don't save selections (ephemeral mode)
ccmcp -in                     # Combine: fresh start + no saving
ccmcp --clear-cache           # Clear all cached selections

# Cleanup stale cache entries and broken symlinks
ccmcp cleanup                 # Interactive cleanup with prompts
ccmcp cleanup --dry-run       # Preview what would be cleaned
ccmcp cleanup --yes           # Skip prompts, automatically proceed
```

**Cleanup notes:**

- Automatically removes entire cache files when no valid configs remain after cleanup
- Selecting zero configs automatically clears the selection cache for that project

### TUI Navigation

- **↑/↓**: Navigate • **Space**: Select • **Enter**: Launch Claude Code
- **q** / **Ctrl+C**: Quit
- **a**: Select all
- **c**: Clear all
- **p**: Toggle config preview panel
- **i**: Show/hide invalid configs
- **e**: Toggle error details (when viewing invalid configs)

## Requirements

- **Claude Code** must be installed and available in your PATH
- **Node.js** 18+ for running the tool
- **Terminal with TTY support** for the interactive TUI (falls back to text prompts otherwise)
- **MCP configs** should be JSON files in your configured directory (default: `~/.claude/mcp-configs/`)

## Troubleshooting

**"claude command not found"** - Ensure Claude Code is installed: `which claude`

**"No MCP configs found"** - Check you have `*.json` files in `~/.claude/mcp-configs/` or your custom directory

**Invalid configs** - The TUI shows validation errors with details. Common issues:

- Malformed JSON
- Missing `mcpServers` field
- Invalid server config (missing `command` for STDIO servers, or `url` for HTTP/SSE servers)

Note: The `type` field is optional for server configs and defaults to "stdio" for backward compatibility.

## Contributing

Interested in contributing? See [DEVELOPMENT.md](DEVELOPMENT.md) for:

- Development setup and scripts
- Project architecture and structure
- Build process and CI/CD information
- Release management and publishing
- Code style guidelines and contribution workflow
