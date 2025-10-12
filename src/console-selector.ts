import { createInterface } from "node:readline";
import { render } from "ink";
import React from "react";
import type { McpConfig } from "./mcp-scanner.js";
import { ConfigSelector } from "./tui/index.js";
import { getPackageVersion } from "./utils.js";

function createSignalCleanup(cleanup: () => void): () => void {
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

  signals.forEach((signal) => {
    process.once(signal, cleanup);
  });

  return () => {
    signals.forEach((signal) => {
      process.removeListener(signal, cleanup);
    });
  };
}

function isTTY(): boolean {
  return process.stdin.isTTY && process.stdout.isTTY;
}

export async function selectConfigs(
  configs: McpConfig[],
  configDir: string,
  previouslySelected: Set<string> = new Set(),
): Promise<McpConfig[]> {
  if (configs.length === 0) {
    console.log(
      `No MCP configs found in ${configDir || "~/.claude/mcp-configs/"}`,
    );
    return [];
  }

  // Use Ink TUI if we're in a TTY environment
  if (isTTY()) {
    const version = getPackageVersion();

    return new Promise<McpConfig[]>((resolve) => {
      const { waitUntilExit } = render(
        React.createElement(ConfigSelector, {
          configs,
          configDir,
          previouslySelected,
          version,
          onSelect: (selectedConfigs: McpConfig[]) => {
            // Wait for TUI to fully exit before resolving
            waitUntilExit().then(() => {
              resolve(selectedConfigs);
            });
          },
        }),
      );
    });
  }

  // Fallback to readline interface for non-TTY environments
  return selectConfigsReadline(configs, configDir, previouslySelected);
}

async function selectConfigsReadline(
  configs: McpConfig[],
  _configDir: string,
  previouslySelected: Set<string> = new Set(),
): Promise<McpConfig[]> {
  console.log("\nAvailable MCP configs:");
  console.log("======================");

  const validConfigs = configs.filter((config) => config.valid);
  const invalidConfigs = configs.filter((config) => !config.valid);

  // Show valid configs
  validConfigs.forEach((config, index) => {
    const wasPreviouslySelected = previouslySelected.has(config.name);
    const indicator = wasPreviouslySelected ? " (previously selected)" : "";
    console.log(`${index + 1}. ${config.description}${indicator}`);
  });

  // Show invalid configs
  if (invalidConfigs.length > 0) {
    console.log("\nInvalid configs (cannot be selected):");
    invalidConfigs.forEach((config) => {
      console.log(
        `   ✗ ${config.name} - ${config.description} (${config.error})`,
      );
    });
  }

  if (validConfigs.length === 0) {
    console.log(
      "\nNo valid configs found. Launching Claude Code without MCP configs...",
    );
    return [];
  }

  console.log(
    "\nEnter config numbers to select (comma-separated, e.g., '1,3,5'):",
  );
  if (previouslySelected.size > 0) {
    console.log("Press Enter with no input to use previous selection:");
  } else {
    console.log("Press Enter with no input to launch without any configs:");
  }
  console.log("Type 'all' to select all valid configs:");

  const input = await readInput("> ");
  const trimmed = input.trim();

  if (trimmed === "") {
    if (previouslySelected.size > 0) {
      return validConfigs.filter((config) =>
        previouslySelected.has(config.name),
      );
    }
    return [];
  }

  if (trimmed.toLowerCase() === "none") {
    return [];
  }

  if (trimmed.toLowerCase() === "all") {
    return validConfigs;
  }

  try {
    const selectedIndexes = trimmed
      .split(",")
      .map((s) => {
        const num = parseInt(s.trim(), 10);
        return Number.isNaN(num) ? -1 : num - 1;
      })
      .filter((i) => i >= 0 && i < validConfigs.length);

    if (selectedIndexes.length === 0) {
      console.log("No valid selections found. Launching without configs...");
      return [];
    }

    const uniqueIndexes = [...new Set(selectedIndexes)];
    // All indexes are guaranteed to be valid by the filter at line 136
    // biome-ignore lint/style/noNonNullAssertion: bounds check at line 136 guarantees valid indexes
    return uniqueIndexes.map((i) => validConfigs[i]!);
  } catch (_error: unknown) {
    console.log("Invalid input. Launching without configs...");
    return [];
  }
}

function readInput(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    const cleanup = () => {
      rl.close();
    };

    const removeSignalListeners = createSignalCleanup(cleanup);

    rl.question(prompt, (answer) => {
      removeSignalListeners();
      rl.close();
      resolve(answer.trim());
    });

    rl.on("error", (error) => {
      removeSignalListeners();
      rl.close();
      reject(error);
    });
  });
}
