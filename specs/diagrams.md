# Visual Architecture Diagrams

This document contains comprehensive visual diagrams created with Mermaid to illustrate the ccmcp application's architecture, data flow, component interactions, and user experience.

## Application Flow Overview

### High-Level Application Flow

```mermaid
flowchart TD
    Start([User runs ccmcp]) --> Args[Parse CLI Arguments]
    Args --> Help{Help or Version?}
    Help -->|Yes| ShowHelp[Display Help/Version] --> Exit1([Exit])
    Help -->|No| Cleanup{Cleanup Command?}

    Cleanup -->|Yes| RunCleanup[Run Cleanup Process]
    RunCleanup --> Exit6([Exit with Status])

    Cleanup -->|No| ClearCache{Clear Cache?}
    ClearCache -->|Yes| RemoveCache[Remove All Cache Files]
    RemoveCache --> Exit7([Exit Success])

    ClearCache -->|No| ConfigDir[Resolve Config Directory]
    ConfigDir --> Scan[Scan for MCP Configurations]
    Scan --> Found{Configurations Found?}
    Found -->|No| DirectLaunch[Launch Claude Directly] --> Exit2([Exit])

    Found -->|Yes| Validate[Validate Configurations]
    Validate --> HasValid{Valid Configs Exist?}
    HasValid -->|No| ShowErrors[Show All Invalid] --> AskLaunch{Launch Anyway?}
    AskLaunch -->|No| Exit3([Exit])
    AskLaunch -->|Yes| DirectLaunch

    HasValid -->|Yes| LoadCache{Ignore Cache?}
    LoadCache -->|No| LoadPrev[Load Previous Selections]
    LoadCache -->|Yes| EmptySelection[Start with Empty Selection]
    LoadPrev --> DetectTTY{TTY Available?}
    EmptySelection --> DetectTTY

    DetectTTY -->|Yes| TUI[Show TUI Interface]
    DetectTTY -->|No| Readline[Show Readline Interface]

    TUI --> Selected{Configs Selected?}
    Readline --> Selected
    Selected -->|No| Exit4([User Cancelled])
    Selected -->|Yes| SaveCache{No-Save Flag?}
    SaveCache -->|No| SaveSelection[Save Selections to Cache]
    SaveCache -->|Yes| SkipSave[Skip Saving]
    SaveSelection --> Launch[Launch Claude with Configs]
    SkipSave --> Launch
    Launch --> Exit5([Claude Running])
```

## Component Architecture

### System Architecture Diagram

```mermaid
graph TB
    subgraph "CLI Layer"
        CLI[index.ts<br/>CLI Entry Point]
    end

    subgraph "Application Core"
        Scanner[mcp-scanner.ts<br/>Configuration Discovery]
        Selector[console-selector.ts<br/>Interface Selection]
        Launcher[claude-launcher.ts<br/>Process Management]
        Cache[selection-cache.ts<br/>Selection Persistence]
        Cleanup[cleanup.ts<br/>Cache Maintenance]
        Utils[utils.ts<br/>Shared Utilities]
    end

    subgraph "Validation Layer"
        Schema[schemas/mcp-config.ts<br/>Zod Validation]
    end

    subgraph "TUI Layer"
        ConfigSelector[ConfigSelector.tsx<br/>Main Interface]
        ConfigPreview[ConfigPreview.tsx<br/>File Preview]
        ErrorDisplay[ErrorDisplay.tsx<br/>Error Details]
    end

    subgraph "External Systems"
        FileSystem[(File System<br/>Configuration Files)]
        CacheDir[(Cache Directory<br/>Selection History)]
        Claude[Claude Code Process]
    end

    CLI --> Scanner
    CLI --> Selector
    CLI --> Launcher
    CLI --> Cache
    CLI --> Cleanup

    Scanner --> Schema
    Scanner --> FileSystem
    Scanner --> Utils

    Selector --> ConfigSelector
    Selector --> Utils

    ConfigSelector --> ConfigPreview
    ConfigSelector --> ErrorDisplay

    Launcher --> Claude
    Launcher --> Utils

    Cache --> CacheDir
    Cleanup --> Cache
    Cleanup --> FileSystem

    style CLI fill:#e1f5fe
    style Scanner fill:#f3e5f5
    style Selector fill:#f3e5f5
    style Launcher fill:#f3e5f5
    style Cache fill:#f3e5f5
    style Cleanup fill:#f3e5f5
    style Schema fill:#fff3e0
    style ConfigSelector fill:#e8f5e8
    style FileSystem fill:#ffebee
    style CacheDir fill:#ffebee
    style Claude fill:#ffebee
```

