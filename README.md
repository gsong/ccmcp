# Claude Code MCP Selector

A CLI tool that intelligently discovers, validates, and selects MCP (Model Context Protocol) server configurations for Claude Code.

## What it does

Ever have multiple MCP server configs but only want to use specific ones for different tasks? This tool solves that by:

- 🔍 **Auto-discovering** MCP configurations in configurable directories
- ✅ **Validating** config files to ensure they're properly formatted
- 🎯 **Modern TUI interface** with React/Ink for intuitive config selection
- 🚀 **Seamless launch** of Claude Code with your chosen configs
- ⚙️ **Configurable paths** via CLI options or environment variables

## Features

- **Smart Discovery**: Automatically finds all MCP configs in configurable directories
- **Config Validation**: Checks configs for proper structure and highlights issues
- **Interactive TUI**: Modern terminal interface with config previews and error details
- **Flexible Selection**: Choose individual configs, all configs, or none at all
- **Configurable Paths**: Specify custom config directories via CLI or environment
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

# Specify custom config directory
ccmcp --config-dir /path/to/configs
ccmcp -c ~/my-mcp-configs

# Use environment variable for config directory
CCMCP_CONFIG_DIR=/path/to/configs ccmcp

# Launch with additional Claude Code options
ccmcp --help
ccmcp --verbose
```

### Configuration Options

The tool supports multiple ways to specify the MCP config directory:

1. **CLI Option** (highest priority): `--config-dir` or `-c`
2. **Environment Variable**: `CCMCP_CONFIG_DIR`
3. **Default**: `~/.claude/mcp-configs/` (standard Claude location)

```bash
# Examples
ccmcp --config-dir ./project-configs     # Use local directory
ccmcp -c ~/work/mcp-configs              # Use home subdirectory
CCMCP_CONFIG_DIR=/etc/mcp ccmcp          # Use environment variable
```

### Example Workflow

1. Run `ccmcp` in your terminal
2. Interactive TUI appears showing available configs with:
   - ✅ Valid configs with descriptions and previews
   - ❌ Invalid configs with expandable error details
   - Navigation with arrow keys, space to select, Enter to confirm

3. Use keyboard navigation to select desired configs
4. Claude Code launches with only those MCP servers enabled

### TUI Navigation

- **↑/↓ Arrow keys**: Navigate between configs
- **Space**: Toggle config selection
- **Enter**: Confirm selection and launch Claude Code
- **q** or **Ctrl+C**: Exit without launching
- **a**: Select all valid configs
- **c**: Clear all selections
- **p**: Toggle config preview panel
- **i**: Toggle invalid configs display (when invalid configs exist)
- **e**: Expand/collapse error details for invalid configs (when viewing invalid configs)

## Requirements

- **Claude Code** must be installed and available in your PATH
- **Node.js** 18+ for running the tool
- **Terminal with TTY support** for the interactive TUI (falls back to text prompts otherwise)
- **MCP configs** should be JSON files in your configured directory (default: `~/.claude/mcp-configs/`)

## Troubleshooting

### "claude command not found"

Ensure Claude Code is installed and available in your PATH:

```bash
which claude
# Should return: /path/to/claude
```

### "No MCP configs found"

Check that you have MCP configs in the correct location. The tool will show which directory it's searching:

```bash
# Check default location
ls ~/.claude/mcp-configs/
# Should show *.json files

# Check custom location if using --config-dir
ls /your/custom/config/path/
# Should show *.json files

# Verify which directory is being used
ccmcp --config-dir /path/to/check
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
