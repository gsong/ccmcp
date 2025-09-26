#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { launchClaudeCode } from "./claude-launcher.js";
import { selectConfigs } from "./console-selector.js";
import type { McpConfig } from "./mcp-scanner.js";
import { MissingConfigDirectoryError, scanMcpConfigs } from "./mcp-scanner.js";
import { formatErrorMessage } from "./utils.js";

interface CliArgs {
  help?: boolean;
  version?: boolean;
  "config-dir"?: string;
}

function showHelp(): void {
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

Environment Variables:
  CCMCP_CONFIG_DIR  Alternative to --config-dir option

Any additional arguments are passed through to Claude Code.
`);
}

function showVersion(): void {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const packageJson = JSON.parse(
    readFileSync(join(__dirname, "../package.json"), "utf8"),
  );
  console.log(`ccmcp v${packageJson.version}`);
}

async function runSelector(
  configs: McpConfig[],
  passthroughArgs: string[],
  configDir: string,
): Promise<number> {
  const selectedConfigs = await selectConfigs(configs, configDir);
  return await launchClaudeCode({ selectedConfigs, passthroughArgs });
}

function validateConfigDir(configDir: string): void {
  if (configDir.trim() === "") {
    throw new Error("Config directory cannot be empty");
  }
  // Check for obviously invalid paths
  if (configDir.includes("\0")) {
    throw new Error("Config directory contains invalid characters");
  }
}

function parseCliArgs(): { values: CliArgs; positionals: string[] } {
  const rawArgs = process.argv.slice(2);
  const ccmcpFlags = new Set([
    "-h",
    "--help",
    "-v",
    "--version",
    "-c",
    "--config-dir",
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
    },
    allowPositionals: false,
    strict: true,
  }) as { values: CliArgs; positionals: string[] };

  if (result.values["config-dir"]) {
    validateConfigDir(result.values["config-dir"]);
  }

  return { values: result.values, positionals: passthroughArgs };
}

async function main(): Promise<void> {
  const { values, positionals } = parseCliArgs();

  if (values.help) {
    showHelp();
    process.exit(0);
  }

  if (values.version) {
    showVersion();
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

    const exitCode = await runSelector(configs, positionals, resolvedConfigDir);
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