## Data Flow Diagrams

### Configuration Discovery and Validation Flow

```mermaid
sequenceDiagram
    participant CLI as CLI Entry Point
    participant Scanner as MCP Scanner
    participant FS as File System
    participant Schema as Validation Schema
    participant Selector as Console Selector

    CLI->>+Scanner: scanMCPConfigs(configDir)
    Scanner->>+FS: readdir(configDir)
    FS-->>-Scanner: file list

    Scanner->>Scanner: filter JSON files

    loop For each config file
        Scanner->>+FS: readFile(configPath)
        FS-->>-Scanner: file content
        Scanner->>Scanner: JSON.parse()
        Scanner->>+Schema: validate(config)
        Schema-->>-Scanner: validation result
    end

    Scanner-->>-CLI: {valid: [], invalid: []}
    CLI->>+Selector: selectConfigs(configs)
    Selector-->>-CLI: selectedConfigs[]
```

### User Interface State Machine

```mermaid
stateDiagram-v2
    [*] --> Initializing
    Initializing --> Loading: Start Application
    Loading --> NoConfigs: No Configurations Found
    Loading --> HasConfigs: Configurations Available

    NoConfigs --> DirectLaunch: Launch Claude Directly
    DirectLaunch --> [*]: Process Started

    HasConfigs --> LoadingCache: Load Previous Selections
    LoadingCache --> TTYCheck: Cache Loaded/Skipped
    TTYCheck --> TUIMode: TTY Available
    TTYCheck --> ReadlineMode: No TTY

    TUIMode --> Selecting: Show Interface
    ReadlineMode --> Prompting: Show Text Menu

    Selecting --> Selecting: Navigate (↑/↓)
    Selecting --> Selecting: Toggle Selection (Space)
    Selecting --> Selecting: Select All (a)
    Selecting --> Selecting: Clear All (c)
    Selecting --> Previewing: Toggle Preview (p)
    Selecting --> ErrorViewing: View Invalid Configs (i)
    Selecting --> Confirming: Press Enter
    Selecting --> Cancelled: Press Q

    Previewing --> Selecting: Toggle Preview Off (p)
    ErrorViewing --> Selecting: Hide Errors (i)
    ErrorViewing --> ErrorExpanded: Toggle Details (e)
    ErrorExpanded --> ErrorViewing: Toggle Details (e)

    Prompting --> Validating: User Input
    Validating --> Prompting: Invalid Input
    Validating --> Confirming: Valid Selection

    Confirming --> SavingCache: Has Selections
    Confirming --> Selecting: No Selections (TUI)
    Confirming --> Prompting: No Selections (Readline)

    SavingCache --> Launching: Cache Saved/Skipped
    Launching --> [*]: Claude Started
    Cancelled --> [*]: User Exit
```

### TUI Component Interaction

```mermaid
graph TD
    subgraph "Main TUI Component"
        ConfigSelector[ConfigSelector<br/>Main Interface]
    end

    subgraph "State Management"
        State[React State<br/>- selectedIndices<br/>- currentIndex<br/>- showingPreview<br/>- showingInvalidConfigs<br/>- expandedInvalidConfigs]
    end

    subgraph "Child Components"
        Preview[ConfigPreview<br/>File Content Display]
        ErrorDisplay[ErrorDisplay<br/>Validation Errors]
    end

    subgraph "User Input"
        Keyboard[Keyboard Events<br/>↑/↓ Navigation<br/>Space: Toggle<br/>a: Select All<br/>c: Clear All<br/>p: Preview<br/>i: Invalid Configs<br/>e: Expand Errors<br/>Enter: Confirm<br/>q: Quit]
    end

    subgraph "External Data"
        Configs[Configuration Data<br/>- Valid configs<br/>- Invalid configs]
        Cache[Previous Selections<br/>- Cached config names]
    end

    ConfigSelector <--> State
    ConfigSelector --> Preview
    ConfigSelector --> ErrorDisplay
    Keyboard --> ConfigSelector
    Configs --> ConfigSelector
    Cache --> ConfigSelector
    State --> Preview
    State --> ErrorDisplay

    style ConfigSelector fill:#e8f5e8
    style State fill:#fff3e0
    style Preview fill:#f3e5f5
    style ErrorDisplay fill:#ffebee
    style Keyboard fill:#e1f5fe
    style Configs fill:#f1f8e9
    style Cache fill:#e1f5fe
```

