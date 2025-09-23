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

### Via npm (Recommended)

Install globally to use anywhere:

```bash
# Using npm
npm install -g @gsong/ccmcp

# Using pnpm
pnpm add -g @gsong/ccmcp

# Using yarn
yarn global add @gsong/ccmcp

# Or run without installing
npx @gsong/ccmcp
```

### From Source

Clone and build locally:

```bash
# Install dependencies
pnpm install

# Build the project
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

## Contributing

Interested in contributing? See [DEVELOPMENT.md](DEVELOPMENT.md) for:

- Development setup and scripts
- Project architecture and structure
- Build process and CI/CD information
- Release management and publishing
- Code style guidelines and contribution workflow
