#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { launchClaudeCode } from "./claude-launcher.js";
import { cleanupCache } from "./cleanup.js";
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
  "no-save"?: boolean;
  cleanup?: boolean;
  "dry-run"?: boolean;
  yes?: boolean;
}

export function showHelp(): void {
  console.log(`
ccmcp - Claude Code MCP Selector CLI

Usage:
  ccmcp [options] [claude-options...]
  ccmcp cleanup [options]

Description:
  Discovers MCP server configs, lets you select them via TUI,
  and launches Claude Code with the selected configs.

Options:
  -h, --help                 Show this help message
  -v, --version              Show version information
  --config-dir <dir>         Specify MCP config directory (default: ~/.claude/mcp-configs)
  -i, --ignore-cache         Skip loading previously selected configs
  -n, --no-save              Don't save selections (ephemeral mode)
  --clear-cache              Clear all cached selections and exit

Cleanup Command:
  cleanup                    Remove stale cache entries and broken symlinks
    --dry-run                Preview what would be cleaned without making changes
    --yes                    Skip all prompts and automatically proceed

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
    "--config-dir",
    "-i",
    "--ignore-cache",
    "--clear-cache",
    "-n",
    "--no-save",
    "--cleanup",
    "--dry-run",
    "--yes",
  ]);

  const ccmcpArgs: string[] = [];
  const passthroughArgs: string[] = [];

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (!arg) continue;

    if (arg === "cleanup") {
      ccmcpArgs.push("--cleanup");
      continue;
    }

    // Handle combined short flags (e.g., -in -> -i -n)
    if (arg.startsWith("-") && !arg.startsWith("--") && arg.length > 2) {
      const flags = arg.slice(1).split("");
      let allFlagsValid = true;
      for (const flag of flags) {
        if (!ccmcpFlags.has(`-${flag}`)) {
          allFlagsValid = false;
          break;
        }
      }
      if (allFlagsValid) {
        for (const flag of flags) {
          ccmcpArgs.push(`-${flag}`);
        }
        continue;
      }
    }

    if (ccmcpFlags.has(arg)) {
      ccmcpArgs.push(arg);

      // Handle config-dir value
      if (arg === "--config-dir" && i + 1 < rawArgs.length) {
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
      "config-dir": { type: "string" },
      "ignore-cache": { type: "boolean", short: "i" },
      "clear-cache": { type: "boolean" },
      "no-save": { type: "boolean", short: "n" },
      cleanup: { type: "boolean" },
      "dry-run": { type: "boolean" },
      yes: { type: "boolean" },
    },
    allowPositionals: false,
    strict: true,
  }) as { values: CliArgs; positionals: string[] };

  if (result.values["config-dir"]) {
    validateConfigDir(result.values["config-dir"]);
  }

  return { values: result.values, positionals: passthroughArgs };
}

export async function main(): Promise<number> {
  const { values, positionals } = parseCliArgs();

  if (values.help) {
    showHelp();
    return 0;
  }

  if (values.version) {
    showVersion();
    return 0;
  }

  if (values["clear-cache"]) {
    await clearCache();
    console.log("Cache cleared successfully");
    return 0;
  }

  if (values.cleanup) {
    const configDir = values["config-dir"] || process.env.CCMCP_CONFIG_DIR;
    const resolvedConfigDir =
      configDir || join(homedir(), ".claude", "mcp-configs");

    const result = await cleanupCache({
      configDir: resolvedConfigDir,
      dryRun: values["dry-run"],
      yes: values.yes,
    });

    console.log("\nCleanup Summary:");
    console.log(`  Stale cache entries removed: ${result.staleCacheEntries}`);
    console.log(
      `  Invalid server references removed: ${result.invalidServerReferences}`,
    );
    console.log(`  Broken symlinks removed: ${result.brokenSymlinks}`);
    console.log(
      `  Cache files: ${result.totalCacheFilesBefore} → ${result.totalCacheFilesAfter}`,
    );

    if (result.errors.length > 0) {
      console.log("\nErrors:");
      for (const error of result.errors) {
        console.log(`  - ${error}`);
      }
      return 1;
    }

    return 0;
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
      return exitCode;
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

    // Save selections for next time unless --no-save is set
    if (!values["no-save"]) {
      const selectedNames = selectedConfigs.map((c) => c.name);
      await saveSelections(projectDir, resolvedConfigDir, selectedNames);
    }

    const exitCode = await launchClaudeCode({
      selectedConfigs,
      passthroughArgs: positionals,
    });
    return exitCode;
  } catch (error: unknown) {
    if (error instanceof MissingConfigDirectoryError) {
      console.error(`Error: ${error.message}`);
      return 1;
    }
    console.error(`Error: ${formatErrorMessage(error)}`);
    return 1;
  }
}

// Detect if this module is the main entry point
// Works on Node.js 18+ (import.meta.url has been available since Node 12)
const isMain = (() => {
  try {
    const scriptArg = process.argv[1];
    if (!scriptArg) {
      return false;
    }
    // process.argv[1] is the script path, might be a symlink (npm global installs)
    const scriptPath = realpathSync(scriptArg);
    // import.meta.url is always the canonical file:// URL
    const modulePath = fileURLToPath(import.meta.url);
    return scriptPath === modulePath;
  } catch (_error) {
    // If comparison fails (e.g., file not found), assume not main
    return false;
  }
})();

if (isMain) {
  main().then((exitCode) => {
    process.exit(exitCode);
  });
}
