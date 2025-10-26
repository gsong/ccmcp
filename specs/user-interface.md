# User Interface Specifications

This document provides comprehensive specifications for the ccmcp user interface, including terminal interface requirements, interaction flows, keyboard shortcuts, and user experience design.

## Overview

The ccmcp application provides two interface modes with automatic fallback to ensure compatibility across different terminal environments:

1. **TUI Mode**: Rich interactive interface using React/Ink for TTY-capable terminals
2. **Readline Mode**: Text-based fallback interface for non-TTY environments

## Interface Selection Strategy

### TTY Detection

The application automatically detects terminal capabilities and selects the appropriate interface:

```typescript
function isTTY(): boolean {
  return process.stdin.isTTY && process.stdout.isTTY;
}

if (isTTY()) {
  // Use Ink TUI
  await selectConfigsWithTUI(configs);
} else {
  // Use readline interface
  await selectConfigsReadline(configs);
}
```

**TTY Detection Criteria**:

- `process.stdout.isTTY` - Terminal supports output formatting
- `process.stdin.isTTY` - Terminal supports interactive input

**Fallback Scenarios**:

- Non-interactive shells (scripts, automation)
- CI/CD environments
- Pipes and redirections
- Remote terminals without full TTY support
- Windows Command Prompt (limited support)

## TUI Mode (Interactive Terminal Interface)

### Main Components

#### Configuration List

- **Layout**: Vertical scrollable list of available configurations
- **Selection Indicators**: Text-based checkboxes `[x]` for selected, `[ ]` for unselected items
- **Current Item Highlight**: Inverse colors (bold text) for currently focused item
- **Previously Selected Indicator**: Dim text showing "(previously selected)" for configs selected in last session

#### Preview Panel

- **Toggle**: Optional side panel showing configuration file content
- **Content**: JSON formatted (no syntax highlighting, plain text)
- **Responsive**: Fixed size (50 width, 20 height)
- **Scrolling**: Truncated display with "..." indicator for long content
- **Border**: Green for valid configs, red for invalid

#### Footer Bar

- **Selection Count**: Shows "Selected: X config(s)"
- **Selected Names**: Blue text showing comma-separated list of selected config names
- **Border**: Single-line box with gray border and padding

#### Invalid Configs Display

- **Toggle**: Optional separate section showing invalid configurations (press 'i')
- **Error Details**: Expandable/collapsible with 'e' key
- **Visual Indicators**: Red text with ✗ symbol
- **Expanded View**: Shows error details in bordered box with file path

### Keyboard Navigation

#### Primary Navigation

| Key     | Action   | Description                          |
| ------- | -------- | ------------------------------------ |
| `↑`     | Previous | Move selection up one item           |
| `↓`     | Next     | Move selection down one item         |
| `Space` | Toggle   | Toggle selection of current item     |
| `Enter` | Confirm  | Confirm selections and launch Claude |
| `q`     | Quit     | Exit without launching               |

#### Bulk Operations

| Key | Action     | Description                     |
| --- | ---------- | ------------------------------- |
| `a` | Select All | Select all valid configurations |
| `c` | Clear All  | Clear all selections            |

#### View Controls

| Key | Action         | Description                           |
| --- | -------------- | ------------------------------------- |
| `p` | Toggle Preview | Show/hide configuration preview panel |
| `i` | Toggle Invalid | Show/hide invalid configurations      |
| `e` | Expand Errors  | Expand/collapse error details         |

### Visual Design

#### Color Scheme

```
Selected Checkbox:   [x] text
Unselected Checkbox: [ ] text
Current Item:        Inverse colors, bold text
Valid Config:        Default text color
Invalid Config:      Red text
Preview Panel Border: Green (valid) or red (invalid)
Preview Content:     Blue for config description, cyan for "Loading..."
Footer Border:       Gray
Selected Names:      Blue text
Error Section:       Red text for errors, yellow for file path
Help Text:           Default text color
Previously Selected: Dim color
```

#### Layout Structure