## Process Management

### Claude Code Launch Process

```mermaid
sequenceDiagram
    participant User
    participant ccmcp as CCMCP Process
    participant Shell
    participant Claude as Claude Code

    User->>+ccmcp: ccmcp [args]
    ccmcp->>ccmcp: Discover & Select Configs
    ccmcp->>ccmcp: Build Claude Command

    Note over ccmcp: claude --mcp-config=config1.json --mcp-config=config2.json [user-args]

    ccmcp->>+Shell: spawn('sh', ['-c', 'exec claude ...'])
    Shell->>+Claude: exec syscall replaces shell
    ccmcp->>ccmcp: Setup exit/error handlers

    Note over ccmcp,Claude: ccmcp waits for Claude to exit

    Claude-->>User: Claude UI
    Claude->>Shell: Exit with code
    Shell-->>ccmcp: Exit event
    ccmcp->>ccmcp: Exit with same code
    ccmcp-->>-User: Process complete
```

### Process Exit Handling Flow

```mermaid
flowchart TD
    Start[CCMCP Running] --> Spawn[Spawn Claude Process]
    Spawn --> Listen[Listen for Process Events]
    Listen --> Event{Event Type?}

    Event -->|Exit| CheckSignal{Exit via Signal?}
    Event -->|Error| HandleError[Handle Launch Error]
    Event -->|None| Listen

    CheckSignal -->|Yes| KillSelf[Kill Self with Same Signal]
    CheckSignal -->|No| GetCode[Get Exit Code]

    GetCode --> ExitCode[Exit with Claude's Code]
    HandleError --> ExitOne[Exit with Code 1]
    KillSelf --> End([Process Ends])
    ExitCode --> End
    ExitOne --> End
```

## Cache Management

### Selection Cache Flow

```mermaid
sequenceDiagram
    participant CLI as CLI Entry Point
    participant Cache as Selection Cache
    participant FS as File System
    participant User

    CLI->>+Cache: getProjectDir()
    Cache->>Cache: Check if in Git repo
    Cache->>Cache: Handle worktrees
    Cache-->>-CLI: projectDir

    CLI->>+Cache: loadSelections(projectDir, configDir)
    Cache->>Cache: Generate cache key (SHA256)
    Cache->>+FS: readFile(cacheFile)
    FS-->>-Cache: cache JSON or error
    Cache->>Cache: Validate cache version
    Cache->>Cache: Verify paths match
    Cache-->>-CLI: Set<selectedNames>

    User->>CLI: Make selections
    CLI->>+Cache: saveSelections(projectDir, configDir, names)

    alt No selections
        Cache->>+FS: rm(cacheFile)
        FS-->>-Cache: file removed
    else Has selections
        Cache->>+FS: mkdir(cacheDir)
        FS-->>-Cache: directory exists
        Cache->>+FS: writeFile(cacheFile, JSON)
        FS-->>-Cache: file written
    end

    Cache-->>-CLI: saved
```

### Cleanup Process Flow

```mermaid
flowchart TD
    Start[Cleanup Command] --> Scan[Scan Cache Directory]
    Scan --> Check1[Check Stale Cache Entries]

    Check1 --> Stale{Found Stale?}
    Stale -->|Yes| Prompt1{--yes flag?}
    Stale -->|No| Check2[Check Invalid Server References]

    Prompt1 -->|Yes| Remove1[Remove Stale Entries]
    Prompt1 -->|No| Ask1[Prompt User]
    Ask1 -->|Confirmed| Remove1
    Ask1 -->|Declined| Check2
    Remove1 --> Check2

    Check2 --> Invalid{Found Invalid?}
    Invalid -->|Yes| Prompt2{--yes flag?}
    Invalid -->|No| Check3[Check Broken Symlinks]

    Prompt2 -->|Yes| Update[Update Cache Files]
    Prompt2 -->|No| Ask2[Prompt User]
    Ask2 -->|Confirmed| Update
    Ask2 -->|Declined| Check3
    Update --> Check3

    Check3 --> Broken{Found Broken?}
    Broken -->|Yes| Prompt3{--yes flag?}
    Broken -->|No| Summary[Generate Summary]

    Prompt3 -->|Yes| Remove3[Remove Symlinks]
    Prompt3 -->|No| Ask3[Prompt User]
    Ask3 -->|Confirmed| Remove3
    Ask3 -->|Declined| Summary
    Remove3 --> Summary

    Summary --> DryRun{--dry-run?}
    DryRun -->|Yes| Report[Report What Would Change]
    DryRun -->|No| Report[Report What Changed]
    Report --> End([Exit])

    style Remove1 fill:#ffcdd2
    style Update fill:#fff9c4
    style Remove3 fill:#ffcdd2
    style Report fill:#c8e6c9
```

