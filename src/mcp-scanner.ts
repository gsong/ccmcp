import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  extractServers,
  formatValidationErrors,
  validateMcpConfig,
} from "./schemas/mcp-config.js";
import { formatConfigDisplayName, formatErrorMessage } from "./utils.js";

export class MissingConfigDirectoryError extends Error {
  constructor(public readonly directoryPath: string) {
    super(`Config directory not found: ${directoryPath}`);
    this.name = "MissingConfigDirectoryError";
  }
}

export interface McpConfig {
  name: string;
  path: string;
  description?: string;
  valid: boolean;
  error?: string;
}

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

            // Generate display name using new format
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
