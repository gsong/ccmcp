import { z } from "zod";

// STDIO transport server schema
const StdioServerSchema = z.object({
  type: z.literal("stdio"),
  command: z.string().min(1, "Command cannot be empty"),
  args: z.array(z.string()).default([]),
  env: z.record(z.string(), z.string()).optional(),
});

// Legacy STDIO server schema (without explicit type, defaults to stdio)
const LegacyStdioServerSchema = z.object({
  command: z.string().min(1, "Command cannot be empty"),
  args: z.array(z.string()).default([]),
  env: z.record(z.string(), z.string()).optional(),
});

// HTTP transport server schema
const HttpServerSchema = z.object({
  type: z.literal("http"),
  url: z.string().url("Must be a valid URL"),
  headers: z.record(z.string(), z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
});

// SSE transport server schema
const SseServerSchema = z.object({
  type: z.literal("sse"),
  url: z.string().url("Must be a valid URL"),
  headers: z.record(z.string(), z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
});

// Base server schema that handles both explicit and legacy formats
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
        origin: "string",
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

// Note: Using inline schema definition instead of separate variable to avoid unused variable warning

// Main MCP configuration schema
export const McpConfigSchema = z.object({
  mcpServers: z.record(z.string(), ServerSchema).optional().default({}),
  description: z.string().optional(),
});

// TypeScript types exported from schemas
export type McpConfigType = z.infer<typeof McpConfigSchema>;
export type ServerConfig = z.infer<typeof ServerSchema>;
export type StdioServerConfig = z.infer<typeof StdioServerSchema>;
export type LegacyStdioServerConfig = z.infer<typeof LegacyStdioServerSchema>;
export type HttpServerConfig = z.infer<typeof HttpServerSchema>;
export type SseServerConfig = z.infer<typeof SseServerSchema>;

// Validation result interface for better error handling
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

// Utility function to extract server configurations from validated config
export function extractServers(
  config: McpConfigType,
): Record<string, ServerConfig> {
  return config.mcpServers || {};
}
