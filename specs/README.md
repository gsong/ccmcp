# CCMCP Specification Documents

This directory contains comprehensive specification documents for the **ccmcp** (Claude Code MCP Selector) project. These specifications are designed to provide complete technical documentation that would allow someone to recreate this entire application from scratch.

## Project Overview

**ccmcp** (Claude Code MCP Selector) is a CLI tool that intelligently discovers, validates, and selects MCP (Model Context Protocol) server configurations for Claude Code. It provides both a modern terminal user interface (TUI) and fallback text-based interface for selecting which MCP servers to activate when launching Claude Code.

### Core Functionality

- **Discovery**: Scans for MCP configuration files in specified directories
- **Validation**: Uses comprehensive schema validation for configuration files
- **Selection**: Interactive multi-select interface for choosing configurations
- **Launch**: Spawns Claude Code with only selected MCP server configurations
- **Cache Management**: Remembers selections per project for faster launches
- **Cleanup**: Removes stale cache entries and broken symlinks
- **Git Worktree Support**: Shares selections across worktrees of the same repository

## Specification Documents

### [Architecture](./architecture.md)

System architecture, design patterns, and high-level component overview with visual diagrams.

### [Components](./components.md)

Detailed specifications for all modules and components, including interfaces, responsibilities, and implementation contracts.

### [MCP Protocol](./mcp-protocol.md)

Complete specification of MCP configuration format, validation schemas, and server transport types.

### [User Interface](./user-interface.md)

Terminal interface specifications, interaction flows, keyboard shortcuts, and user experience requirements.

### [Implementation](./implementation.md)

Technical implementation details including build system, dependencies, testing strategy, and development workflow.

### [Diagrams](./diagrams.md)

Visual architecture diagrams created with Mermaid to illustrate application flow, component interactions, and system design.

## Document Purpose

Each specification document includes:

- **Complete technical specifications** sufficient for implementation
- **Design rationale** explaining architectural decisions
- **Interface contracts** defining component interactions
- **Implementation examples** with code snippets where relevant
- **Cross-references** to related specifications
- **Visual diagrams** for complex systems

## Technology Stack

- **Runtime**: Node.js 18+ with ES Modules
- **Language**: TypeScript with strict type checking
- **UI Framework**: React 19+ and Ink 6+ for terminal interfaces
- **Validation**: Zod 4+ for runtime schema validation
- **Build Tools**: tsup for bundling, Biome for linting, Prettier for formatting
- **Testing**: Vitest 4+ with ink-testing-library
- **Package Manager**: pnpm

## Getting Started

1. Start with [Architecture](./architecture.md) for system overview
2. Review [Components](./components.md) for detailed module specifications
3. Study [MCP Protocol](./mcp-protocol.md) for configuration format
4. Examine [User Interface](./user-interface.md) for interaction design
5. Consult [Implementation](./implementation.md) for technical setup
6. Reference [Diagrams](./diagrams.md) for visual understanding

## Specification Completeness

These specifications are designed to be **implementation-complete**, meaning:

- All core functionality is documented
- All interfaces and data structures are specified
- All user interactions are defined
- All error conditions are handled
- All dependencies and requirements are listed
- All build and development processes are documented

With these specifications, a developer should be able to recreate the ccmcp application with identical functionality and behavior.
