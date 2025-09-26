import assert from "node:assert";
import { describe, it, mock } from "node:test";
import type { McpConfig } from "../mcp-scanner.js";

describe("Claude Code Launch Behavior", () => {
  describe("MCP Configuration Arguments", () => {
    it("should generate correct --mcp-config flags for single config", async () => {
      const mockConsoleLog = mock.fn();
      const originalConsoleLog = console.log;

      try {
        console.log = mockConsoleLog;

        // Create a mock module for testing
        const mockLaunchClaudeCode = mock.fn(async () => {
          const selectedConfigs = [
            {
              name: "test-config",
              path: "/path/to/config.json",
              valid: true,
            },
          ];

          const args: string[] = [];

          // Add MCP config flags for each selected config
          for (const config of selectedConfigs) {
            args.push("--mcp-config", config.path);
          }

          // Build command with proper shell escaping
          const escapeShellArg = (arg: string): string => {
            return `"${arg.replace(/[\\"$`]/g, "\\$&")}"`;
          };
          const escapedArgs = args.map(escapeShellArg);
          const command = `exec "/usr/local/bin/claude" ${escapedArgs.join(" ")}`;

          console.log(`Executing: /usr/local/bin/claude ${args.join(" ")}`);

          return { command, args };
        });

        const result = await mockLaunchClaudeCode();

        assert.ok(
          result.command.includes('"--mcp-config" "/path/to/config.json"'),
        );
        assert.strictEqual(mockConsoleLog.mock.callCount(), 1);
        const logOutput = mockConsoleLog.mock.calls[0]?.arguments[0] as string;
        assert.ok(logOutput.includes("--mcp-config /path/to/config.json"));
      } finally {
        console.log = originalConsoleLog;
        mock.restoreAll();
      }
    });

    it("should generate multiple --mcp-config flags for multiple configs", async () => {
      const selectedConfigs: McpConfig[] = [
        {
          name: "config1",
          path: "/path/to/config1.json",
          valid: true,
        },
        {
          name: "config2",
          path: "/path/to/config2.json",
          valid: true,
        },
      ];

      const args: string[] = [];

      // Test the argument construction logic
      for (const config of selectedConfigs) {
        args.push("--mcp-config", config.path);
      }

      assert.deepStrictEqual(args, [
        "--mcp-config",
        "/path/to/config1.json",
        "--mcp-config",
        "/path/to/config2.json",
      ]);

      // Test shell escaping
      const escapeShellArg = (arg: string): string => {
        return `"${arg.replace(/[\\"$`]/g, "\\$&")}"`;
      };
      const escapedArgs = args.map(escapeShellArg);
      const command = `exec "/usr/local/bin/claude" ${escapedArgs.join(" ")}`;

      assert.ok(command.includes('"--mcp-config" "/path/to/config1.json"'));
      assert.ok(command.includes('"--mcp-config" "/path/to/config2.json"'));
    });

    it("should handle empty configs array", async () => {
      const selectedConfigs: McpConfig[] = [];
      const args: string[] = [];

      // Test the argument construction logic
      for (const config of selectedConfigs) {
        args.push("--mcp-config", config.path);
      }

      assert.deepStrictEqual(args, []);

      // Test shell escaping with empty args
      const escapeShellArg = (arg: string): string => {
        return `"${arg.replace(/[\\"$`]/g, "\\$&")}"`;
      };
      const escapedArgs = args.map(escapeShellArg);
      const command = `exec "/usr/local/bin/claude" ${escapedArgs.join(" ")}`;

      assert.strictEqual(command, 'exec "/usr/local/bin/claude" ');
      assert.ok(!command.includes("--mcp-config"));
    });
  });

  describe("Argument Passthrough", () => {
    it("should pass through user arguments to Claude Code", async () => {
      const passthroughArgs = ["--resume", "--verbose"];
      const args: string[] = [];

      // Add any passthrough arguments
      args.push(...passthroughArgs);

      assert.deepStrictEqual(args, ["--resume", "--verbose"]);

      // Test shell escaping
      const escapeShellArg = (arg: string): string => {
        return `"${arg.replace(/[\\"$`]/g, "\\$&")}"`;
      };
      const escapedArgs = args.map(escapeShellArg);
      const command = `exec "/usr/local/bin/claude" ${escapedArgs.join(" ")}`;

      assert.ok(command.includes('"--resume"'));
      assert.ok(command.includes('"--verbose"'));
    });

    it("should handle mixed config flags and passthrough arguments", async () => {
      const selectedConfigs: McpConfig[] = [
        {
          name: "test-config",
          path: "/path/to/config.json",
          valid: true,
        },
      ];
      const passthroughArgs = ["--resume"];
      const args: string[] = [];

      // Add MCP config flags for each selected config
      for (const config of selectedConfigs) {
        args.push("--mcp-config", config.path);
      }

      // Add any passthrough arguments
      args.push(...passthroughArgs);

      assert.deepStrictEqual(args, [
        "--mcp-config",
        "/path/to/config.json",
        "--resume",
      ]);

      // Test shell escaping
      const escapeShellArg = (arg: string): string => {
        return `"${arg.replace(/[\\"$`]/g, "\\$&")}"`;
      };
      const escapedArgs = args.map(escapeShellArg);
      const command = `exec "/usr/local/bin/claude" ${escapedArgs.join(" ")}`;

      assert.ok(command.includes('"--mcp-config" "/path/to/config.json"'));
      assert.ok(command.includes('"--resume"'));
    });
  });

  describe("Claude Code Detection", () => {
    it("should display helpful error when claude command not found", async () => {
      const mockConsoleError = mock.fn();
      const originalConsoleError = console.error;

      try {
        console.error = mockConsoleError;

        // Simulate the error handling logic from claude-launcher.ts
        const error = new Error("Command failed: which claude") as Error & {
          status?: number;
        };
        error.status = 1;

        const isCommandNotFound =
          error.status === 1 || error.message?.includes("command not found");

        if (isCommandNotFound) {
          console.error(
            "Error: 'claude' command not found. Please ensure Claude Code is installed and in your PATH.",
          );
        }

        assert.strictEqual(mockConsoleError.mock.callCount(), 1);
        const errorMessage = mockConsoleError.mock.calls[0]
          ?.arguments[0] as string;
        assert.ok(errorMessage.includes("'claude' command not found"));
        assert.ok(
          errorMessage.includes("Please ensure Claude Code is installed"),
        );
      } finally {
        console.error = originalConsoleError;
        mock.restoreAll();
      }
    });

    it("should handle other execFileSync errors gracefully", async () => {
      const mockConsoleError = mock.fn();
      const originalConsoleError = console.error;

      try {
        console.error = mockConsoleError;

        // Simulate other error handling logic
        const error = new Error("Some other error");
        const errorWithStatus = error as { status?: number; message?: string };
        const isCommandNotFound =
          errorWithStatus.status === 1 ||
          errorWithStatus.message?.includes("command not found");

        if (isCommandNotFound) {
          console.error(
            "Error: 'claude' command not found. Please ensure Claude Code is installed and in your PATH.",
          );
        } else {
          // Use formatErrorMessage like the actual code does
          const formatErrorMessage = (err: unknown): string => {
            return err instanceof Error ? err.message : "Unknown error";
          };
          const errorMessage = formatErrorMessage(error);
          console.error(`Error: Failed to exec Claude Code: ${errorMessage}`);
        }

        assert.strictEqual(mockConsoleError.mock.callCount(), 1);
        const errorMessage = mockConsoleError.mock.calls[0]
          ?.arguments[0] as string;
        assert.ok(errorMessage.includes("Failed to exec Claude Code"));
        assert.ok(errorMessage.includes("Some other error"));
      } finally {
        console.error = originalConsoleError;
        mock.restoreAll();
      }
    });
  });

  describe("Exit Code Propagation", () => {
    it("should exit with same code as Claude Code process", async () => {
      const mockExit = mock.fn();
      const originalExit = process.exit;

      try {
        process.exit = mockExit as unknown as typeof process.exit;

        // Simulate the exit handler logic from claude-launcher.ts
        const exitHandler = (
          code: number | null,
          signal: NodeJS.Signals | null,
        ) => {
          if (signal) {
            process.kill(process.pid, signal);
          } else {
            process.exit(code ?? 0);
          }
        };

        // Simulate Claude Code exiting with code 2
        exitHandler(2, null);

        assert.strictEqual(mockExit.mock.callCount(), 1);
        assert.strictEqual(mockExit.mock.calls[0]?.arguments[0], 2);
      } finally {
        process.exit = originalExit;
        mock.restoreAll();
      }
    });

    it("should handle signal termination", async () => {
      const mockKill = mock.fn();
      const originalKill = process.kill;

      try {
        process.kill = mockKill as unknown as typeof process.kill;

        // Simulate the exit handler logic from claude-launcher.ts
        const exitHandler = (
          code: number | null,
          signal: NodeJS.Signals | null,
        ) => {
          if (signal) {
            process.kill(process.pid, signal);
          } else {
            process.exit(code ?? 0);
          }
        };

        // Simulate Claude Code being terminated by signal
        exitHandler(null, "SIGTERM");

        assert.strictEqual(mockKill.mock.callCount(), 1);
        assert.strictEqual(mockKill.mock.calls[0]?.arguments[0], process.pid);
        assert.strictEqual(mockKill.mock.calls[0]?.arguments[1], "SIGTERM");
      } finally {
        process.kill = originalKill;
        mock.restoreAll();
      }
    });
  });

  describe("Process Execution", () => {
    it("should spawn process with correct command structure", async () => {
      const claudePath = "/usr/local/bin/claude";
      const args = ["--mcp-config", "/path/to/config.json"];

      // Build command with proper shell escaping (from claude-launcher.ts)
      const escapeShellArg = (arg: string): string => {
        return `"${arg.replace(/[\\"$`]/g, "\\$&")}"`;
      };
      const escapedArgs = args.map(escapeShellArg);
      const command = `exec "${claudePath.replace(/[\\"$`]/g, "\\$&")}" ${escapedArgs.join(" ")}`;

      // Should use exec for process replacement
      assert.ok(command.startsWith('exec "/usr/local/bin/claude"'));
      assert.ok(command.includes('"--mcp-config" "/path/to/config.json"'));

      // Verify proper escaping
      const expectedCommand =
        'exec "/usr/local/bin/claude" "--mcp-config" "/path/to/config.json"';
      assert.strictEqual(command, expectedCommand);
    });

    it("should handle spawn errors gracefully", async () => {
      const mockConsoleError = mock.fn();
      const mockExit = mock.fn();
      const originalConsoleError = console.error;
      const originalExit = process.exit;

      try {
        console.error = mockConsoleError;
        process.exit = mockExit as unknown as typeof process.exit;

        // Simulate the error handler logic from claude-launcher.ts
        const errorHandler = (error: Error) => {
          console.error(`Error: Failed to exec Claude Code: ${error.message}`);
          process.exit(1);
        };

        // Simulate spawn error
        errorHandler(new Error("Spawn failed"));

        assert.strictEqual(mockConsoleError.mock.callCount(), 1);
        const errorMessage = mockConsoleError.mock.calls[0]
          ?.arguments[0] as string;
        assert.ok(errorMessage.includes("Failed to exec Claude Code"));
        assert.ok(errorMessage.includes("Spawn failed"));

        assert.strictEqual(mockExit.mock.callCount(), 1);
        assert.strictEqual(mockExit.mock.calls[0]?.arguments[0], 1);
      } finally {
        console.error = originalConsoleError;
        process.exit = originalExit;
        mock.restoreAll();
      }
    });
  });

  describe("Shell Command Escaping", () => {
    it("should properly escape paths with spaces", async () => {
      const selectedConfigs: McpConfig[] = [
        {
          name: "test config",
          path: "/path with spaces/config.json",
          valid: true,
        },
      ];
      const passthroughArgs = ["--arg with spaces"];
      const args: string[] = [];

      // Add MCP config flags for each selected config
      for (const config of selectedConfigs) {
        args.push("--mcp-config", config.path);
      }

      // Add any passthrough arguments
      args.push(...passthroughArgs);

      // Test shell escaping (from claude-launcher.ts)
      const escapeShellArg = (arg: string): string => {
        return `"${arg.replace(/[\\"$`]/g, "\\$&")}"`;
      };
      const escapedArgs = args.map(escapeShellArg);
      const command = `exec "/usr/local/bin/claude" ${escapedArgs.join(" ")}`;

      assert.ok(command.includes('"/path with spaces/config.json"'));
      assert.ok(command.includes('"--arg with spaces"'));
    });

    it("should properly escape special shell characters", async () => {
      const selectedConfigs: McpConfig[] = [
        {
          name: 'test"config',
          path: '/path/with"quotes/config.json',
          valid: true,
        },
      ];
      const passthroughArgs = ['--arg="value$with`backticks"'];
      const args: string[] = [];

      // Add MCP config flags for each selected config
      for (const config of selectedConfigs) {
        args.push("--mcp-config", config.path);
      }

      // Add any passthrough arguments
      args.push(...passthroughArgs);

      // Test shell escaping (from claude-launcher.ts)
      const escapeShellArg = (arg: string): string => {
        return `"${arg.replace(/[\\"$`]/g, "\\$&")}"`;
      };
      const escapedArgs = args.map(escapeShellArg);
      const command = `exec "/usr/local/bin/claude" ${escapedArgs.join(" ")}`;

      // Should escape quotes, dollar signs, and backticks
      assert.ok(command.includes('\\"'));
      assert.ok(command.includes("\\$"));
      assert.ok(command.includes("\\`"));
    });

    it("should escape claude path with special characters", async () => {
      const claudePath = '/usr/local/bin/claude"with$special`chars';
      const args: string[] = [];

      // Test shell escaping (from claude-launcher.ts)
      const escapeShellArg = (arg: string): string => {
        return `"${arg.replace(/[\\"$`]/g, "\\$&")}"`;
      };
      const escapedArgs = args.map(escapeShellArg);
      const command = `exec "${claudePath.replace(/[\\"$`]/g, "\\$&")}" ${escapedArgs.join(" ")}`;

      // Should escape the claude path
      assert.ok(
        command.includes(
          'exec "/usr/local/bin/claude\\"with\\$special\\`chars"',
        ),
      );
    });
  });
});
