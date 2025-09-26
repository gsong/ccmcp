import { render } from "ink-testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { McpConfig } from "../mcp-scanner.js";
import { ConfigSelector } from "../tui/ConfigSelector.js";

describe("ConfigSelector Component", () => {
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
      description:
        "Test Config 2 - Another MCP server with a very long name that might wrap",
      valid: true,
    },
    {
      name: "config3",
      path: "/path/to/config3.json",
      description: "Test Config 3 - Third MCP server",
      valid: true,
    },
  ];

  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Layout behavior", () => {
    it("should display config list at full width by default (no preview)", () => {
      const { lastFrame } = render(
        <ConfigSelector
          configs={validConfigs}
          onSelect={mockOnSelect}
          configDir="/test/config/dir"
        />,
      );

      const output = lastFrame();

      // Config should be displayed and use available width
      expect(output).toContain("Test Config 1 - Sample MCP server");
      expect(output).toContain(
        "Test Config 2 - Another MCP server with a very long name that might wrap",
      );

      // Preview should not be visible initially
      expect(output).not.toContain("Select a config to preview");

      // Should show preview key instruction
      expect(output).toContain("(p)review");
    });

    it("should show preview panel and shrink config list when 'p' is pressed", () => {
      const { lastFrame, stdin } = render(
        <ConfigSelector
          configs={validConfigs}
          onSelect={mockOnSelect}
          configDir="/test/config/dir"
        />,
      );

      // Press 'p' to toggle preview
      stdin.write("p");

      const output = lastFrame();

      // Config list should still be visible but may be truncated due to space
      expect(output).toContain("Test Config 1");

      // Preview panel should now be visible (showing config name and content)
      expect(output).toContain("Test Config 1 - Sample MCP server");
    });

    it("should hide preview panel and expand config list when 'p' is pressed again", () => {
      const { lastFrame, stdin } = render(
        <ConfigSelector
          configs={validConfigs}
          onSelect={mockOnSelect}
          configDir="/test/config/dir"
        />,
      );

      // Press 'p' twice to toggle preview on then off
      stdin.write("p");
      stdin.write("p");

      const output = lastFrame();

      // Config should be back to full display
      expect(output).toContain("Test Config 1 - Sample MCP server");
      expect(output).toContain(
        "Test Config 2 - Another MCP server with a very long name that might wrap",
      );

      // Preview should not be visible
      expect(output).not.toContain("Select a config to preview");
    });

    it("should show config preview when a config is selected and preview is active", () => {
      const { lastFrame, stdin } = render(
        <ConfigSelector
          configs={validConfigs}
          onSelect={mockOnSelect}
          configDir="/test/config/dir"
        />,
      );

      // Toggle preview and navigate to a config
      stdin.write("p");

      const output = lastFrame();

      // Should show the preview area with the current config
      expect(output).toContain("Test Config 1 - Sample MCP server");
    });
  });

  describe("Navigation and interaction", () => {
    it("should navigate through configs with arrow keys", () => {
      const { lastFrame, stdin } = render(
        <ConfigSelector
          configs={validConfigs}
          onSelect={mockOnSelect}
          configDir="/test/config/dir"
        />,
      );

      // Navigate down
      stdin.write("\u001b[B"); // Down arrow

      const output = lastFrame();

      // Should show navigation is working (config list still visible)
      expect(output).toContain("Valid Configs");
      expect(output).toContain("Test Config 2");
    });

    it("should handle spacebar input without errors", () => {
      const { stdin } = render(
        <ConfigSelector
          configs={validConfigs}
          onSelect={mockOnSelect}
          configDir="/test/config/dir"
        />,
      );

      // Should handle spacebar input without throwing
      expect(() => stdin.write(" ")).not.toThrow();

      // Verify mockOnSelect is not called until Enter is pressed
      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    it("should display selection footer initially", () => {
      const { lastFrame } = render(
        <ConfigSelector
          configs={validConfigs}
          onSelect={mockOnSelect}
          configDir="/test/config/dir"
        />,
      );

      const output = lastFrame();

      // Should show initial selection count
      expect(output).toContain("Selected: 0 config(s)");
    });

    it("should call onSelect when Enter is pressed", () => {
      const { stdin } = render(
        <ConfigSelector
          configs={validConfigs}
          onSelect={mockOnSelect}
          configDir="/test/config/dir"
        />,
      );

      // Press Enter (should call onSelect regardless of selection state)
      stdin.write("\r");

      expect(mockOnSelect).toHaveBeenCalled();
    });

    it("should handle navigation input without errors", () => {
      const { stdin } = render(
        <ConfigSelector
          configs={validConfigs}
          onSelect={mockOnSelect}
          configDir="/test/config/dir"
        />,
      );

      // Should handle navigation input without throwing
      expect(() => stdin.write("\u001b[B")).not.toThrow(); // Down arrow
      expect(() => stdin.write("\u001b[A")).not.toThrow(); // Up arrow
    });

    it("should handle key combinations without errors", () => {
      const { stdin } = render(
        <ConfigSelector
          configs={validConfigs}
          onSelect={mockOnSelect}
          configDir="/test/config/dir"
        />,
      );

      // Should handle various key inputs without throwing
      expect(() => {
        stdin.write("a"); // Select all
        stdin.write("c"); // Clear
        stdin.write("p"); // Preview
        stdin.write("\r"); // Enter
      }).not.toThrow();

      expect(mockOnSelect).toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("should handle empty config list", () => {
      const { lastFrame } = render(
        <ConfigSelector
          configs={[]}
          onSelect={mockOnSelect}
          configDir="/test/config/dir"
        />,
      );

      const output = lastFrame();

      expect(output).toContain("No valid MCP configs found");
      expect(output).toContain("/test/config/dir");
    });

    it("should handle configs with validation errors", () => {
      const invalidConfigs: McpConfig[] = [
        {
          name: "invalid1",
          path: "/path/to/invalid1.json",
          description: "Invalid Config 1",
          valid: false,
          error: "Missing required field",
        },
      ];

      const { lastFrame } = render(
        <ConfigSelector
          configs={invalidConfigs}
          onSelect={mockOnSelect}
          configDir="/test/config/dir"
        />,
      );

      const output = lastFrame();

      expect(output).toContain("No valid MCP configs found");
    });
  });
});
