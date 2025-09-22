import { execFileSync, spawn } from "node:child_process";
import type { McpConfig } from "./mcp-scanner.js";

export interface LaunchOptions {
  selectedConfigs: McpConfig[];
  passthroughArgs: string[];
  replaceProcess?: boolean;
}

export async function launchClaudeCode({
  selectedConfigs,
  passthroughArgs,
  replaceProcess = true,
}: LaunchOptions): Promise<number> {
  const args: string[] = [];

  // Add MCP config flags for each selected config
  for (const config of selectedConfigs) {
    args.push("--mcp-config", config.path);
  }

  // Add any passthrough arguments
  args.push(...passthroughArgs);

  if (replaceProcess) {
    // Replace the current process with Claude Code using exec syscall
    try {
      // Find the claude executable path
      const claudePath = execFileSync("which", ["claude"], {
        encoding: "utf8",
        stdio: "pipe",
      }).trim();

      console.log(`Executing: ${claudePath} ${args.join(" ")}`);

      // Use Node.js spawn with exec for true process replacement
      // This provides better terminal control and keyboard input handling
      const proc = spawn(
        "sh",
        [
          "-c",
          `exec "${claudePath}" ${args.map((arg) => `"${arg.replace(/"/g, '\\"')}"`).join(" ")}`,
        ],
        {
          stdio: "inherit",
        },
      );

      // Exit with the same code as Claude Code
      proc.on("exit", (code, signal) => {
        if (signal) {
          process.kill(process.pid, signal);
        } else {
          process.exit(code ?? 0);
        }
      });

      // Handle errors
      proc.on("error", (error) => {
        console.error(`Failed to exec Claude Code: ${error.message}`);
        process.exit(1);
      });

      // This function should not return since we're replacing the process
      return new Promise<number>(() => {});
    } catch (error: unknown) {
      const errorWithStatus = error as { status?: number; message?: string };
      if (
        errorWithStatus.status === 1 ||
        errorWithStatus.message?.includes("command not found")
      ) {
        console.error(
          "Error: 'claude' command not found. Please ensure Claude Code is installed and in your PATH.",
        );
        return Promise.resolve(1);
      } else {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`Failed to exec Claude Code: ${errorMessage}`);
        return Promise.resolve(1);
      }
    }
  } else {
    // Spawn as child process (original behavior)
    console.log(`Launching: claude ${args.join(" ")}`);

    return new Promise<number>((resolve) => {
      const child = spawn("claude", args, {
        stdio: "inherit",
        shell: false,
      });

      child.on("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") {
          console.error(
            "Error: 'claude' command not found. Please ensure Claude Code is installed and in your PATH.",
          );
          resolve(1);
        } else {
          console.error(`Failed to launch Claude Code: ${error.message}`);
          resolve(1);
        }
      });

      child.on("exit", (code, signal) => {
        if (signal) {
          console.log(`Claude Code terminated by signal: ${signal}`);
          resolve(1);
        } else {
          resolve(code ?? 0);
        }
      });

      // Handle graceful shutdown
      const handleShutdown = (signal: NodeJS.Signals) => {
        console.log(`\nReceived ${signal}, terminating Claude Code...`);
        child.kill(signal);
      };

      process.once("SIGINT", handleShutdown);
      process.once("SIGTERM", handleShutdown);
    });
  }
}
