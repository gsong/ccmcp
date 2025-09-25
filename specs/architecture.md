# System Architecture Specification

## Overview

The ccmcp application follows a **modular, functional architecture** with clear separation of concerns organized into distinct layers. The system is designed for maintainability, testability, and extensibility while providing both interactive and programmatic interfaces.

## Architectural Principles

### 1. Separation of Concerns

Each module has a single, well-defined responsibility:

- CLI layer handles argument parsing and orchestration
- Discovery layer manages configuration scanning and validation
- Presentation layer provides user interface components
- Execution layer manages process spawning and lifecycle

### 2. Interface Segregation

Components depend on abstractions rather than concrete implementations:

- Scanner interface for configuration discovery
- Selector interface for user interaction
- Launcher interface for process management

### 3. Fail-Fast Design

Early validation and error detection:

- Schema validation at configuration load time
- TTY detection for interface selection
- Directory existence checks before scanning

### 4. Graceful Degradation

Fallback mechanisms for various environments:

- TUI falls back to readline interface
- Direct Claude launch when no configs found
- Error recovery with helpful user messages

## System Layers

```mermaid
graph TB
    subgraph "CLI Layer"
        CLI[index.ts<br/>CLI Entry Point]
    end

    subgraph "Discovery Layer"
        Scanner[mcp-scanner.ts<br/>Configuration Discovery]
        Schema[schemas/mcp-config.ts<br/>Validation Schema]
    end

    subgraph "Presentation Layer"
        Selector[console-selector.ts<br/>Interface Selection]
        TUI[tui/<br/>React Components]
        Readline[Readline Fallback]
    end

    subgraph "Execution Layer"
        Launcher[claude-launcher.ts<br/>Process Management]
    end

    subgraph "Utilities"
        Utils[utils.ts<br/>Helper Functions]
    end

    CLI --> Scanner
    CLI --> Selector
    CLI --> Launcher
    Scanner --> Schema
    Selector --> TUI
    Selector --> Readline
    Scanner --> Utils
    Selector --> Utils
```

## Core Design Patterns

### 1. Strategy Pattern

**Interface Selection Strategy**: The system selects between TUI and readline interfaces based on TTY detection.

```typescript
// Pseudo-implementation
interface SelectionStrategy {
  selectConfigs(configs: MCPConfig[]): Promise<MCPConfig[]>;
}

class TUIStrategy implements SelectionStrategy {
  async selectConfigs(configs: MCPConfig[]): Promise<MCPConfig[]> {
    // React/Ink based selection
  }
}

class ReadlineStrategy implements SelectionStrategy {
  async selectConfigs(configs: MCPConfig[]): Promise<MCPConfig[]> {
    // Text-based selection
  }
}
```

### 2. Builder Pattern

**Configuration Validation**: Schema validation builds validated configuration objects with detailed error reporting.

```typescript
// Schema-based validation and building
const validatedConfig = mcpConfigSchema.parse(rawConfig);
```

### 3. Observer Pattern

**React Component State**: TUI components use React state management for reactive updates.

```typescript
// Component state management
const [selectedConfigs, setSelectedConfigs] = useState<string[]>([]);
const [showPreview, setShowPreview] = useState(false);
```

### 4. Command Pattern

**CLI Argument Processing**: Commands are parsed and executed through a structured flow.

```typescript
// Command processing flow
const args = parseArgs(process.argv.slice(2));
await executeCommand(args);
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant CLI as CLI Entry Point
    participant Scanner as MCP Scanner
    participant Selector as Console Selector
    participant TUI as TUI Components
    participant Launcher as Claude Launcher

    User->>CLI: Launch ccmcp
    CLI->>Scanner: Scan config directory
    Scanner-->>CLI: Return validated configs
    CLI->>Selector: Present configs
    Selector->>TUI: Render interface
    TUI-->>Selector: User selections
    Selector-->>CLI: Selected configs
    CLI->>Launcher: Launch Claude with configs
    Launcher-->>User: Claude Code running
```

## Module Dependencies

