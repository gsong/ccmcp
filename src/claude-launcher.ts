import { execFileSync, spawn } from "node:child_process";
import { quote } from "shell-quote";
import type { McpConfig } from "./mcp-scanner.js";
import { formatErrorMessage } from "./utils.js";

export interface LaunchOptions {
  selectedConfigs: McpConfig[];
  passthroughArgs: string[];
}

export async function launchClaudeCode(
  { selectedConfigs, passthroughArgs }: LaunchOptions,
  execFile: typeof execFileSync = execFileSync,
): Promise<number> {
  const args: string[] = [];

  // Add MCP config flags for each selected config
  for (const config of selectedConfigs) {
    args.push("--mcp-config", config.path);
  }

  // Add any passthrough arguments
  args.push(...passthroughArgs);

  // Replace the current process with Claude Code using exec syscall
  try {
    // Find the claude executable path
    const claudePath = execFile("which", ["claude"], {
      encoding: "utf8",
      stdio: "pipe",
    }).trim();

    console.log(`Executing: ${claudePath} ${args.join(" ")}`);

    // Flush stdio to ensure clean handover
    process.stdout.write("");
    process.stderr.write("");

    // Build command with proper shell escaping using shell-quote
    const command = `exec ${quote([claudePath, ...args])}`;

    // Use Node.js spawn with exec for true process replacement
    // This provides better terminal control and keyboard input handling
    const proc = spawn("sh", ["-c", command], {
      stdio: "inherit",
    });

    // Exit with the same code as Claude Code
    // NOTE: process.exit() is intentionally used here because we're in the context
    // of process replacement. These event handlers must terminate the parent process
    // after the spawned Claude Code process completes or fails.
    proc.on("exit", (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
      } else {
        process.exit(code ?? 0);
      }
    });

    // Handle errors
    proc.on("error", (error) => {
      console.error(`Error: Failed to exec Claude Code: ${error.message}`);
      process.exit(1);
    });

    // This function should not return since we're replacing the process
    return new Promise<number>(() => {});
  } catch (error: unknown) {
    const errorWithStatus = error as { status?: number; message?: string };
    const isCommandNotFound =
      errorWithStatus.status === 1 ||
      errorWithStatus.message?.includes("command not found");

    if (isCommandNotFound) {
      console.error(
        "Error: 'claude' command not found. Please ensure Claude Code is installed and in your PATH.",
      );
    } else {
      const errorMessage = formatErrorMessage(error);
      console.error(`Error: Failed to exec Claude Code: ${errorMessage}`);
    }
    return Promise.resolve(1);
  }
}