## Error Handling Diagrams

### Error Classification and Recovery

```mermaid
flowchart TD
    Error[Error Occurs] --> Classify{Error Type}

    Classify -->|Parse Error| ParseError[JSON Parse Error<br/>- Syntax issues<br/>- Invalid format]
    Classify -->|Validation Error| ValidationError[Schema Validation Error<br/>- Missing fields<br/>- Invalid values]
    Classify -->|System Error| SystemError[System Error<br/>- File access<br/>- Permissions]
    Classify -->|User Error| UserError[User Input Error<br/>- Invalid arguments<br/>- Bad selections]

    ParseError --> Collect[Collect Error Details]
    ValidationError --> Collect
    SystemError --> Fatal{Fatal Error?}
    UserError --> Retry[Allow Retry]

    Fatal -->|Yes| Exit[Exit with Error]
    Fatal -->|No| Collect

    Collect --> Continue[Continue with Valid Items]
    Continue --> Display[Display Error Information]
    Display --> UserChoice{User Decision}

    UserChoice -->|Continue| Proceed[Proceed with Valid]
    UserChoice -->|Fix| UserFix[User Fixes Issues]
    UserChoice -->|Abort| Abort[User Aborts]

    Retry --> UserInput[Get User Input]
    UserInput --> Validate[Validate Input]
    Validate -->|Valid| Proceed
    Validate -->|Invalid| Retry

    UserFix --> Rescan[Rescan Configurations]
    Rescan --> Error

    style ParseError fill:#ffcdd2
    style ValidationError fill:#ffcdd2
    style SystemError fill:#f8bbd9
    style UserError fill:#fff9c4
    style Continue fill:#c8e6c9
    style Proceed fill:#c8e6c9
```

### Configuration Validation Pipeline

```mermaid
graph LR
    subgraph "File Processing"
        File[Config File] --> Read[Read File Content]
        Read --> Parse[JSON Parse]
        Parse --> Validate[Schema Validation]
    end

    subgraph "Error Paths"
        ReadError[File Read Error] --> Invalid[Mark as Invalid]
        ParseError[Parse Error] --> Invalid
        ValidationError[Validation Error] --> Invalid
    end

    subgraph "Success Path"
        Validate --> Valid[Mark as Valid]
        Valid --> Extract[Extract Metadata]
        Extract --> Display[Generate Display Name]
    end

    subgraph "Results"
        Invalid --> InvalidList[Invalid Configurations]
        Display --> ValidList[Valid Configurations]
    end

    Read -.-> ReadError
    Parse -.-> ParseError
    Validate -.-> ValidationError

    style File fill:#e3f2fd
    style Valid fill:#c8e6c9
    style Invalid fill:#ffcdd2
    style ValidList fill:#c8e6c9
    style InvalidList fill:#ffcdd2
```

## User Experience Flow

### Complete User Journey

```mermaid
journey
    title User Experience Journey
    section Discovery
      User runs ccmcp: 5: User
      Arguments parsed: 3: System
      Config directory scanned: 3: System
      Configurations validated: 3: System
      Previous selections loaded: 4: System

    section Selection (TUI Mode)
      Interface loads: 4: System
      Previous selections pre-selected: 5: System
      User navigates configs: 5: User
      User toggles selections: 5: User
      User views preview: 4: User
      User checks invalid configs: 3: User
      User confirms selection: 5: User

    section Selection (Readline Mode)
      Text menu displays: 3: System
      Previous selections indicated: 4: System
      User enters numbers: 4: User
      Selection validated: 3: System
      User confirms choice: 4: User

    section Launch
      Selections saved to cache: 4: System
      Claude command built: 5: System
      Claude Code starts: 5: User
      ccmcp exits: 3: System
```

### Interface Adaptation Flow

