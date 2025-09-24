# Claude Code MCP Selector

A CLI tool that intelligently discovers, validates, and selects MCP (Model Context Protocol) server configurations for Claude Code.

![CCMCP Demo](./assets/ccmcp.gif)

## What it does

Ever have multiple MCP server configs but only want to use specific ones for different tasks? This tool:

- 🔍 **Discovers** all MCP configurations in your config directory
- ✅ **Validates** config files and shows clear error details for invalid ones
- 🎯 **Interactive selection** via modern terminal interface
- 🚀 **Launches Claude Code** with only your chosen configs
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
```

### TUI Navigation

- **↑/↓**: Navigate • **Space**: Select • **Enter**: Launch Claude Code
- **q**: Quit
- **a**: Select all
- **c**: Clear all

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
