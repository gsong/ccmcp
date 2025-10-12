#!/usr/bin/env node

import { homedir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { launchClaudeCode } from "./claude-launcher.js";
import { selectConfigs } from "./console-selector.js";
import type { McpConfig } from "./mcp-scanner.js";
import { MissingConfigDirectoryError, scanMcpConfigs } from "./mcp-scanner.js";
import {
  clearCache,
  getProjectDir,
  loadSelections,
  saveSelections,
} from "./selection-cache.js";
import { formatErrorMessage, getPackageVersion } from "./utils.js";

interface CliArgs {
  help?: boolean;
  version?: boolean;
  "config-dir"?: string;
  "ignore-cache"?: boolean;
  "clear-cache"?: boolean;
}

export function showHelp(): void {
  console.log(`
ccmcp - Claude Code MCP Selector CLI

Usage:
  ccmcp [options] [claude-options...]

Description:
  Discovers MCP server configs, lets you select them via TUI,
  and launches Claude Code with the selected configs.

Options:
  -h, --help              Show this help message
  -v, --version           Show version information
  -c, --config-dir <dir>  Specify MCP config directory (default: ~/.claude/mcp-configs)
  --ignore-cache          Skip loading previously selected configs
  --clear-cache           Clear all cached selections and exit

Environment Variables:
  CCMCP_CONFIG_DIR  Alternative to --config-dir option

Any additional arguments are passed through to Claude Code.
`);
}

export function showVersion(): void {
  console.log(`ccmcp v${getPackageVersion()}`);
}

async function runSelector(
  configs: McpConfig[],
  configDir: string,
  previouslySelected: Set<string>,
): Promise<McpConfig[]> {
  return await selectConfigs(configs, configDir, previouslySelected);
}

export function validateConfigDir(configDir: string): void {
  if (configDir.trim() === "") {
    throw new Error("Config directory cannot be empty");
  }
  // Check for obviously invalid paths
  if (configDir.includes("\0")) {
    throw new Error("Config directory contains invalid characters");
  }
}

export function parseCliArgs(): { values: CliArgs; positionals: string[] } {
  const rawArgs = process.argv.slice(2);
  const ccmcpFlags = new Set([
    "-h",
    "--help",
    "-v",
    "--version",
    "-c",
    "--config-dir",
    "--ignore-cache",
    "--clear-cache",
  ]);

  const ccmcpArgs: string[] = [];
  const passthroughArgs: string[] = [];

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (!arg) continue;

    if (ccmcpFlags.has(arg)) {
      ccmcpArgs.push(arg);

      // Handle config-dir value
      if ((arg === "-c" || arg === "--config-dir") && i + 1 < rawArgs.length) {
        i++;
        const nextArg = rawArgs[i];
        if (nextArg) {
          ccmcpArgs.push(nextArg);
        }
      }
    } else {
      passthroughArgs.push(arg);
    }
  }

  const result = parseArgs({
    args: ccmcpArgs,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      "config-dir": { type: "string", short: "c" },
      "ignore-cache": { type: "boolean" },
      "clear-cache": { type: "boolean" },
    },
    allowPositionals: false,
    strict: true,
  }) as { values: CliArgs; positionals: string[] };

  if (result.values["config-dir"]) {
    validateConfigDir(result.values["config-dir"]);
  }

  return { values: result.values, positionals: passthroughArgs };
}

export async function main(): Promise<void> {
  const { values, positionals } = parseCliArgs();

  if (values.help) {
    showHelp();
    process.exit(0);
  }

  if (values.version) {
    showVersion();
    process.exit(0);
  }

  if (values["clear-cache"]) {
    await clearCache();
    console.log("Cache cleared successfully");
    process.exit(0);
  }

  try {
    // Determine config directory with precedence: CLI > env > default
    const configDir = values["config-dir"] || process.env.CCMCP_CONFIG_DIR;
    const resolvedConfigDir =
      configDir || join(homedir(), ".claude", "mcp-configs");
    const configs = await scanMcpConfigs(resolvedConfigDir);

    if (configs.length === 0) {
      console.log("No MCP configs found. Launching Claude Code directly...");
      const exitCode = await launchClaudeCode({
        selectedConfigs: [],
        passthroughArgs: positionals,
      });
      process.exit(exitCode);
    }

    // Load previously selected configs unless --ignore-cache is set
    const projectDir = getProjectDir();
    const previouslySelected = values["ignore-cache"]
      ? new Set<string>()
      : await loadSelections(projectDir, resolvedConfigDir);

    const selectedConfigs = await runSelector(
      configs,
      resolvedConfigDir,
      previouslySelected,
    );

    // Save selections for next time
    const selectedNames = selectedConfigs.map((c) => c.name);
    await saveSelections(projectDir, resolvedConfigDir, selectedNames);

    const exitCode = await launchClaudeCode({
      selectedConfigs,
      passthroughArgs: positionals,
    });
    process.exit(exitCode);
  } catch (error: unknown) {
    if (error instanceof MissingConfigDirectoryError) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
    console.error(`Error: ${formatErrorMessage(error)}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
