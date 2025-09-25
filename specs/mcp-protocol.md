# MCP Protocol Specification

This document provides the complete specification for MCP (Model Context Protocol) configuration format, validation schemas, and server transport types supported by ccmcp.

## Overview

MCP configurations define how Claude Code connects to and communicates with external MCP servers. The ccmcp tool supports multiple transport types and provides comprehensive validation to ensure configurations are correct before launching Claude Code.

## Configuration File Format

### Basic Structure

MCP configuration files are JSON documents with the following top-level structure:

```json
{
  "mcpServers": {
    "server-name": {
      // Server configuration object
    }
  },
  "description": "Optional human-readable description"
}
```

### Core Schema Elements

#### Root Configuration Object

```typescript
interface MCPConfiguration {
  mcpServers: Record<string, MCPServerConfig>;
  description?: string;
}
```

- `mcpServers`: Object where keys are server names and values are server configurations
- `description`: Optional description for the configuration file (used in UI display)

#### Server Configuration Base

```typescript
interface MCPServerConfigBase {
  type?: "stdio" | "http" | "sse";
  env?: Record<string, string>;
}
```

- `type`: Transport type (optional, defaults to 'stdio' for legacy compatibility)
- `env`: Environment variables to pass to the server process (all values must be strings)

## Transport Types

### 1. STDIO Transport

**Purpose**: Communication with command-line executable MCP servers through standard input/output.

**Configuration Schema**:

```typescript
interface STDIOServerConfig extends MCPServerConfigBase {
  type: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
}
```

**Example Configuration**:

```json
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/path/to/directory"
      ],
      "env": {
        "DEBUG": "mcp:*"
      }
    }
  }
}
```

**Validation Rules**:

- `command` must be a non-empty string
- `args` is optional array of strings
- `env` values must all be strings (not numbers or booleans)
- Command must be executable (validation occurs at runtime)

### 2. HTTP Transport

**Purpose**: Communication with HTTP-based MCP servers via REST API.

**Configuration Schema**:

```typescript
interface HTTPServerConfig extends MCPServerConfigBase {
  type: "http";
  url: string;
  headers?: Record<string, string>;
  env?: Record<string, string>;
}
```

**Example Configuration**:

```json
{
  "mcpServers": {
    "weather-api": {
      "type": "http",
      "url": "https://api.weather.com/mcp",
      "headers": {
        "Authorization": "Bearer token123",
        "User-Agent": "ccmcp/1.0"
      },
      "env": {
        "API_TIMEOUT": "30"
      }
    }
  }
}
```

**Validation Rules**:

