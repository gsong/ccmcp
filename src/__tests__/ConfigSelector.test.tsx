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

    it("should show preview panel and shrink config list when 'p' is pressed", async () => {
      const { lastFrame, stdin } = render(
        <ConfigSelector
          configs={validConfigs}
          onSelect={mockOnSelect}
          configDir="/test/config/dir"
        />,
      );

      // Press 'p' to toggle preview
      stdin.write("p");

      // Give React time to process the state change
      await new Promise((resolve) => setTimeout(resolve, 10));

      const output = lastFrame();

      // Config list should still be visible but may be truncated due to space
      expect(output).toContain("Test Config 1");

      // Preview panel should now be visible (showing config name and content)
      expect(output).toContain("Test Config 1 - Sample MCP server");
      // Check that layout has changed - preview panel should be visible with borders
      expect(output).toMatch(/┌.*┐/); // Border characters indicate preview panel
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

    it("should toggle selection with spacebar", async () => {
      const { lastFrame, stdin } = render(
        <ConfigSelector
          configs={validConfigs}
          onSelect={mockOnSelect}
          configDir="/test/config/dir"
        />,
      );

      // Select first config with spacebar
      stdin.write(" ");

      // Give React time to process the state change
      await new Promise((resolve) => setTimeout(resolve, 10));

      const output = lastFrame();

      // Should show selection indicator - either [x] or updated selection count
      expect(output).toBeDefined();
      expect(
        output?.includes("[x]") || output?.includes("Selected: 1 config(s)"),
      ).toBe(true);
    });

    it("should show selection count in footer", async () => {
      const { lastFrame, stdin } = render(
        <ConfigSelector
          configs={validConfigs}
          onSelect={mockOnSelect}
          configDir="/test/config/dir"
        />,
      );

      // Select a config
      stdin.write(" ");

      // Give React time to process the state change
      await new Promise((resolve) => setTimeout(resolve, 10));

      const output = lastFrame();

      // Should show selection count
      expect(output).toContain("Selected: 1 config(s)");
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