```
Available MCP Configs - ccmcp v1.2.1
Use ↑/↓ to navigate, Space to select/deselect, Enter to confirm
Keys: (a)ll, (c)lear, (p)review, (i)nvalid configs, (q)uit

Valid Configs (3):
[ ] filesystem → server1
[x] database → server2 (previously selected)
[ ] weather-api → api-server

Invalid Configs (2):               [shown only if 'i' pressed]
  ✗ broken - Invalid config: broken (Press 'e' to see error details)
  ✗ missing - Invalid config: missing

┌─────────────────────────────────────────────────┐
│ Selected: 1 config(s) - database                │
└─────────────────────────────────────────────────┘
```

#### Responsive Layout

- **Preview Panel**: Fixed size (50 width, 20 height), displays side-by-side when enabled
- **Main Panel**: Takes 50% width when preview is shown, 100% when hidden
- **Invalid Configs**: Full-width section below main content when toggled on

### State Management

#### Configuration State

```typescript
interface ConfigSelectorState {
  validConfigs: McpConfig[];
  invalidConfigs: McpConfig[];
  selectedIndices: Set<number>;
  currentIndex: number;
  showingPreview: boolean;
  showingInvalidConfigs: boolean;
  expandedInvalidConfigs: Set<number>;
}
```

#### State Transitions

The TUI uses React hooks (useState) for state management:

- **selectedIndices**: Initialized from previouslySelected configs
- **currentIndex**: Tracks currently focused item (starts at 0)
- **showingPreview**: Toggle for preview panel visibility
- **showingInvalidConfigs**: Toggle for invalid configs section
- **expandedInvalidConfigs**: Set of indices for expanded error details

#### Exit Behavior

- **Press 'q' or Ctrl+C**: Exit without launching Claude
- **Press Enter**: Confirm selection and launch Claude with selected configs
- **Both cases**: Call Ink's `exit()` function to clean up TUI

## Readline Mode (Fallback Interface)

### Interface Design

#### Configuration Display

```
Available MCP configurations:

1. filesystem (Local filesystem access)
2. database (PostgreSQL database server)
3. weather-api (Weather service integration)
4. code-analysis (Code analysis tools)

Invalid configurations:
- broken.json: Invalid JSON syntax
- missing.json: Missing required field 'command'

Select configurations (comma-separated numbers, ranges supported): 1,3-4
Selected: filesystem, weather-api, code-analysis

Launch Claude with selected configurations? [Y/n]: y
```

#### Input Validation

- **Number Ranges**: Supports "1,3,5-7,9" format
- **Error Handling**: Clear error messages for invalid input
- **Retry Logic**: Allows user to re-enter on invalid input
- **Default Behavior**: Empty input selects no configurations

### Interaction Flow

#### Selection Process

1. **Display**: List all valid configurations with numbers
2. **Show Invalid**: Display invalid configurations (informational only)
3. **Show Instructions**: Display input format options
4. **Prompt**: Ask for selection using numbers (comma-separated)
5. **Parse**: Parse input and filter valid selections
6. **Return**: Return selected configs (no confirmation prompt)

#### Input Parsing

```typescript
function parseSelection(input: string, validConfigs: McpConfig[]): McpConfig[] {
  // Examples:
  // "1,3,5" -> [config1, config3, config5]
  // "all" or "ALL" -> all valid configs
  // "none" or "NONE" -> []
  // "" -> [] (or previously selected configs if available)
  // Note: Ranges (e.g., "1-3") are NOT supported
  // Out-of-range and invalid numbers are silently filtered out
}
```

#### Error Messages

- **No Valid Selections**: "No valid selections found. Launching without configs..."
- **Invalid Input**: "Invalid input. Launching without configs..." (caught exception)
- **All Invalid Configs**: "No valid configs found. Launching Claude Code without MCP configs..."

## User Experience Guidelines

### Discoverability

- **Help Text**: Always visible keyboard shortcuts in TUI mode
- **Context Hints**: Prompts explain available actions in readline mode
- **Progressive Disclosure**: Advanced features shown only when relevant

### Feedback

- **Immediate**: Visual feedback for all user actions
- **Clear States**: Obvious indication of current mode and available actions
- **Error Recovery**: Clear instructions for fixing problems

### Accessibility

- **High Contrast**: Compatible with terminal color schemes
- **Screen Readers**: Descriptive text for all interface elements
- **Keyboard Only**: Full functionality without mouse
- **Size Adaptation**: Works across terminal sizes

### Performance

