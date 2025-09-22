#!/usr/bin/env node

import { parseArgs } from "util";
import { scanMcpConfigs } from "./mcp-scanner.js";
import { selectConfigs } from "./console-selector.js";
import { launchClaudeCode } from "./claude-launcher.js";
import type { McpConfig } from "./mcp-scanner.js";

interface CliArgs {
  help?: boolean;
  version?: boolean;
}

function showHelp() {
  console.log(`
ccmcp - Claude Code MCP Selector CLI

Usage:
  ccmcp [claude-options...]

Description:
  Discovers MCP server configs, lets you select them via TUI,
  and launches Claude Code with the selected configs.

Options:
  -h, --help     Show this help message
  -v, --version  Show version information

Any additional arguments are passed through to Claude Code.
`);
}

function showVersion() {
  console.log("ccmcp v0.1.0");
}

async function runSelector(
  configs: McpConfig[],
  passthroughArgs: string[],
): Promise<number> {
  const selectedConfigs = await selectConfigs(configs);
  return await launchClaudeCode({ selectedConfigs, passthroughArgs });
}

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      help: {
        type: "boolean",
        short: "h",
      },
      version: {
        type: "boolean",
        short: "v",
      },
    },
    allowPositionals: true,
    strict: false,
  }) as { values: CliArgs; positionals: string[] };

  if (values.help) {
    showHelp();
    process.exit(0);
  }

  if (values.version) {
    showVersion();
    process.exit(0);
  }

  try {
    const configs = await scanMcpConfigs();

    if (configs.length === 0) {
      console.log("No MCP configs found. Launching Claude Code directly...");
      const exitCode = await launchClaudeCode({
        selectedConfigs: [],
        passthroughArgs: positionals,
      });
      process.exit(exitCode);
    }

    const exitCode = await runSelector(configs, positionals);
    process.exit(exitCode);
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
