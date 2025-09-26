import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { McpConfig } from "../mcp-scanner.js";
import {
  setupInkRenderTest,
  setupNonTTYEnvironment,
  setupReadlineError,
  setupReadlineTest,
} from "./__helpers__/index.js";

// Mock the readline and ink modules

// Mock the ink module
vi.mock("ink", () => ({
  render: vi.fn(),
}));

// Mock the readline module
vi.mock("node:readline", () => ({
  createInterface: vi.fn(),
}));

describe("Config Selection User Interface", () => {
  let mockConsoleLog: ReturnType<typeof vi.spyOn>;
  let mockConsoleError: ReturnType<typeof vi.spyOn>;
  let originalIsTTY: boolean | undefined;

  // Test fixtures
  const validConfigs: McpConfig[] = [
    {
      name: "config1",
      path: "/path/to/config1.json",
      description: "Test Config 1 - Sample MCP server",
      valid: true,
    },
    {
      name: "config2",
      path: "/path/to/config2.json",
      description: "Test Config 2 - Another MCP server",
      valid: true,
    },
    {
      name: "config3",
      path: "/path/to/config3.json",
      description: "Test Config 3 - Third MCP server",
      valid: true,
    },
  ];

  const invalidConfigs: McpConfig[] = [
    {
      name: "invalid1",
      path: "/path/to/invalid1.json",
      description: "Invalid Config 1 - Broken MCP server",
      valid: false,
      error: "Missing required field 'mcpServers'",
    },
    {
      name: "invalid2",
      path: "/path/to/invalid2.json",
      description: "Invalid Config 2 - Malformed JSON",
      valid: false,
      error: "Invalid JSON syntax",
    },
  ];

  const mixedConfigs: McpConfig[] = [...validConfigs, ...invalidConfigs];

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    originalIsTTY = process.stdin.isTTY;
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    if (originalIsTTY !== undefined) {
      Object.defineProperty(process.stdin, "isTTY", {
        value: originalIsTTY,
        configurable: true,
      });
    }
    vi.restoreAllMocks();
  });

  describe("Valid Config Presentation", () => {
    it("should display valid configs with proper formatting in non-TTY environment", async () => {
      const cleanupTTY = setupNonTTYEnvironment();
      await setupReadlineTest("");

      try {
        const { selectConfigs } = await import("../console-selector.js");

        await selectConfigs(validConfigs, "/test/config/dir");

        expect(mockConsoleLog).toHaveBeenCalledWith("\nAvailable MCP configs:");
        expect(mockConsoleLog).toHaveBeenCalledWith("======================");

        // Check that each valid config is displayed with proper numbering
        expect(mockConsoleLog).toHaveBeenCalledWith(
          "1. Test Config 1 - Sample MCP server",
        );
        expect(mockConsoleLog).toHaveBeenCalledWith(
          "2. Test Config 2 - Another MCP server",
        );
        expect(mockConsoleLog).toHaveBeenCalledWith(
          "3. Test Config 3 - Third MCP server",
        );

        // Check instructions are displayed
        expect(mockConsoleLog).toHaveBeenCalledWith(
          "\nEnter config numbers to select (comma-separated, e.g., '1,3,5'):",
        );
        expect(mockConsoleLog).toHaveBeenCalledWith(
          "Press Enter with no input to launch without any configs:",
        );
        expect(mockConsoleLog).toHaveBeenCalledWith(
          "Type 'all' to select all valid configs:",
        );
      } finally {
        cleanupTTY();
      }
    });

    it("should display proper header and instructions", async () => {
      const cleanupTTY = setupNonTTYEnvironment();

      const mockReadlineInterface = await setupReadlineTest("");
      // Override the question implementation to verify the prompt
      mockReadlineInterface.question.mockImplementation(
        (prompt: string, callback: (answer: string) => void) => {
          // Verify the prompt is passed correctly
          expect(prompt).toBe("> ");
          callback("");
        },
      );

      try {
        const { selectConfigs } = await import("../console-selector.js");

        await selectConfigs(validConfigs, "/test/config/dir");

        expect(mockConsoleLog).toHaveBeenCalledWith("\nAvailable MCP configs:");
        expect(mockConsoleLog).toHaveBeenCalledWith("======================");
        // The prompt "> " is passed to readline.question, not logged to console
        expect(mockReadlineInterface.question).toHaveBeenCalledWith(
          "> ",
          expect.any(Function),
        );
      } finally {
        cleanupTTY();
      }
    });

    it("should handle empty config list gracefully", async () => {
      const { selectConfigs } = await import("../console-selector.js");

      const result = await selectConfigs([], "/test/config/dir");

      expect(result).toEqual([]);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "No MCP configs found in /test/config/dir",
      );
    });
  });

  describe("Invalid Config Handling", () => {
    it("should show invalid configs with clear error indicators", async () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        configurable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: false,
        configurable: true,
      });

      await setupReadlineTest("");

      const { selectConfigs } = await import("../console-selector.js");

      await selectConfigs(mixedConfigs, "/test/config/dir");

      // Check invalid configs section is displayed
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "\nInvalid configs (cannot be selected):",
      );

      // Check error indicators
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "   ✗ invalid1 - Invalid Config 1 - Broken MCP server (Missing required field 'mcpServers')",
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "   ✗ invalid2 - Invalid Config 2 - Malformed JSON (Invalid JSON syntax)",
      );
    });

    it("should handle mixed valid and invalid configs", async () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        configurable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: false,
        configurable: true,
      });

      await setupReadlineTest("1,2");

      const { selectConfigs } = await import("../console-selector.js");

      const result = await selectConfigs(mixedConfigs, "/test/config/dir");

      // Should return only valid configs based on selection
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(validConfigs[0]);
      expect(result[1]).toEqual(validConfigs[1]);

      // Both valid and invalid sections should be displayed
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "1. Test Config 1 - Sample MCP server",
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "\nInvalid configs (cannot be selected):",
      );
    });

    it("should show no valid configs message when all configs are invalid", async () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        configurable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: false,
        configurable: true,
      });

      const { selectConfigs } = await import("../console-selector.js");

      const result = await selectConfigs(invalidConfigs, "/test/config/dir");

      expect(result).toEqual([]);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "\nNo valid configs found. Launching Claude Code without MCP configs...",
      );
    });
  });

  describe("User Input Processing", () => {
    it("should select all valid configs when user enters 'all'", async () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        configurable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: false,
        configurable: true,
      });

      await setupReadlineTest("all");

      const { selectConfigs } = await import("../console-selector.js");

      const result = await selectConfigs(mixedConfigs, "/test/config/dir");

      expect(result).toEqual(validConfigs);
    });

    it("should handle case-insensitive 'all' input", async () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        configurable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: false,
        configurable: true,
      });

      await setupReadlineTest("ALL");

      const { selectConfigs } = await import("../console-selector.js");

      const result = await selectConfigs(validConfigs, "/test/config/dir");

      expect(result).toEqual(validConfigs);
    });

    it("should parse comma-separated selections correctly", async () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        configurable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: false,
        configurable: true,
      });

      await setupReadlineTest("1,3");

      const { selectConfigs } = await import("../console-selector.js");

      const result = await selectConfigs(validConfigs, "/test/config/dir");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(validConfigs[0]);
      expect(result[1]).toEqual(validConfigs[2]);
    });

    it("should handle various comma-separated input formats", async () => {
      const testCases = [
        { input: "1, 2, 3", expected: validConfigs },
        { input: "1,2,3", expected: validConfigs },
        { input: "1 , 2 , 3", expected: validConfigs },
        {
          input: "3,1,2",
          expected: [validConfigs[2], validConfigs[0], validConfigs[1]],
        },
      ];

      for (const testCase of testCases) {
        Object.defineProperty(process.stdin, "isTTY", {
          value: false,
          configurable: true,
        });
        Object.defineProperty(process.stdout, "isTTY", {
          value: false,
          configurable: true,
        });

        await setupReadlineTest(testCase.input);

        // Re-import to get fresh module
        vi.resetModules();
        const { selectConfigs } = await import("../console-selector.js");

        const result = await selectConfigs(validConfigs, "/test/config/dir");

        expect(result).toEqual(testCase.expected);
      }
    });

    it("should return empty array for empty input", async () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        configurable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: false,
        configurable: true,
      });

      await setupReadlineTest("");

      const { selectConfigs } = await import("../console-selector.js");

      const result = await selectConfigs(validConfigs, "/test/config/dir");

      expect(result).toEqual([]);
    });

    it("should handle 'none' input", async () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        configurable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: false,
        configurable: true,
      });

      await setupReadlineTest("none");

      const { selectConfigs } = await import("../console-selector.js");

      const result = await selectConfigs(validConfigs, "/test/config/dir");

      expect(result).toEqual([]);
    });

    it("should handle duplicate selections gracefully", async () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        configurable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: false,
        configurable: true,
      });

      await setupReadlineTest("1,1,2,2,1");

      const { selectConfigs } = await import("../console-selector.js");

      const result = await selectConfigs(validConfigs, "/test/config/dir");

      // Should only return unique configs
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(validConfigs[0]);
      expect(result[1]).toEqual(validConfigs[1]);
    });
  });

  describe("TTY vs Non-TTY Behavior", () => {
    it("should use TUI interface in TTY environment", async () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: true,
        configurable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        configurable: true,
      });

      const mockRender = await setupInkRenderTest();

      const { selectConfigs } = await import("../console-selector.js");

      // Start the selection process - it will return a promise
      const selectionPromise = selectConfigs(validConfigs, "/test/config/dir");

      // Give the promise a moment to set up
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockRender).toHaveBeenCalledTimes(1);
      expect(mockRender).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.any(Function),
          props: expect.objectContaining({
            configs: validConfigs,
            configDir: "/test/config/dir",
            onSelect: expect.any(Function),
          }),
        }),
      );

      // Simulate user selection by calling onSelect
      const renderCall = mockRender.mock.calls[0];
      if (renderCall?.[0]?.props?.onSelect) {
        renderCall[0].props.onSelect([validConfigs[0]]);
      }

      await selectionPromise;
    });

    it("should use readline interface in non-TTY environment", async () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        configurable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: false,
        configurable: true,
      });

      const mockReadlineInterface = await setupReadlineTest("1");

      const { selectConfigs } = await import("../console-selector.js");

      await selectConfigs(validConfigs, "/test/config/dir");

      expect(
        vi.mocked(await import("node:readline")).createInterface,
      ).toHaveBeenCalledWith({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
      });
      expect(mockReadlineInterface.question).toHaveBeenCalledWith(
        "> ",
        expect.any(Function),
      );
    });

    it("should detect TTY correctly based on both stdin and stdout", async () => {
      // Test case where only stdin is TTY
      Object.defineProperty(process.stdin, "isTTY", {
        value: true,
        configurable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: false,
        configurable: true,
      });

      await setupReadlineTest("");

      const { selectConfigs } = await import("../console-selector.js");

      await selectConfigs(validConfigs, "/test/config/dir");

      // Should use readline since both stdin AND stdout need to be TTY
      expect(
        vi.mocked(await import("node:readline")).createInterface,
      ).toHaveBeenCalled();
    });
  });

  describe("Error Messages and Validation", () => {
    it("should handle invalid input gracefully with helpful messages", async () => {
      const testCases = [
        { input: "abc", expected: [] },
        { input: "0", expected: [] },
        { input: "99", expected: [] },
        { input: "!@#$", expected: [] },
      ];

      for (const testCase of testCases) {
        Object.defineProperty(process.stdin, "isTTY", {
          value: false,
          configurable: true,
        });
        Object.defineProperty(process.stdout, "isTTY", {
          value: false,
          configurable: true,
        });

        // Clear existing mocks and re-setup
        vi.clearAllMocks();
        await setupReadlineTest(testCase.input);

        const { selectConfigs } = await import("../console-selector.js");

        const result = await selectConfigs(validConfigs, "/test/config/dir");

        // Should fallback to empty selection for invalid input
        expect(result).toEqual(testCase.expected);
      }
    });

    it("should show helpful message for no valid selections", async () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        configurable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: false,
        configurable: true,
      });

      await setupReadlineTest("0,99");

      const { selectConfigs } = await import("../console-selector.js");

      const result = await selectConfigs(validConfigs, "/test/config/dir");

      expect(result).toEqual([]);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "No valid selections found. Launching without configs...",
      );
    });

    it("should handle out-of-range selections", async () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        configurable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: false,
        configurable: true,
      });

      await setupReadlineTest("1,5,10");

      const { selectConfigs } = await import("../console-selector.js");

      const result = await selectConfigs(validConfigs, "/test/config/dir");

      // Should only select valid index (1), ignore out-of-range (5, 10)
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(validConfigs[0]);
    });

    it("should handle mixed valid and invalid input gracefully", async () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        configurable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: false,
        configurable: true,
      });

      await setupReadlineTest("1,abc,2,xyz,3");

      const { selectConfigs } = await import("../console-selector.js");

      const result = await selectConfigs(validConfigs, "/test/config/dir");

      // Should select valid numbers (1, 2, 3), ignore invalid text (abc, xyz)
      expect(result).toEqual(validConfigs);
    });
  });

  describe("Signal Handling and Exit Behavior", () => {
    it("should set up signal listeners for graceful exit", async () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        configurable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: false,
        configurable: true,
      });

      const mockProcessOn = vi.spyOn(process, "once");
      const mockProcessRemoveListener = vi.spyOn(process, "removeListener");

      await setupReadlineTest("");

      const { selectConfigs } = await import("../console-selector.js");

      await selectConfigs(validConfigs, "/test/config/dir");

      // Should set up signal listeners
      expect(mockProcessOn).toHaveBeenCalledWith(
        "SIGINT",
        expect.any(Function),
      );
      expect(mockProcessOn).toHaveBeenCalledWith(
        "SIGTERM",
        expect.any(Function),
      );

      // Should clean up signal listeners
      expect(mockProcessRemoveListener).toHaveBeenCalledWith(
        "SIGINT",
        expect.any(Function),
      );
      expect(mockProcessRemoveListener).toHaveBeenCalledWith(
        "SIGTERM",
        expect.any(Function),
      );

      mockProcessOn.mockRestore();
      mockProcessRemoveListener.mockRestore();
    });

    it("should handle readline errors gracefully", async () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        configurable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: false,
        configurable: true,
      });

      const mockReadlineInterface = await setupReadlineError(
        new Error("Readline error"),
      );

      const { selectConfigs } = await import("../console-selector.js");

      // This should reject with the readline error
      await expect(
        selectConfigs(validConfigs, "/test/config/dir"),
      ).rejects.toThrow("Readline error");

      expect(mockReadlineInterface.close).toHaveBeenCalled();
    });

    it("should clean up readline interface on completion", async () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        configurable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: false,
        configurable: true,
      });

      const mockReadlineInterface = await setupReadlineTest("1");

      const { selectConfigs } = await import("../console-selector.js");

      await selectConfigs(validConfigs, "/test/config/dir");

      expect(mockReadlineInterface.close).toHaveBeenCalled();
    });
  });
});