```mermaid
flowchart TD
    Start[Application Start] --> Check[Check Terminal Capabilities]
    Check --> TTY{TTY Available?}

    TTY -->|Yes| CheckCI{CI Environment?}
    TTY -->|No| Readline[Use Readline Interface]

    CheckCI -->|Yes| Readline
    CheckCI -->|No| CheckSize[Check Terminal Size]

    CheckSize --> Size{Size Adequate?}
    Size -->|Yes| TUI[Use TUI Interface]
    Size -->|No| TUISimple[Use Simplified TUI]

    TUI --> Render[Render Full Interface]
    TUISimple --> RenderSimple[Render Basic Interface]
    Readline --> RenderText[Render Text Interface]

    Render --> Responsive[Responsive Layout]
    RenderSimple --> Responsive
    RenderText --> Interact[Text Interaction]

    Responsive --> Monitor[Monitor Size Changes]
    Monitor --> Adapt{Size Changed?}
    Adapt -->|Yes| Rerender[Re-render Interface]
    Adapt -->|No| Monitor
    Rerender --> Responsive

    Interact --> Complete[User Completes Selection]
    Responsive --> Complete
    Complete --> End[Launch Claude]

    style TUI fill:#e8f5e8
    style TUISimple fill:#fff3e0
    style Readline fill:#f3e5f5
```

## Security Architecture

### Input Validation and Sanitization Flow

```mermaid
flowchart TD
    Input[User Input] --> Type{Input Type}

    Type -->|CLI Args| ValidateArgs[Validate Arguments]
    Type -->|File Path| ValidatePath[Validate File Path]
    Type -->|Config Data| ValidateConfig[Validate Configuration]
    Type -->|User Selection| ValidateSelection[Validate Selection]

    ValidateArgs --> SanitizeArgs[Sanitize Arguments]
    ValidatePath --> SanitizePath[Sanitize Path]
    ValidateConfig --> SchemaValidation[Schema Validation]
    ValidateSelection --> RangeCheck[Range Check]

    SanitizeArgs --> Safe1[Safe Arguments]
    SanitizePath --> Traversal{Path Traversal?}
    SchemaValidation --> SchemaResult{Valid Schema?}
    RangeCheck --> RangeResult{Valid Range?}

    Traversal -->|Yes| Reject1[Reject Path]
    Traversal -->|No| Safe2[Safe Path]

    SchemaResult -->|No| Reject2[Reject Config]
    SchemaResult -->|Yes| Safe3[Safe Config]

    RangeResult -->|No| Reject3[Request Re-input]
    RangeResult -->|Yes| Safe4[Safe Selection]

    Safe1 --> Process[Process Input]
    Safe2 --> Process
    Safe3 --> Process
    Safe4 --> Process

    Reject1 --> Error[Security Error]
    Reject2 --> Collect[Collect Error]
    Reject3 --> Retry[Retry Input]

    style Safe1 fill:#c8e6c9
    style Safe2 fill:#c8e6c9
    style Safe3 fill:#c8e6c9
    style Safe4 fill:#c8e6c9
    style Reject1 fill:#ffcdd2
    style Reject2 fill:#ffcdd2
    style Error fill:#f8bbd9
```

## Summary

These visual diagrams provide a complete understanding of the ccmcp application's architecture, data flow, user interactions, and technical implementation. They document the following key features:

### Core Features

- **Configuration Discovery & Validation**: Automatic scanning and Zod-based validation of MCP server configurations
- **Interactive Selection**: Both TUI (Ink-based) and readline fallback interfaces
- **Selection Caching**: Persistent storage of user preferences per project/config-dir combination
- **Cache Maintenance**: Cleanup command to remove stale entries, invalid references, and broken symlinks
- **Process Management**: Seamless handoff to Claude Code with proper signal handling

### Key Components

- **CLI Layer**: Argument parsing, command routing, and main application flow
- **Application Core**: Scanner, selector, launcher, cache, cleanup, and utilities
- **Validation Layer**: Zod schemas for stdio, HTTP, and SSE server configurations
- **TUI Layer**: React-based components with preview and error display capabilities
- **External Systems**: File system, cache directory, and Claude Code process

### User Workflows

1. **Standard Selection**: Scan → Load Cache → Select → Save Cache → Launch
2. **Cleanup Workflow**: Scan Cache → Identify Issues → Prompt User → Clean → Report
3. **Cache Management**: Ignore cache (`-i`), skip saving (`-n`), or clear all (`--clear-cache`)

These diagrams serve as both documentation and implementation guides for understanding and maintaining the system.
