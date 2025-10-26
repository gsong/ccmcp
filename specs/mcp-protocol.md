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
  mcpServers?: Record<string, MCPServerConfig>;
  description?: string;
}
```

- `mcpServers`: Object where keys are server names and values are server configurations (optional, defaults to empty object `{}`)
- `description`: Optional description for the configuration file (used in UI display)

**Important**: A configuration file with only a `description` field (no `mcpServers`) is considered valid and will have an empty server list.

#### Server Configuration Base

```typescript
interface MCPServerConfigBase {
  type?: "stdio" | "http" | "sse";
  env?: Record<string, string>;
}
```

- `type`: Transport type (optional, defaults to 'stdio' for legacy compatibility)
- `env`: Environment variables to pass to the server process (all values must be strings)

**Note**: Environment variable values are strictly validated as strings. Numbers and booleans must be converted to strings (e.g., `"123"`, `"true"`).

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
- `args` is optional array of strings (defaults to empty array `[]`)
- `env` values must all be strings (not numbers or booleans)
- Command must be executable (validation occurs at runtime)

**Default Values**:

- If `args` is not provided, it defaults to an empty array `[]`

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

The validation is implemented using Zod with a flexible base schema and runtime validation:

```typescript
import { z } from "zod";

// Base server schema that handles all transport types
const BaseServerSchema = z.object({
  type: z.enum(["stdio", "http", "sse"]).optional(),
  command: z.string().optional(),
  args: z.array(z.string()).default([]).optional(),
  env: z.record(z.string(), z.string()).optional(),
  url: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

// Server schema with conditional validation and transformation
const ServerSchema = BaseServerSchema.superRefine((data, ctx) => {
  // If no type is specified, assume stdio (legacy format)
  const serverType = data.type || "stdio";

  if (serverType === "stdio") {
    // Validate stdio server requirements
    if (data.command === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.invalid_type,
        expected: "string",
        received: "undefined",
        path: ["command"],
        message: "Invalid input: expected string, received undefined",
      });
    } else if (data.command === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 1,
        type: "string",
        inclusive: true,
        path: ["command"],
        message: "Command cannot be empty",
      });
    }
  } else if (serverType === "http" || serverType === "sse") {
    // Validate HTTP/SSE server requirements
    if (!data.url) {
      ctx.addIssue({
        code: z.ZodIssueCode.invalid_type,
        expected: "string",
        received: "undefined",
        path: ["url"],
        message: "Invalid input: expected string, received undefined",
      });
    } else if (!z.string().url().safeParse(data.url).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["url"],
        message: "Must be a valid URL",
      });
    }
  }
}).transform((data) => {
  // Transform to explicit format, ensuring type is always present
  const serverType = data.type || "stdio";
  return {
    ...data,
    type: serverType,
    args: data.args || [],
  };
});

// Main configuration schema
export const McpConfigSchema = z.object({
  mcpServers: z.record(z.string(), ServerSchema).optional().default({}),
  description: z.string().optional(),
});

export type McpConfigType = z.infer<typeof McpConfigSchema>;
export type ServerConfig = z.infer<typeof ServerSchema>;
```

### Validation Result Types

```typescript
export interface ValidationResult {
  success: boolean;
  data?: McpConfigType;
  errors?: ValidationError[];
}

export interface ValidationError {
  path: string[];
  message: string;
  code: string;
}
```

### Validation Process

#### 1. File Parsing

```typescript
try {
  const fileContent = await readFile(configPath, "utf-8");
  const rawConfig = JSON.parse(fileContent);
} catch (error) {
  // Handle JSON parse errors
  if (error instanceof SyntaxError) {
    return `JSON syntax error: ${error.message}`;
  }
  throw error;
}
```

#### 2. Schema Validation

```typescript
// Utility function to validate MCP configuration
export function validateMcpConfig(data: unknown): ValidationResult {
  const result = McpConfigSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  const errors: ValidationError[] = result.error.issues.map((issue) => ({
    path: issue.path.map(String),
    message: issue.message,
    code: issue.code,
  }));

  return {
    success: false,
    errors,
  };
}
```

#### 3. Error Formatting

```typescript
// Utility function to format validation errors into human-readable messages
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return "Unknown validation error";

  const messages = errors.map((error) => {
    const pathStr = error.path.length > 0 ? `at ${error.path.join(".")}: ` : "";
    return `${pathStr}${error.message}`;
  });

  if (messages.length === 1 && messages[0]) {
    return messages[0];
  }

  return `Multiple validation errors:\n${messages.map((msg) => `  - ${msg}`).join("\n")}`;
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

### Scanned Configuration Structure

The scanner returns an array of `McpConfig` objects with the following structure:

```typescript
export interface McpConfig {
  name: string; // Filename without .json extension
  path: string; // Full absolute path to the config file
  description?: string; // Human-readable display name
  valid: boolean; // Whether the config passed validation
  error?: string; // Error message if validation failed
}
```

**Field Details**:

