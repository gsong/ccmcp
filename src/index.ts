#!/usr/bin/env bun

import { parseArgs } from "util";

interface CliArgs {
  help?: boolean;
  version?: boolean;
}

function showHelp() {
  console.log(`
ccmcp - CLI tool

Usage:
  ccmcp [options]

Options:
  -h, --help     Show this help message
  -v, --version  Show version information
`);
}

function showVersion() {
  console.log("ccmcp v0.1.0");
}

function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
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
  }) as { values: CliArgs };

  if (values.help) {
    showHelp();
    process.exit(0);
  }

  if (values.version) {
    showVersion();
    process.exit(0);
  }

  console.log("Hello from ccmcp CLI!");
}

if (import.meta.main) {
  main();
}
