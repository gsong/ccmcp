import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

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

          // Basic validation for MCP config structure
          const isValid =
            typeof parsed === "object" &&
            parsed !== null &&
            (parsed.mcpServers || parsed.mcp_servers);

          return {
            name,
            path: filePath,
            description: parsed.description || `MCP config: ${name}`,
            valid: isValid,
          };
        } catch (error) {
          return {
            name,
            path: filePath,
            description: `Invalid config: ${name}`,
            valid: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }),
    );

    return configs.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.warn(
      `Failed to scan MCP configs: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return [];
  }
}