- `name`: The base filename without extension (e.g., `"my-config"` for `my-config.json`)
- `path`: Absolute filesystem path to the configuration file
- `description`: For valid configs, this is the formatted display name (see Display Name Formatting). For invalid configs, this is `"Invalid config: {name}"`
- `valid`: `true` if the file parsed and validated successfully, `false` otherwise
- `error`: Only present when `valid` is `false`. Contains detailed error message

### File Scanning Process

```typescript
export async function scanMcpConfigs(configDir?: string): Promise<McpConfig[]> {
  const resolvedConfigDir =
    configDir || join(homedir(), ".claude", "mcp-configs");

  try {
    await stat(resolvedConfigDir);
  } catch (error: unknown) {
    // Check if it's specifically a "not found" error (ENOENT)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      throw new MissingConfigDirectoryError(resolvedConfigDir);
    }
    // For other stat errors, re-throw the original error
    throw error;
  }

  try {
    const files = await readdir(resolvedConfigDir);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    // Process files in parallel for better performance
    const configs = await Promise.all(
      jsonFiles.map(async (file): Promise<McpConfig> => {
        const filePath = join(resolvedConfigDir, file);
        const name = file.replace(".json", "");

        try {
          const content = await readFile(filePath, "utf-8");
          const parsed = JSON.parse(content);

          // Schema-based validation using Zod
          const validationResult = validateMcpConfig(parsed);

          if (validationResult.success && validationResult.data) {
            // Extract server names from the validated config
            const servers = extractServers(validationResult.data);
            const serverNames = Object.keys(servers);

            // Generate display name using format
            const displayName = formatConfigDisplayName(file, serverNames);

            return {
              name,
              path: filePath,
              description: displayName,
              valid: true,
            };
          } else {
            return {
              name,
              path: filePath,
              description: `Invalid config: ${name}`,
              valid: false,
              error: formatValidationErrors(validationResult.errors || []),
            };
          }
        } catch (error: unknown) {
          // Handle JSON parse errors separately from validation errors
          const errorMessage =
            error instanceof SyntaxError
              ? `JSON syntax error: ${error.message}`
              : formatErrorMessage(error);

          return {
            name,
            path: filePath,
            description: `Invalid config: ${name}`,
            valid: false,
            error: errorMessage,
          };
        }
      }),
    );

    return configs.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error: unknown) {
    console.warn(`Failed to scan MCP configs: ${formatErrorMessage(error)}`);
    return [];
  }
}
```

**Key Behaviors**:

- All `.json` files in the config directory are processed (hidden files starting with `.` are not filtered out by this implementation)
- Files are processed in parallel using `Promise.all()` for performance
- Results are sorted alphabetically by the `name` field (filename without extension) using `localeCompare()`
- Invalid configurations are included in the results with `valid: false` and an `error` field
- If the directory read fails (after the directory exists), an empty array is returned with a warning logged

### Display Name Formatting

Configuration files are displayed with intelligent naming based on their content:

```typescript
export function formatConfigDisplayName(
  filename: string,
  serverNames: string[],
): string {
  // Remove .json extension from filename for display
  const baseFilename = filename.replace(/\.json$/i, "");

  if (serverNames.length === 0) {
    return baseFilename;
  }

  if (serverNames.length === 1 && serverNames[0] === baseFilename) {
    // Single server matching filename - show only server name
    return serverNames[0];
  }

  if (serverNames.length === 1) {
    // Single server not matching filename - show filename → server-name
    return `${baseFilename} → ${serverNames[0]}`;
  }

  // Multiple servers - show filename → server1, server2, ...
  return `${baseFilename} → ${serverNames.join(", ")}`;
}
```

**Display Name Examples**:

- File: `test-server.json` with server `test-server` → displays as `test-server`
- File: `config.json` with server `different-server` → displays as `config → different-server`
- File: `multiple.json` with servers `alpha-server`, `beta-server`, `gamma-server` → displays as `multiple → alpha-server, beta-server, gamma-server`
- File: `empty.json` with no servers → displays as `empty`

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

### Custom Error Types

#### MissingConfigDirectoryError

A specialized error thrown when the configuration directory does not exist:

```typescript
export class MissingConfigDirectoryError extends Error {
  readonly directoryPath: string;

  constructor(directoryPath: string) {
    super(`Config directory not found: ${directoryPath}`);
    this.directoryPath = directoryPath;
    this.name = "MissingConfigDirectoryError";
  }
}
```

**Behavior**:

- Thrown when the specified config directory is not found (ENOENT error)
- Contains the path to the missing directory for easy debugging
- Different from other filesystem errors (permissions, etc.) which are re-thrown

### Graceful Degradation

- **Partial Failures**: Valid configurations are used even if some fail validation
- **Missing Files**: Configurations that can't be read are marked as invalid but don't stop the process
- **Invalid JSON**: Parse errors are collected and displayed to the user with actionable feedback
- **Missing Directory**: Throws `MissingConfigDirectoryError` immediately (not gracefully handled)

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