- **Responsive**: UI updates immediately on user input
- **Lazy Loading**: Preview content loaded on demand
- **Efficient Rendering**: Minimal redraws for smooth experience
- **Memory Conscious**: Cleanup of resources when switching modes

## Error States and Recovery

### No Configurations Found

In `main()` function:

```
No MCP configs found. Launching Claude Code directly...
```

Then launches Claude Code with empty config list.

### Config Directory Missing

Throws `MissingConfigDirectoryError` with message:

```
Error: Config directory not found: /path/to/missing/directory
```

Returns exit code 1.

### All Configurations Invalid

In **TUI Mode**:

```
Available MCP Configs - ccmcp v1.2.1
...
No valid MCP configs found in /path/to/config/dir
Press any key to launch Claude Code without configs...
[Shows first invalid config with ErrorDisplay component]
```

In **Readline Mode**:

```
Available MCP configs:
======================

Invalid configs (cannot be selected):
   ✗ config1 - Invalid config: config1 (error details)
   ✗ config2 - Invalid config: config2 (error details)

No valid configs found. Launching Claude Code without MCP configs...
```

### Partial Failure

- **Valid Configs Available**: Shows both valid and invalid configs separately
- **Invalid Configs Toggle**: In TUI, press 'i' to show/hide invalid configs
- **Error Details**: In TUI, press 'e' to expand/collapse error details when viewing invalid configs
- **User Choice**: User can select from valid configs only; invalid ones cannot be selected

### Terminal Size Constraints

- **No explicit handling**: Ink adapts to terminal size naturally
- **Fixed Preview Size**: Preview panel uses fixed 50x20 size
- **Flexible Layout**: Main panel takes 50% or 100% width based on preview toggle

## Integration Points

### CLI Arguments

- `-h, --help`: Show usage information and exit
- `-v, --version`: Show version and exit
- `--config-dir <dir>`: Override default configuration directory
- `-i, --ignore-cache`: Skip loading previously selected configs
- `-n, --no-save`: Don't save selections (ephemeral mode)
- `--clear-cache`: Clear all cached selections and exit
- `cleanup`: Remove stale cache entries and broken symlinks
  - `--dry-run`: Preview what would be cleaned without making changes
  - `--yes`: Skip all prompts and automatically proceed
- Passthrough arguments: Forward remaining args to Claude Code

### Environment Variables

- `CCMCP_CONFIG_DIR`: Alternative to --config-dir option

### Cache Management

The application caches selected configurations per project and config directory:

- **Cache Location**:
  - Linux/macOS: `~/.cache/ccmcp/` (or `$XDG_CACHE_HOME/ccmcp/`)
  - Windows: `%LOCALAPPDATA%\ccmcp\`
- **Cache Key**: SHA-256 hash (first 16 chars) of `projectDir::configDir`
- **Cache File**: `selections-{hash}.json`
- **Project Detection**: Git repository root (handles worktrees correctly)
- **Previously Selected**: Automatically restored unless `--ignore-cache` is used
- **Auto-clear**: Cache deleted when selection is empty (no configs selected)

### Exit Codes

- `0`: Success - Claude launched or help/version displayed
- `1`: Error - Invalid arguments, system error, or cleanup errors
- Exit codes for user cancellation are handled by process exit

## Testing Considerations

### Manual Testing Scenarios

- Different terminal sizes and types
- Various keyboard layouts and configurations
- Both TTY and non-TTY environments
- Different numbers of configurations (0, 1, many)
- Mix of valid and invalid configurations
- Cache persistence across sessions
- Git worktree scenarios
- Cleanup command with dry-run and yes flags

### Automated Testing

- Mock TTY detection for consistent test environment
- Keyboard input simulation for TUI testing (via Ink's useInput hook)
- Mock readline interface for non-TTY testing
- Error condition testing with invalid configurations
- Cache operations (load, save, clear)
- Signal handling (SIGINT, SIGTERM)
- Input validation and parsing edge cases
- Combined short flags (e.g., `-in` for `-i -n`)

### Test Helpers

The test suite includes helpers for:

- Setting up mock Ink render
- Setting up mock readline interface
- Simulating TTY/non-TTY environments
- Creating temporary directories
- Mocking child process execution

This user interface specification provides complete guidance for implementing both interface modes with consistent behavior and robust error handling.
