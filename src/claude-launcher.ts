import { spawn } from "child_process";
import type { McpConfig } from "./mcp-scanner.js";

export interface LaunchOptions {
  selectedConfigs: McpConfig[];
  passthroughArgs: string[];
}

export function launchClaudeCode({
  selectedConfigs,
  passthroughArgs,
}: LaunchOptions): Promise<number> {
  return new Promise((resolve, reject) => {
    const args: string[] = [];

    // Add MCP config flags for each selected config
    for (const config of selectedConfigs) {
      args.push("--mcp-config", config.path);
    }

    // Add any passthrough arguments
    args.push(...passthroughArgs);

    console.log(`Launching: claude ${args.join(" ")}`);

    const child = spawn("claude", args, {
      stdio: "inherit",
      shell: false,
    });

    child.on("error", (error) => {
      if (error.message.includes("ENOENT")) {
        console.error(
          "Error: 'claude' command not found. Please ensure Claude Code is installed and in your PATH.",
        );
        resolve(1);
      } else {
        console.error(`Failed to launch Claude Code: ${error.message}`);
        reject(error);
      }
    });

    child.on("close", (code) => {
      resolve(code ?? 0);
    });
  });
}