```mermaid
graph LR
    subgraph CoreModules [Core Modules]
        Index[index.ts]
        Scanner[mcp-scanner.ts]
        Selector[console-selector.ts]
        Launcher[claude-launcher.ts]
        Utils[utils.ts]
    end

    subgraph SchemaLayer [Schema]
        Schema[mcp-config.ts]
    end

    subgraph TUIComponents [TUI Components]
        ConfigSelector[ConfigSelector.tsx]
        ConfigPreview[ConfigPreview.tsx]
        ErrorDisplay[ErrorDisplay.tsx]
    end

    Index --> Scanner
    Index --> Selector
    Index --> Launcher
    Index --> Utils

    Scanner --> Schema
    Scanner --> Utils

    Selector --> ConfigSelector
    Selector --> Utils

    ConfigSelector --> ConfigPreview
    ConfigSelector --> ErrorDisplay
```

## Error Handling Architecture

### Error Classification

1. **System Errors**: File system access, permission issues
2. **Validation Errors**: Schema validation failures
3. **User Errors**: Invalid input, missing configurations
4. **Runtime Errors**: Process spawning, signal handling

### Error Propagation Strategy

```mermaid
flowchart TD
    A[Error Occurs] --> B{Error Type}
    B -->|System| C[Log & Exit with Code]
    B -->|Validation| D[Collect & Display Details]
    B -->|User| E[Show Help & Retry]
    B -->|Runtime| F[Graceful Cleanup & Exit]

    D --> G[Continue with Valid Configs]
    E --> H[Restart Flow]
    F --> I[Propagate Exit Code]
```

### Error Recovery Mechanisms

- **Partial Failure**: Continue with valid configurations when some fail validation
- **Fallback Interfaces**: Switch from TUI to readline on TTY issues
- **Graceful Cleanup**: Handle process signals and cleanup resources
- **Helpful Messages**: Provide actionable error messages with suggestions

## Concurrency Model

### Async/Await Pattern

The application uses async/await throughout for:

- File system operations (configuration scanning)
- User interface interactions (selection waiting)
- Process spawning (Claude Code execution)

### Parallel Processing

- **Configuration Scanning**: Process multiple files simultaneously using `Promise.all()`
- **Validation**: Parallel schema validation for better performance
- **Non-blocking UI**: React components handle state updates asynchronously

## State Management

### Application State

- **Configuration List**: Discovered and validated MCP configs
- **Selection State**: User's current configuration selections
- **UI State**: Interface mode, preview toggle, error display state

### State Flow

```mermaid
stateDiagram-v2
    [*] --> Scanning
    Scanning --> Presenting: Configs Found
    Scanning --> DirectLaunch: No Configs
    Presenting --> Selecting: User Interaction
    Selecting --> Confirming: Selection Made
    Selecting --> Presenting: Change Selection
    Confirming --> Launching: Confirmed
    Launching --> [*]: Claude Started
    DirectLaunch --> [*]: Claude Started
```

## Extension Points

### 1. Configuration Sources

- Currently supports JSON files
- Extensible to YAML, TOML, or remote sources
- Plugin architecture for custom discovery

### 2. Interface Types

- Current: TUI and readline
- Extensible to web UI, desktop app, or API
- Interface factory pattern supports new types

### 3. Validation Rules

- Zod schema-based validation
- Custom validation rules can be added
- Support for configuration-specific validators

### 4. Launch Targets

- Currently launches Claude Code
- Extensible to other applications
- Configuration-driven launcher selection

## Performance Characteristics

### Memory Usage

- **Minimal**: Only loads necessary configurations into memory
- **Streaming**: Large configuration files handled efficiently
- **Cleanup**: Proper resource disposal and garbage collection

### Startup Time

- **Fast Boot**: Parallel configuration loading
- **Lazy Loading**: TUI components loaded on demand
- **Cached Validation**: Schema compilation cached for reuse

### Scalability

- **File Count**: Handles hundreds of configuration files efficiently
- **Configuration Size**: Supports large configuration files with streaming
- **User Interface**: Responsive even with many configurations

## Security Considerations

### Input Validation

- All configuration files validated against strict schemas
- CLI arguments sanitized and validated
- Process arguments properly escaped

### Process Security

- Child process spawning with minimal privileges
- Signal handling prevents zombie processes
- Environment variable isolation

### File System Access

- Read-only access to configuration directories
- Path traversal prevention
- Permission validation before operations
