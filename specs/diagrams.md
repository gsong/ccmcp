# Visual Architecture Diagrams

This document contains comprehensive visual diagrams created with Mermaid to illustrate the ccmcp application's architecture, data flow, component interactions, and user experience.

## Application Flow Overview

### High-Level Application Flow

```mermaid
flowchart TD
    Start([User runs ccmcp]) --> Args[Parse CLI Arguments]
    Args --> Help{Help or Version?}
    Help -->|Yes| ShowHelp[Display Help/Version] --> Exit1([Exit])
    Help -->|No| ConfigDir[Resolve Config Directory]

    ConfigDir --> Scan[Scan for MCP Configurations]
    Scan --> Found{Configurations Found?}
    Found -->|No| DirectLaunch[Launch Claude Directly] --> Exit2([Exit])

    Found -->|Yes| Validate[Validate Configurations]
    Validate --> HasValid{Valid Configs Exist?}
    HasValid -->|No| ShowErrors[Show All Invalid] --> AskLaunch{Launch Anyway?}
    AskLaunch -->|No| Exit3([Exit])
    AskLaunch -->|Yes| DirectLaunch

    HasValid -->|Yes| DetectTTY{TTY Available?}
    DetectTTY -->|Yes| TUI[Show TUI Interface]
    DetectTTY -->|No| Readline[Show Readline Interface]

    TUI --> Selected{Configs Selected?}
    Readline --> Selected
    Selected -->|No| Exit4([User Cancelled])
    Selected -->|Yes| Launch[Launch Claude with Configs]
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
        Claude[Claude Code Process]
    end

    CLI --> Scanner
    CLI --> Selector
    CLI --> Launcher

    Scanner --> Schema
    Scanner --> FileSystem
    Scanner --> Utils

    Selector --> ConfigSelector
    Selector --> Utils

    ConfigSelector --> ConfigPreview
    ConfigSelector --> ErrorDisplay

    Launcher --> Claude
    Launcher --> Utils

    style CLI fill:#e1f5fe
    style Scanner fill:#f3e5f5
    style Selector fill:#f3e5f5
    style Launcher fill:#f3e5f5
    style Schema fill:#fff3e0
    style ConfigSelector fill:#e8f5e8
    style FileSystem fill:#ffebee
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

    HasConfigs --> TTYCheck: Check Terminal Capability
    TTYCheck --> TUIMode: TTY Available
    TTYCheck --> ReadlineMode: No TTY

    TUIMode --> Selecting: Show Interface
    ReadlineMode --> Prompting: Show Text Menu

    Selecting --> Selecting: Navigate/Toggle
    Selecting --> Previewing: Toggle Preview
    Selecting --> ErrorViewing: View Invalid Configs
    Selecting --> Confirming: Press Enter
    Selecting --> Cancelled: Press Q

    Previewing --> Selecting: Toggle Preview Off
    ErrorViewing --> Selecting: Hide Errors

    Prompting --> Validating: User Input
    Validating --> Prompting: Invalid Input
    Validating --> Confirming: Valid Selection

    Confirming --> Launching: Has Selections
    Confirming --> Selecting: No Selections (TUI)
    Confirming --> Prompting: No Selections (Readline)

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
        State[React State<br/>- selectedConfigs<br/>- currentIndex<br/>- showPreview<br/>- showInvalid]
    end

    subgraph "Child Components"
        Preview[ConfigPreview<br/>File Content Display]
        ErrorDisplay[ErrorDisplay<br/>Validation Errors]
    end

    subgraph "User Input"
        Keyboard[Keyboard Events<br/>- Navigation<br/>- Selection<br/>- Actions]
    end

    subgraph "External Data"
        Configs[Configuration Data<br/>- Valid configs<br/>- Invalid configs]
    end

    ConfigSelector <--> State
    ConfigSelector --> Preview
    ConfigSelector --> ErrorDisplay
    Keyboard --> ConfigSelector
    Configs --> ConfigSelector
    State --> Preview
    State --> ErrorDisplay

    style ConfigSelector fill:#e8f5e8
    style State fill:#fff3e0
    style Preview fill:#f3e5f5
    style ErrorDisplay fill:#ffebee
    style Keyboard fill:#e1f5fe
    style Configs fill:#f1f8e9
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

    ccmcp->>+Shell: exec(claude command)
    Shell->>+Claude: spawn process
    ccmcp->>ccmcp: Setup signal handlers
    Shell-->>-ccmcp: Process replaced
    Note over ccmcp: ccmcp process ends
    Claude-->>User: Claude UI
```

### Signal Handling Flow

```mermaid
flowchart TD
    Start[CCMCP Running] --> Listen[Listen for Signals]
    Listen --> Signal{Signal Received?}
    Signal -->|SIGINT| Interrupt[Handle SIGINT]
    Signal -->|SIGTERM| Terminate[Handle SIGTERM]
    Signal -->|Other| Other[Other Signal]
    Signal -->|None| Listen

    Interrupt --> HasChild{Has Child Process?}
    Terminate --> HasChild
    Other --> HasChild

    HasChild -->|Yes| ForwardSignal[Forward Signal to Child]
    HasChild -->|No| Cleanup[Cleanup Resources]

    ForwardSignal --> WaitChild[Wait for Child Exit]
    WaitChild --> GetExit[Get Child Exit Code]
    GetExit --> Cleanup

    Cleanup --> Exit[Exit with Code]
    Exit --> End([Process Ends])
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

    section Selection (TUI Mode)
      Interface loads: 4: System
      User navigates configs: 5: User
      User toggles selections: 5: User
      User views preview: 4: User
      User confirms selection: 5: User

    section Selection (Readline Mode)
      Text menu displays: 3: System
      User enters numbers: 4: User
      Selection validated: 3: System
      User confirms choice: 4: User

    section Launch
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

These visual diagrams provide a complete understanding of the ccmcp application's architecture, data flow, user interactions, and technical implementation. They serve as both documentation and implementation guides for recreating the system.
