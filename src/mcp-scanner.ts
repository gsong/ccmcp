import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  formatValidationErrors,
  validateMcpConfig,
} from "./schemas/mcp-config.js";

export interface McpConfig {
  name: string;
  path: string;
  description?: string;
  valid: boolean;
  error?: string;
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function scanMcpConfigs(configDir?: string): Promise<McpConfig[]> {
  const resolvedConfigDir =
    configDir || join(homedir(), ".claude", "mcp-configs");

  try {
    await stat(resolvedConfigDir);
  } catch {
    return [];
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

          if (validationResult.success) {
            return {
              name,
              path: filePath,
              description: parsed.description || `MCP config: ${name}`,
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
