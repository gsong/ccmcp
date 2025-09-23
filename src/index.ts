#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { launchClaudeCode } from "./claude-launcher.js";
import { selectConfigs } from "./console-selector.js";
import type { McpConfig } from "./mcp-scanner.js";
import { scanMcpConfigs } from "./mcp-scanner.js";

interface CliArgs {
  help?: boolean;
  version?: boolean;
  "config-dir"?: string;
}

function showHelp() {
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

function showVersion() {
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
      "config-dir": {
        type: "string",
        short: "c",
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
    // Determine config directory with precedence: CLI > env > default
    const configDir = values["config-dir"] || process.env.CCMCP_CONFIG_DIR;
    const resolvedConfigDir =
      configDir || join(homedir(), ".claude", "mcp-configs");
    const configs = await scanMcpConfigs(configDir);

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
