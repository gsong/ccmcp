# Claude Code MCP Selector

A CLI tool that intelligently discovers, validates, and selects MCP (Model Context Protocol) server configurations for Claude Code.

## What it does

Ever have multiple MCP server configs but only want to use specific ones for different tasks? This tool solves that by:

- 🔍 **Auto-discovering** MCP configurations in `~/.claude/mcp-configs/`
- ✅ **Validating** config files to ensure they're properly formatted
- 🎯 **Interactive selection** via a clean terminal interface
- 🚀 **Seamless launch** of Claude Code with your chosen configs

## Features

- **Smart Discovery**: Automatically finds all MCP configs in your Claude directory
- **Config Validation**: Checks configs for proper structure and highlights issues
- **Flexible Selection**: Choose individual configs, all configs, or none at all
- **Passthrough Support**: Forwards any additional arguments to Claude Code
- **Error Handling**: Graceful handling of invalid configs and missing dependencies
- **Process Replacement**: Replaces itself with Claude Code for optimal performance

## Installation

Install dependencies:

```bash
pnpm install
```

Build the project:

```bash
pnpm run build
```

## Usage

### Basic Usage

```bash
# Scan configs and launch interactive selector
ccmcp

# Launch with additional Claude Code options
ccmcp --help
ccmcp --verbose
```

### Example Workflow

1. Run `ccmcp` in your terminal
2. See available MCP configs:

   ```
   Available MCP configs:
   ======================
   1. filesystem - MCP config: filesystem
   2. github - MCP config: github
   3. postgres - MCP config: postgres

   Enter config numbers to select (comma-separated, e.g., '1,3,5'):
   ```

3. Select configs: `1,3` (filesystem + postgres)
4. Claude Code launches with only those MCP servers enabled

### Selection Options

- **Specific configs**: `1,3,5` - Select configs 1, 3, and 5
- **All configs**: `all` - Select all valid configurations
- **No configs**: `Enter` (empty) - Launch Claude Code without MCP servers

## Requirements

- **Claude Code** must be installed and available in your PATH
- **Node.js** 18+ for running the tool
- **MCP configs** should be stored in `~/.claude/mcp-configs/` (standard Claude location)

## Troubleshooting

### "claude command not found"

Ensure Claude Code is installed and available in your PATH:

```bash
which claude
# Should return: /path/to/claude
```

### "No MCP configs found"

Check that you have MCP configs in the correct location:

```bash
ls ~/.claude/mcp-configs/
# Should show *.json files
```

### Invalid config errors

The tool will show which configs have issues. Common problems:

- Malformed JSON syntax
- Missing required `mcpServers` or `mcp_servers` field
- File permission issues

## Development

### Scripts

```bash
# Development mode with auto-reload
pnpm run dev

# Build for production
pnpm run build

# Clean build artifacts
pnpm run clean
```

### Project Structure

```
src/
├── index.ts           # Main CLI entry point
├── mcp-scanner.ts     # MCP config discovery and validation
├── console-selector.ts # Interactive terminal selection UI
└── claude-launcher.ts  # Claude Code process management
```

This project uses TypeScript and is built with Node.js tooling.
