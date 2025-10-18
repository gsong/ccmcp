import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it, vi } from "vitest";

const execFileAsync = promisify(execFile);

describe("CLI User Experience", () => {
  describe("Help and Version Display", () => {
    it("should display help output with proper formatting", async () => {
      const mockConsoleLog = vi.fn();
      const originalConsoleLog = console.log;

      try {
        console.log = mockConsoleLog;

        const { showHelp } = await import("../index.js");
        showHelp();

        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        const helpOutput = mockConsoleLog.mock.calls[0]?.[0] as string;

        // Check for proper structure - be more forgiving with exact text matches
        expect(helpOutput).toContain("ccmcp");
        expect(helpOutput).toContain("Usage");
        expect(helpOutput).toContain("Description");
        expect(helpOutput).toContain("Options");
        expect(helpOutput).toContain("help");
        expect(helpOutput).toContain("version");
        expect(helpOutput).toContain("config-dir");
        expect(helpOutput).toContain("Environment Variables");
        expect(helpOutput).toContain("CCMCP_CONFIG_DIR");
        expect(helpOutput).toContain("arguments are passed through");
      } finally {
        console.log = originalConsoleLog;
        vi.restoreAllMocks();
      }
    });

    it("should display version in correct format", async () => {
      const mockConsoleLog = vi.fn();
      const originalConsoleLog = console.log;

      try {
        console.log = mockConsoleLog;

        const { showVersion } = await import("../index.js");
        showVersion();

        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        const versionOutput = mockConsoleLog.mock.calls[0]?.[0] as string;

        // Should match format: "ccmcp v{version}"
        expect(versionOutput).toMatch(/^ccmcp v\d+\.\d+\.\d+$/);
      } finally {
        console.log = originalConsoleLog;
        vi.restoreAllMocks();
      }
    });
  });

  describe("Argument Parsing and Validation", () => {
    it("should reject empty config directory with clear error", async () => {
      const { validateConfigDir } = await import("../index.js");

      expect(() => validateConfigDir("")).toThrow(
        "Config directory cannot be empty",
      );
    });

    it("should reject config directory with invalid characters", async () => {
      const { validateConfigDir } = await import("../index.js");

      expect(() => validateConfigDir("/path/with/null\0byte")).toThrow(
        "Config directory contains invalid characters",
      );
    });

    it("should accept valid config directory", async () => {
      const { validateConfigDir } = await import("../index.js");

      // Should not throw
      expect(() => validateConfigDir("/valid/path")).not.toThrow();
    });

    it("should parse help flag correctly", async () => {
      const originalArgv = process.argv;

      try {
        process.argv = ["node", "ccmcp", "--help"];

        const { parseCliArgs } = await import("../index.js");
        const result = parseCliArgs();

        expect(result.values.help).toBe(true);
        expect(result.positionals).toHaveLength(0);
      } finally {
        process.argv = originalArgv;
      }
    });

    it("should parse version flag correctly", async () => {
      const originalArgv = process.argv;

      try {
        process.argv = ["node", "ccmcp", "--version"];

        const { parseCliArgs } = await import("../index.js");
        const result = parseCliArgs();

        expect(result.values.version).toBe(true);
        expect(result.positionals).toHaveLength(0);
      } finally {
        process.argv = originalArgv;
      }
    });

    it("should parse short flags correctly", async () => {
      const originalArgv = process.argv;

      try {
        process.argv = ["node", "ccmcp", "-h"];

        const { parseCliArgs } = await import("../index.js");
        const result = parseCliArgs();

        expect(result.values.help).toBe(true);
      } finally {
        process.argv = originalArgv;
      }
    });

    it("should parse config-dir flag correctly", async () => {
      const originalArgv = process.argv;

      try {
        process.argv = ["node", "ccmcp", "--config-dir", "/test/path"];

        const { parseCliArgs } = await import("../index.js");
        const result = parseCliArgs();

        expect(result.values["config-dir"]).toBe("/test/path");
        expect(result.positionals).toHaveLength(0);
      } finally {
        process.argv = originalArgv;
      }
    });

    it("should parse short ignore-cache flag correctly", async () => {
      const originalArgv = process.argv;

      try {
        process.argv = ["node", "ccmcp", "-i"];

        const { parseCliArgs } = await import("../index.js");
        const result = parseCliArgs();

        expect(result.values["ignore-cache"]).toBe(true);
        expect(result.positionals).toHaveLength(0);
      } finally {
        process.argv = originalArgv;
      }
    });

    it("should parse short no-save flag correctly", async () => {
      const originalArgv = process.argv;

      try {
        process.argv = ["node", "ccmcp", "-n"];

        const { parseCliArgs } = await import("../index.js");
        const result = parseCliArgs();

        expect(result.values["no-save"]).toBe(true);
        expect(result.positionals).toHaveLength(0);
      } finally {
        process.argv = originalArgv;
      }
    });

    it("should parse combined short flags correctly", async () => {
      const originalArgv = process.argv;

      try {
        process.argv = ["node", "ccmcp", "-in"];

        const { parseCliArgs } = await import("../index.js");
        const result = parseCliArgs();

        expect(result.values["ignore-cache"]).toBe(true);
        expect(result.values["no-save"]).toBe(true);
        expect(result.positionals).toHaveLength(0);
      } finally {
        process.argv = originalArgv;
      }
    });

    it("should pass through non-ccmcp arguments", async () => {
      const originalArgv = process.argv;

      try {
        process.argv = ["node", "ccmcp", "--resume", "--debug"];

        const { parseCliArgs } = await import("../index.js");
        const result = parseCliArgs();

        expect(result.positionals).toEqual(["--resume", "--debug"]);
      } finally {
        process.argv = originalArgv;
      }
    });

    it("should handle mixed ccmcp and passthrough arguments", async () => {
      const originalArgv = process.argv;

      try {
        process.argv = [
          "node",
          "ccmcp",
          "--config-dir",
          "/path",
          "--resume",
          "--debug",
        ];

        const { parseCliArgs } = await import("../index.js");
        const result = parseCliArgs();

        expect(result.values["config-dir"]).toBe("/path");
        expect(result.positionals).toEqual(["--resume", "--debug"]);
      } finally {
        process.argv = originalArgv;
      }
    });

    it("should validate config directory when parsing", async () => {
      const originalArgv = process.argv;

      try {
        // Test with a whitespace-only config dir that passes parseArgs but fails validation
        process.argv = ["node", "ccmcp", "--config-dir", "   "];

        const { parseCliArgs } = await import("../index.js");

        expect(() => parseCliArgs()).toThrow(
          "Config directory cannot be empty",
        );
      } finally {
        process.argv = originalArgv;
      }
    });
  });

  describe("Output Formatting", () => {
    it("should have consistent help message structure", async () => {
      const mockConsoleLog = vi.fn();
      const originalConsoleLog = console.log;

      try {
        console.log = mockConsoleLog;

        const { showHelp } = await import("../index.js");
        showHelp();

        const helpOutput = mockConsoleLog.mock.calls[0]?.[0] as string;

        // Verify specific format requirements
        const lines = helpOutput.split("\n");

        // Should start with a newline and have the title
        expect(lines[1]).toContain("ccmcp - Claude Code MCP Selector CLI");

        // Should have Usage section
        expect(helpOutput).toContain("Usage:");
        expect(helpOutput).toContain("ccmcp [options] [claude-options...]");

        // Should have Description section
        expect(helpOutput).toContain("Description:");

        // Should have Options section with proper formatting
        expect(helpOutput).toContain("Options:");
        expect(helpOutput).toContain("  -h, --help");
        expect(helpOutput).toContain("  -v, --version");
        expect(helpOutput).toContain("  --config-dir");
        expect(helpOutput).toContain("  -i, --ignore-cache");
        expect(helpOutput).toContain("  -n, --no-save");

        // Should have Environment Variables section
        expect(helpOutput).toContain("Environment Variables:");
        expect(helpOutput).toContain("  CCMCP_CONFIG_DIR");
      } finally {
        console.log = originalConsoleLog;
        vi.restoreAllMocks();
      }
    });
  });

  describe("CLI Integration", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const projectRoot = join(__dirname, "..", "..");
    const cliPath = join(projectRoot, "dist", "index.js");

    if (!existsSync(cliPath)) {
      throw new Error(
        `CLI not built. Run 'pnpm run build' before running integration tests. Missing: ${cliPath}`,
      );
    }

    it("--help should produce output", async () => {
      const { stdout } = await execFileAsync("node", [cliPath, "--help"]);

      expect(stdout).toContain("Usage:");
    });

    it("--version should produce output", async () => {
      const { stdout } = await execFileAsync("node", [cliPath, "--version"]);

      expect(stdout.length).toBeGreaterThan(0);
    });
  });
});