- `url` must be a valid HTTP/HTTPS URL
- `headers` is optional object with string keys and values
- URL must use http:// or https:// scheme
- Port numbers are allowed (e.g., http://localhost:3000/mcp)

### 3. Server-Sent Events (SSE) Transport

**Purpose**: Real-time communication with MCP servers using Server-Sent Events.

**Configuration Schema**:

```typescript
interface SSEServerConfig extends MCPServerConfigBase {
  type: "sse";
  url: string;
  headers?: Record<string, string>;
  env?: Record<string, string>;
}
```

**Example Configuration**:

```json
{
  "mcpServers": {
    "live-data": {
      "type": "sse",
      "url": "https://streaming.example.com/mcp/events",
      "headers": {
        "Accept": "text/event-stream",
        "Authorization": "Bearer live-token"
      }
    }
  }
}
```

**Validation Rules**:

- Same as HTTP transport (uses identical schema)
- URL must support Server-Sent Events protocol
- Typically requires `Accept: text/event-stream` header

### 4. Legacy Format Support

**Purpose**: Backward compatibility with older MCP configurations that don't specify a transport type.

**Configuration Schema**:

```typescript
interface LegacyServerConfig extends MCPServerConfigBase {
  // type field is omitted or undefined
  command: string;
  args?: string[];
  env?: Record<string, string>;
}
```

**Example Configuration**:

```json
{
  "mcpServers": {
    "old-server": {
      "command": "node",
      "args": ["server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Auto-Detection Logic**:

- If `type` field is missing and `command` field exists → STDIO transport
- If `type` field is missing and `url` field exists → HTTP transport
- Legacy configurations are automatically upgraded during validation

## Validation Schema Implementation

### Zod Schema Structure

The validation is implemented using Zod with discriminated unions for type safety:

```typescript
import { z } from "zod";

// Base schema for all server types
const baseServerSchema = z.object({
  type: z.enum(["stdio", "http", "sse"]).optional(),
  env: z.record(z.string()).optional(),
});

// STDIO server schema
const stdioServerSchema = baseServerSchema.extend({
  type: z.literal("stdio").optional().default("stdio"),
  command: z.string().min(1, "Command cannot be empty"),
  args: z.array(z.string()).optional(),
});

// HTTP server schema
const httpServerSchema = baseServerSchema.extend({
  type: z.literal("http"),
  url: z.string().url("Must be a valid URL"),
  headers: z.record(z.string()).optional(),
});

// SSE server schema (identical to HTTP)
const sseServerSchema = baseServerSchema.extend({
  type: z.literal("sse"),
  url: z.string().url("Must be a valid URL"),
  headers: z.record(z.string()).optional(),
});

// Legacy server schema (for backward compatibility)
const legacyServerSchema = z.object({
  command: z.string().min(1, "Command cannot be empty"),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
});

// Discriminated union for server configurations
const serverConfigSchema = z
  .discriminatedUnion("type", [
    stdioServerSchema,
    httpServerSchema,
    sseServerSchema,
  ])
  .or(legacyServerSchema); // Allow legacy format

// Main configuration schema
export const mcpConfigSchema = z.object({
  mcpServers: z.record(serverConfigSchema),
  description: z.string().optional(),
});

export type MCPConfig = z.infer<typeof mcpConfigSchema>;
```

### Validation Process

#### 1. File Parsing

```typescript
try {
  const fileContent = await readFile(configPath, "utf-8");
  const rawConfig = JSON.parse(fileContent);
} catch (error) {
  // Handle JSON parse errors
  return { type: "parse-error", message: error.message };
}
```

#### 2. Schema Validation

```typescript
try {
  const validatedConfig = mcpConfigSchema.parse(rawConfig);
  return { type: "valid", config: validatedConfig };
} catch (error) {
  if (error instanceof z.ZodError) {
    return {
      type: "validation-error",
      errors: error.errors.map(formatZodError),
    };
  }
  throw error;
}
```

#### 3. Error Formatting

```typescript
function formatZodError(error: z.ZodIssue): string {
  const path = error.path.join(".");
  return `${path}: ${error.message}`;
}
```

### Common Validation Errors

#### Schema Validation Errors

- **Missing required fields**: `mcpServers.server-name.command: Required`
- **Invalid URL format**: `mcpServers.api.url: Invalid url`
- **Invalid type**: `mcpServers.server.type: Invalid enum value`
- **Empty command**: `mcpServers.cli.command: Command cannot be empty`
- **Invalid env values**: `mcpServers.test.env.PORT: Expected string, received number`

#### JSON Parse Errors

- **Syntax errors**: `Unexpected token } in JSON at position 45`
- **Missing quotes**: `Expected property name or '}' in JSON`
- **Trailing commas**: `Trailing comma in object at position 123`

## Configuration Discovery

### File Location Strategy

1. **Command Line Argument**: `--config-dir /path/to/configs`
2. **Environment Variable**: `CCMCP_CONFIG_DIR=/path/to/configs`
3. **Default Location**: `~/.claude/mcp-configs`

### File Scanning Process

```typescript
async function scanForConfigs(configDir: string): Promise<string[]> {
  // 1. Check if directory exists
  if (!(await exists(configDir))) {
    return [];
  }

  // 2. Read directory contents (top-level only)
  const files = await readdir(configDir);

  // 3. Filter for JSON files (exclude hidden files)
  return files
    .filter((file) => file.endsWith(".json"))
    .filter((file) => !file.startsWith("."))
    .map((file) => path.join(configDir, file));
}
```

### Parallel Validation

For performance, multiple configuration files are validated in parallel:

```typescript
async function validateConfigs(
  configPaths: string[],
): Promise<ValidationResult[]> {
  const validationPromises = configPaths.map(async (path) => {
    try {
      const content = await readFile(path, "utf-8");
      const parsed = JSON.parse(content);
      const validated = mcpConfigSchema.parse(parsed);

      return {
        path,
        status: "valid" as const,
        config: validated,
        displayName: generateDisplayName(path, validated),
      };
    } catch (error) {
      return {
        path,
        status: "invalid" as const,
        error: formatError(error),
        displayName: path.basename(path, ".json"),
      };
    }
  });

  return Promise.all(validationPromises);
}
```

## Configuration Examples

### Complete Multi-Server Configuration

```json
{
  "description": "Development environment MCP servers",
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
      "env": {
        "DEBUG": "mcp:filesystem:*"
      }
    },
    "database": {
      "type": "stdio",
      "command": "./bin/db-mcp-server",
      "args": ["--database", "postgres://localhost/dev"],
      "env": {
        "DB_POOL_SIZE": "10",
        "LOG_LEVEL": "info"
      }
    },
    "weather-api": {
      "type": "http",
      "url": "https://api.openweathermap.org/mcp/v1",
      "headers": {
        "Authorization": "Bearer ${WEATHER_API_KEY}",
        "User-Agent": "MyApp/1.0"
      }
    },
    "live-updates": {
      "type": "sse",
      "url": "https://updates.example.com/stream",
      "headers": {
        "Accept": "text/event-stream",
        "Authorization": "Bearer ${UPDATE_TOKEN}"
      },
      "env": {
        "RECONNECT_TIMEOUT": "5000"
      }
    }
  }
}
```

### Minimal Configuration

```json
{
  "mcpServers": {
    "simple": {
      "command": "mcp-server"
    }
  }
}
```

### Legacy Format Example

```json
{
  "mcpServers": {
    "legacy-server": {
      "command": "node",
      "args": ["legacy-server.js", "--port", "3000"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

## Error Handling and Recovery

### Graceful Degradation

- **Partial Failures**: Valid configurations are used even if some fail validation
- **Missing Files**: Configurations that can't be read are marked as invalid but don't stop the process
- **Invalid JSON**: Parse errors are collected and displayed to the user with actionable feedback

### Error Display

Invalid configurations are shown to users with:

- **File path**: Clear identification of problematic files
- **Error type**: Distinguish between parse and validation errors
- **Specific messages**: Exact field and validation rule that failed
- **Line numbers**: When possible, indicate location of JSON syntax errors

### User Guidance

Error messages include suggestions for common fixes:

- "Check JSON syntax" for parse errors
- "Ensure all env values are strings" for type errors
- "Verify URL format" for HTTP/SSE configuration errors
- "Check command exists and is executable" for STDIO errors

## Security Considerations

### Input Sanitization

- **Path Validation**: Configuration file paths are sanitized to prevent directory traversal
- **Command Injection**: Command and argument values are validated but not executed during scanning
- **Environment Variables**: Only string values are allowed to prevent injection attacks

### Validation Scope

- **Schema Only**: Validation focuses on format correctness, not runtime security
- **No Execution**: Commands are not executed during validation phase
- **Read-Only Access**: Configuration scanning requires only read permissions

This specification provides complete implementation guidance for MCP configuration handling, validation, and error recovery in the ccmcp application.
