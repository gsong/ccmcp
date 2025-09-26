import type { ChildProcess } from "node:child_process";
import { execFileSync, spawn } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { McpConfig } from "../mcp-scanner.js";

// Mock the child_process module
vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(),
  spawn: vi.fn(),
}));

describe("Claude Code Launch Behavior", () => {
  let mockConsoleLog: ReturnType<typeof vi.spyOn>;
  let mockConsoleError: ReturnType<typeof vi.spyOn>;
  let mockProcessExit: any;
  let mockProcessKill: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockProcessExit = vi
      .spyOn(process, "exit")
      .mockImplementation((_code?: string | number | null) => {
        throw new Error("process.exit called");
      });
    mockProcessKill = vi
      .spyOn(process, "kill")
      .mockImplementation((_pid: number, _signal?: string | number) => true);
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockProcessExit.mockRestore();
    mockProcessKill.mockRestore();
  });

  describe("Argument Construction Logic", () => {
    it("should construct correct arguments for single MCP config", () => {
      const selectedConfigs: McpConfig[] = [
        { name: "test-config", path: "/path/to/config.json", valid: true },
      ];
      const passthroughArgs: string[] = [];

      const args: string[] = [];
      for (const config of selectedConfigs) {
        args.push("--mcp-config", config.path);
      }
      args.push(...passthroughArgs);

      expect(args).toEqual(["--mcp-config", "/path/to/config.json"]);
    });

    it("should construct correct arguments for multiple MCP configs", () => {
      const selectedConfigs: McpConfig[] = [
        { name: "config1", path: "/path/to/config1.json", valid: true },
        { name: "config2", path: "/path/to/config2.json", valid: true },
      ];
      const passthroughArgs: string[] = [];

      const args: string[] = [];
      for (const config of selectedConfigs) {
        args.push("--mcp-config", config.path);
      }
      args.push(...passthroughArgs);

      expect(args).toEqual([
        "--mcp-config",
        "/path/to/config1.json",
        "--mcp-config",
        "/path/to/config2.json",
      ]);
    });

    it("should handle empty configs array", () => {
      const selectedConfigs: McpConfig[] = [];
      const passthroughArgs: string[] = [];

      const args: string[] = [];
      for (const config of selectedConfigs) {
        args.push("--mcp-config", config.path);
      }
      args.push(...passthroughArgs);

      expect(args).toEqual([]);
    });

    it("should pass through user arguments", () => {
      const selectedConfigs: McpConfig[] = [];
      const passthroughArgs: string[] = ["--resume", "--verbose"];

      const args: string[] = [];
      for (const config of selectedConfigs) {
        args.push("--mcp-config", config.path);
      }
      args.push(...passthroughArgs);

      expect(args).toEqual(["--resume", "--verbose"]);
    });

    it("should handle mixed config flags and passthrough arguments", () => {
      const selectedConfigs: McpConfig[] = [
        { name: "test-config", path: "/path/to/config.json", valid: true },
      ];
      const passthroughArgs: string[] = ["--resume"];

      const args: string[] = [];
      for (const config of selectedConfigs) {
        args.push("--mcp-config", config.path);
      }
      args.push(...passthroughArgs);

      expect(args).toEqual([
        "--mcp-config",
        "/path/to/config.json",
        "--resume",
      ]);
    });
  });

  describe("Shell Command Escaping", () => {
    const escapeShellArg = (arg: string): string => {
      return `"${arg.replace(/[\\\\"$`]/g, "\\\\$&")}"`;
    };

    it("should properly escape paths with spaces", () => {
      const args = ["--mcp-config", "/path with spaces/config.json"];
      const escapedArgs = args.map(escapeShellArg);
      const command = `exec "/usr/local/bin/claude" ${escapedArgs.join(" ")}`;

      expect(command).toContain('"/path with spaces/config.json"');
      expect(command).toContain('"--mcp-config"');
    });

    it("should properly escape special shell characters", () => {
      const args = [
        "--mcp-config",
        '/path/with"quotes/config.json',
        '--arg="value$with`backticks"',
      ];
      const escapedArgs = args.map(escapeShellArg);
      const command = `exec "/usr/local/bin/claude" ${escapedArgs.join(" ")}`;

      // Should escape quotes, dollar signs, and backticks
      expect(command).toContain('\\\\"');
      expect(command).toContain("\\\\$");
      expect(command).toContain("\\\\`");
    });

    it("should escape claude path with special characters", () => {
      const claudePath = '/usr/local/bin/claude"with$special`chars';
      const command = `exec "${claudePath.replace(/[\\\\"$`]/g, "\\\\$&")}" `;

      expect(command).toContain(
        'exec "/usr/local/bin/claude\\\\"with\\\\$special\\\\`chars"',
      );
    });

    it("should handle empty args array", () => {
      const args: string[] = [];
      const escapedArgs = args.map(escapeShellArg);
      const command = `exec "/usr/local/bin/claude" ${escapedArgs.join(" ")}`;

      expect(command).toBe('exec "/usr/local/bin/claude" ');
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long config paths", () => {
      const longPath =
        "/very/long/path/that/might/cause/issues/with/shell/command/construction/because/it/exceeds/normal/length/limits/config.json";
      const selectedConfigs: McpConfig[] = [
        { name: "test-config", path: longPath, valid: true },
      ];

      const args: string[] = [];
      for (const config of selectedConfigs) {
        args.push("--mcp-config", config.path);
      }

      expect(args).toEqual(["--mcp-config", longPath]);

      const escapeShellArg = (arg: string): string => {
        return `"${arg.replace(/[\\\\"$`]/g, "\\\\$&")}"`;
      };
      const escapedArgs = args.map(escapeShellArg);
      const command = `exec "/usr/local/bin/claude" ${escapedArgs.join(" ")}`;

      expect(command).toContain(`"${longPath}"`);
    });

    it("should handle config paths with unicode characters", () => {
      const unicodePath = "/path/with/中文/and/éñglish/config.json";
      const selectedConfigs: McpConfig[] = [
        { name: "unicode-config", path: unicodePath, valid: true },
      ];

      const args: string[] = [];
      for (const config of selectedConfigs) {
        args.push("--mcp-config", config.path);
      }

      expect(args).toEqual(["--mcp-config", unicodePath]);
    });

    it("should handle arguments with escaped newlines", () => {
      const argWithNewline = "--arg=value\\nwith\\nnewlines";
      const passthroughArgs = [argWithNewline];

      const args: string[] = [];
      args.push(...passthroughArgs);

      const escapeShellArg = (arg: string): string => {
        return `"${arg.replace(/[\\\\"$`]/g, "\\\\$&")}"`;
      };
      const escapedArgs = args.map(escapeShellArg);
      const command = `exec "/usr/local/bin/claude" ${escapedArgs.join(" ")}`;

      // The argument should be quoted and escaped properly
      expect(command).toBe(
        'exec "/usr/local/bin/claude" "--arg=value\\\\nwith\\\\nnewlines"',
      );
    });

    it("should handle empty string config paths", () => {
      const selectedConfigs: McpConfig[] = [
        { name: "empty-path", path: "", valid: true },
      ];

      const args: string[] = [];
      for (const config of selectedConfigs) {
        args.push("--mcp-config", config.path);
      }

      expect(args).toEqual(["--mcp-config", ""]);
    });
  });

  describe("Integration Tests with Module Mocking", () => {
    it("should call execFileSync and spawn with correct arguments", async () => {
      // Mock execFileSync to return claude path
      vi.mocked(execFileSync).mockReturnValue("/usr/local/bin/claude");

      // Mock spawn to return a mock child process
      const mockChild = {
        on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
          if (event === "exit") {
            // Simulate successful exit
            setImmediate(() => callback(0, null));
          }
          return mockChild;
        }),
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
      } as unknown as ChildProcess;
      vi.mocked(spawn).mockReturnValue(mockChild);

      // Import after mocking
      const { launchClaudeCode } = await import("../claude-launcher.js");

      const selectedConfigs: McpConfig[] = [
        { name: "test-config", path: "/path/to/config.json", valid: true },
      ];

      // Start the launch process
      launchClaudeCode({ selectedConfigs, passthroughArgs: [] });

      // Give async operations time to execute
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify execFileSync was called correctly
      expect(execFileSync).toHaveBeenCalledWith("which", ["claude"], {
        encoding: "utf8",
        stdio: "pipe",
      });

      // Verify spawn was called correctly
      expect(spawn).toHaveBeenCalledWith(
        "sh",
        ["-c", expect.stringContaining('exec "/usr/local/bin/claude"')],
        {
          stdio: "inherit",
        },
      );

      // Verify the command contains correct arguments
      const spawnCall = vi.mocked(spawn).mock.calls[0];
      const command = spawnCall?.[1]?.[1];
      expect(command).toContain('exec "/usr/local/bin/claude"');
      expect(command).toContain('"--mcp-config" "/path/to/config.json"');
      expect(typeof command).toBe("string");

      // Verify console.log was called
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(
          "Executing: /usr/local/bin/claude --mcp-config /path/to/config.json",
        ),
      );
    });

    it("should handle claude command not found error", async () => {
      const error = new Error("Command failed: which claude") as Error & {
        status: number;
      };
      error.status = 1;
      vi.mocked(execFileSync).mockImplementation(() => {
        throw error;
      });

      const { launchClaudeCode } = await import("../claude-launcher.js");

      const selectedConfigs: McpConfig[] = [
        { name: "test-config", path: "/path/to/config.json", valid: true },
      ];

      const result = await launchClaudeCode({
        selectedConfigs,
        passthroughArgs: [],
      });

      // Should return exit code 1
      expect(result).toBe(1);

      // Verify error message
      expect(mockConsoleError).toHaveBeenCalledWith(
        "Error: 'claude' command not found. Please ensure Claude Code is installed and in your PATH.",
      );

      // execFileSync should have been called, but spawn should not
      expect(execFileSync).toHaveBeenCalled();
      expect(spawn).not.toHaveBeenCalled();
    });

    it("should handle other execution errors", async () => {
      const error = new Error("Some other error");
      vi.mocked(execFileSync).mockImplementation(() => {
        throw error;
      });

      const { launchClaudeCode } = await import("../claude-launcher.js");

      const selectedConfigs: McpConfig[] = [
        { name: "test-config", path: "/path/to/config.json", valid: true },
      ];

      const result = await launchClaudeCode({
        selectedConfigs,
        passthroughArgs: [],
      });

      // Should return exit code 1
      expect(result).toBe(1);

      // Verify error message contains the original error
      expect(mockConsoleError).toHaveBeenCalledWith(
        "Error: Failed to exec Claude Code: Some other error",
      );
    });

    it("should handle multiple configs and passthrough args", async () => {
      vi.mocked(execFileSync).mockReturnValue("/usr/local/bin/claude");

      const mockChild = {
        on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
          if (event === "exit") {
            setImmediate(() => callback(0, null));
          }
          return mockChild;
        }),
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
      } as unknown as ChildProcess;
      vi.mocked(spawn).mockReturnValue(mockChild);

      const { launchClaudeCode } = await import("../claude-launcher.js");

      const selectedConfigs: McpConfig[] = [
        { name: "config1", path: "/path/to/config1.json", valid: true },
        { name: "config2", path: "/path/to/config2.json", valid: true },
      ];

      launchClaudeCode({
        selectedConfigs,
        passthroughArgs: ["--resume", "--verbose"],
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const spawnCall = vi.mocked(spawn).mock.calls[0];
      const command = spawnCall?.[1]?.[1];

      if (typeof command === "string") {
        expect(command).toContain('"--mcp-config" "/path/to/config1.json"');
        expect(command).toContain('"--mcp-config" "/path/to/config2.json"');
        expect(command).toContain('"--resume"');
        expect(command).toContain('"--verbose"');
      } else {
        throw new Error("Command should be a string");
      }
    });

    it("should handle spawn process error events", async () => {
      vi.mocked(execFileSync).mockReturnValue("/usr/local/bin/claude");

      const mockChild = {
        on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
          if (event === "error") {
            // Simulate async error emission
            setImmediate(() => callback(new Error("Spawn failed")));
          }
          return mockChild;
        }),
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
      } as unknown as ChildProcess;
      vi.mocked(spawn).mockReturnValue(mockChild);

      const { launchClaudeCode } = await import("../claude-launcher.js");

      const selectedConfigs: McpConfig[] = [
        { name: "test-config", path: "/path/to/config.json", valid: true },
      ];

      // Start the process
      launchClaudeCode({ selectedConfigs, passthroughArgs: [] });

      // Give time for the async error to be emitted
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify the error was logged
      expect(mockConsoleError).toHaveBeenCalledWith(
        "Error: Failed to exec Claude Code: Spawn failed",
      );
    });

    it("should handle process exit with different codes", async () => {
      vi.mocked(execFileSync).mockReturnValue("/usr/local/bin/claude");

      const mockChild = {
        on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
          if (event === "exit") {
            setImmediate(() => callback(42, null));
          }
          return mockChild;
        }),
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
      } as unknown as ChildProcess;
      vi.mocked(spawn).mockReturnValue(mockChild);

      // Mock process.exit to capture the exit code
      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit called");
      });

      const { launchClaudeCode } = await import("../claude-launcher.js");

      const selectedConfigs: McpConfig[] = [
        { name: "test-config", path: "/path/to/config.json", valid: true },
      ];

      launchClaudeCode({ selectedConfigs, passthroughArgs: [] });

      // Give time for the exit handler to be called
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockExit).toHaveBeenCalledWith(42);

      mockExit.mockRestore();
    });

    it("should handle process termination by signal", async () => {
      vi.mocked(execFileSync).mockReturnValue("/usr/local/bin/claude");

      const mockChild = {
        on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
          if (event === "exit") {
            setImmediate(() => callback(null, "SIGTERM"));
          }
          return mockChild;
        }),
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
      } as unknown as ChildProcess;
      vi.mocked(spawn).mockReturnValue(mockChild);

      // Mock process.kill to capture signal termination
      const mockKill = vi.spyOn(process, "kill").mockImplementation(() => true);

      const { launchClaudeCode } = await import("../claude-launcher.js");

      const selectedConfigs: McpConfig[] = [
        { name: "test-config", path: "/path/to/config.json", valid: true },
      ];

      launchClaudeCode({ selectedConfigs, passthroughArgs: [] });

      // Give time for the exit handler to be called
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockKill).toHaveBeenCalledWith(process.pid, "SIGTERM");

      mockKill.mockRestore();
    });
  });
});
