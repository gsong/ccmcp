import assert from "node:assert";
import { describe, it, mock } from "node:test";

describe("CLI User Experience", () => {
  describe("Help and Version Display", () => {
    it("should display help output with proper formatting", async () => {
      const mockConsoleLog = mock.fn();
      const originalConsoleLog = console.log;

      try {
        console.log = mockConsoleLog;

        const { showHelp } = await import("../index.js");
        showHelp();

        assert.strictEqual(mockConsoleLog.mock.callCount(), 1);
        const helpOutput = mockConsoleLog.mock.calls[0]?.arguments[0] as string;

        // Check for proper structure - be more forgiving with exact text matches
        assert.ok(helpOutput.includes("ccmcp"));
        assert.ok(helpOutput.includes("Usage"));
        assert.ok(helpOutput.includes("Description"));
        assert.ok(helpOutput.includes("Options"));
        assert.ok(helpOutput.includes("help"));
        assert.ok(helpOutput.includes("version"));
        assert.ok(helpOutput.includes("config-dir"));
        assert.ok(helpOutput.includes("Environment Variables"));
        assert.ok(helpOutput.includes("CCMCP_CONFIG_DIR"));
        assert.ok(helpOutput.includes("arguments are passed through"));
      } finally {
        console.log = originalConsoleLog;
        mock.restoreAll();
      }
    });

    it("should display version in correct format", async () => {
      const mockConsoleLog = mock.fn();
      const originalConsoleLog = console.log;

      try {
        console.log = mockConsoleLog;

        const { showVersion } = await import("../index.js");
        showVersion();

        assert.strictEqual(mockConsoleLog.mock.callCount(), 1);
        const versionOutput = mockConsoleLog.mock.calls[0]
          ?.arguments[0] as string;

        // Should match format: "ccmcp v{version}"
        assert.ok(versionOutput.match(/^ccmcp v\d+\.\d+\.\d+$/));
      } finally {
        console.log = originalConsoleLog;
        mock.restoreAll();
      }
    });
  });

  describe("Argument Parsing and Validation", () => {
    it("should reject empty config directory with clear error", async () => {
      const { validateConfigDir } = await import("../index.js");

      assert.throws(() => validateConfigDir(""), {
        name: "Error",
        message: "Config directory cannot be empty",
      });
    });

    it("should reject config directory with invalid characters", async () => {
      const { validateConfigDir } = await import("../index.js");

      assert.throws(() => validateConfigDir("/path/with/null\0byte"), {
        name: "Error",
        message: "Config directory contains invalid characters",
      });
    });

    it("should accept valid config directory", async () => {
      const { validateConfigDir } = await import("../index.js");

      // Should not throw
      assert.doesNotThrow(() => validateConfigDir("/valid/path"));
    });

    it("should parse help flag correctly", async () => {
      const originalArgv = process.argv;

      try {
        process.argv = ["node", "ccmcp", "--help"];

        const { parseCliArgs } = await import("../index.js");
        const result = parseCliArgs();

        assert.strictEqual(result.values.help, true);
        assert.strictEqual(result.positionals.length, 0);
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

        assert.strictEqual(result.values.version, true);
        assert.strictEqual(result.positionals.length, 0);
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

        assert.strictEqual(result.values.help, true);
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

        assert.strictEqual(result.values["config-dir"], "/test/path");
        assert.strictEqual(result.positionals.length, 0);
      } finally {
        process.argv = originalArgv;
      }
    });

    it("should parse short config-dir flag correctly", async () => {
      const originalArgv = process.argv;

      try {
        process.argv = ["node", "ccmcp", "-c", "/test/path"];

        const { parseCliArgs } = await import("../index.js");
        const result = parseCliArgs();

        assert.strictEqual(result.values["config-dir"], "/test/path");
        assert.strictEqual(result.positionals.length, 0);
      } finally {
        process.argv = originalArgv;
      }
    });

    it("should pass through non-ccmcp arguments", async () => {
      const originalArgv = process.argv;

      try {
        process.argv = ["node", "ccmcp", "--resume", "--verbose"];

        const { parseCliArgs } = await import("../index.js");
        const result = parseCliArgs();

        assert.deepStrictEqual(result.positionals, ["--resume", "--verbose"]);
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
          "-c",
          "/path",
          "--resume",
          "--verbose",
        ];

        const { parseCliArgs } = await import("../index.js");
        const result = parseCliArgs();

        assert.strictEqual(result.values["config-dir"], "/path");
        assert.deepStrictEqual(result.positionals, ["--resume", "--verbose"]);
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

        assert.throws(() => parseCliArgs(), {
          name: "Error",
          message: "Config directory cannot be empty",
        });
      } finally {
        process.argv = originalArgv;
      }
    });
  });

  describe("Output Formatting", () => {
    it("should have consistent help message structure", async () => {
      const mockConsoleLog = mock.fn();
      const originalConsoleLog = console.log;

      try {
        console.log = mockConsoleLog;

        const { showHelp } = await import("../index.js");
        showHelp();

        const helpOutput = mockConsoleLog.mock.calls[0]?.arguments[0] as string;

        // Verify specific format requirements
        const lines = helpOutput.split("\n");

        // Should start with a newline and have the title
        assert.ok(lines[1]?.includes("ccmcp - Claude Code MCP Selector CLI"));

        // Should have Usage section
        assert.ok(helpOutput.includes("Usage:"));
        assert.ok(helpOutput.includes("ccmcp [options] [claude-options...]"));

        // Should have Description section
        assert.ok(helpOutput.includes("Description:"));

        // Should have Options section with proper formatting
        assert.ok(helpOutput.includes("Options:"));
        assert.ok(helpOutput.includes("  -h, --help"));
        assert.ok(helpOutput.includes("  -v, --version"));
        assert.ok(helpOutput.includes("  -c, --config-dir"));

        // Should have Environment Variables section
        assert.ok(helpOutput.includes("Environment Variables:"));
        assert.ok(helpOutput.includes("  CCMCP_CONFIG_DIR"));
      } finally {
        console.log = originalConsoleLog;
        mock.restoreAll();
      }
    });
  });
});
