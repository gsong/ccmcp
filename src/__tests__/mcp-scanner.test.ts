import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MissingConfigDirectoryError, scanMcpConfigs } from "../mcp-scanner.js";

describe("MCP Scanner", () => {
  // Create a unique test directory
  const testDir = join(
    tmpdir(),
    `ccmcp-test-${Date.now()}-${Math.random().toString(36).substring(7)}`,
  );

  it("should throw MissingConfigDirectoryError when directory doesn't exist", async () => {
    const nonExistentDir = join(testDir, "nonexistent");

    await expect(scanMcpConfigs(nonExistentDir)).rejects.toThrow(
      MissingConfigDirectoryError,
    );
    await expect(scanMcpConfigs(nonExistentDir)).rejects.toThrow(
      `Config directory not found: ${nonExistentDir}`,
    );

    // Verify it's the correct error type
    try {
      await scanMcpConfigs(nonExistentDir);
      expect.fail("Expected MissingConfigDirectoryError to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(MissingConfigDirectoryError);
      expect((error as MissingConfigDirectoryError).directoryPath).toBe(
        nonExistentDir,
      );
    }
  });

  it("should return empty array when directory exists but is empty", async () => {
    const emptyDir = join(testDir, "empty");
    await mkdir(emptyDir, { recursive: true });

    try {
      const configs = await scanMcpConfigs(emptyDir);
      expect(Array.isArray(configs)).toBe(true);
      expect(configs).toHaveLength(0);
    } finally {
      await rm(emptyDir, { recursive: true });
    }
  });

  it("should return configs when directory exists and has valid config files", async () => {
    const configDir = join(testDir, "configs");
    await mkdir(configDir, { recursive: true });

    // Create a valid config file
    const configContent = JSON.stringify({
      mcpServers: {
        "test-server": {
          command: "test-command",
          args: ["--test"],
        },
      },
    });

    const configPath = join(configDir, "test.json");
    await writeFile(configPath, configContent);

    try {
      const configs = await scanMcpConfigs(configDir);
      expect(Array.isArray(configs)).toBe(true);
      expect(configs).toHaveLength(1);
      expect(configs[0]?.name).toBe("test");
      expect(configs[0]?.valid).toBe(true);
    } finally {
      await rm(configDir, { recursive: true });
    }
  });

  it("MissingConfigDirectoryError properties", () => {
    const testPath = "/some/test/path";
    const error = new MissingConfigDirectoryError(testPath);

    expect(error.name).toBe("MissingConfigDirectoryError");
    expect(error.message).toBe(`Config directory not found: ${testPath}`);
    expect(error.directoryPath).toBe(testPath);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(MissingConfigDirectoryError);
  });

  describe("Multiple Config Processing", () => {
    it("should discover and sort multiple valid configs", async () => {
      const configDir = join(testDir, "multiple-valid");
      await mkdir(configDir, { recursive: true });

      // Create multiple valid configs with different names for sorting test
      const configs = [
        {
          name: "zebra.json",
          content: {
            mcpServers: {
              "zebra-server": {
                command: "zebra-command",
                args: ["--zebra"],
              },
            },
          },
        },
        {
          name: "alpha.json",
          content: {
            mcpServers: {
              "alpha-server": {
                command: "alpha-command",
                args: ["--alpha"],
              },
            },
          },
        },
        {
          name: "middle.json",
          content: {
            mcpServers: {
              "middle-server": {
                command: "middle-command",
                args: ["--middle"],
              },
            },
          },
        },
      ];

      try {
        // Write all config files
        await Promise.all(
          configs.map(async (config) => {
            const configPath = join(configDir, config.name);
            await writeFile(configPath, JSON.stringify(config.content));
          }),
        );

        const results = await scanMcpConfigs(configDir);

        // Verify all configs are discovered
        expect(results).toHaveLength(3);

        // Verify alphabetical sorting
        expect(results[0]?.name).toBe("alpha");
        expect(results[1]?.name).toBe("middle");
        expect(results[2]?.name).toBe("zebra");

        // Verify all are marked as valid
        results.forEach((config) => {
          expect(config.valid).toBe(true);
          expect(config.error).toBeUndefined();
          expect(config.description).toBeTruthy();
          expect(config.path).toContain(configDir);
        });
      } finally {
        await rm(configDir, { recursive: true });
      }
    });

    it("should handle multiple invalid configs with different errors", async () => {
      const configDir = join(testDir, "multiple-invalid");
      await mkdir(configDir, { recursive: true });

      // Create configs with different validation errors
      const invalidConfigs = [
        {
          name: "invalid-command.json",
          content: {
            mcpServers: {
              "broken-server": {
                // Empty command field (invalid)
                command: "",
                args: ["--test"],
              },
            },
          },
        },
        {
          name: "missing-command.json",
          content: {
            mcpServers: {
              "broken-server": {
                // Missing required command field for STDIO server
                args: ["--test"],
              },
            },
          },
        },
        {
          name: "invalid-url.json",
          content: {
            mcpServers: {
              "http-server": {
                type: "http",
                // Invalid URL
                url: "not-a-url",
              },
            },
          },
        },
      ];

      try {
        // Write all invalid config files
        await Promise.all(
          invalidConfigs.map(async (config) => {
            const configPath = join(configDir, config.name);
            await writeFile(configPath, JSON.stringify(config.content));
          }),
        );

        const results = await scanMcpConfigs(configDir);

        // Verify all configs are discovered
        expect(results).toHaveLength(3);

        // Verify alphabetical sorting even for invalid configs
        expect(results[0]?.name).toBe("invalid-command");
        expect(results[1]?.name).toBe("invalid-url");
        expect(results[2]?.name).toBe("missing-command");

        // Verify all are marked as invalid with error messages
        results.forEach((config) => {
          expect(config.valid).toBe(false);
          expect(config.error).toBeTruthy();
          expect(config.description).toContain("Invalid config:");
          expect(config.path).toContain(configDir);
        });

        // Verify specific error details
        const invalidCommandConfig = results.find(
          (c) => c.name === "invalid-command",
        );
        expect(invalidCommandConfig?.error).toContain("command");

        const invalidUrlConfig = results.find((c) => c.name === "invalid-url");
        expect(invalidUrlConfig?.error).toContain("url");

        const missingCommandConfig = results.find(
          (c) => c.name === "missing-command",
        );
        expect(missingCommandConfig?.error).toContain("command");
      } finally {
        await rm(configDir, { recursive: true });
      }
    });

    it("should properly categorize mixed valid and invalid configs", async () => {
      const configDir = join(testDir, "mixed-configs");
      await mkdir(configDir, { recursive: true });

      // Create a mix of valid and invalid configs
      const mixedConfigs = [
        {
          name: "valid-config.json",
          content: {
            mcpServers: {
              "valid-server": {
                command: "valid-command",
                args: ["--valid"],
              },
            },
          },
          shouldBeValid: true,
        },
        {
          name: "invalid-config.json",
          content: {
            mcpServers: {
              "invalid-server": {
                // Empty command (invalid)
                command: "",
              },
            },
          },
          shouldBeValid: false,
        },
        {
          name: "another-valid.json",
          content: {
            mcpServers: {
              "another-server": {
                command: "another-command",
              },
            },
          },
          shouldBeValid: true,
        },
        {
          name: "broken-config.json",
          content: {
            mcpServers: {
              "broken-server": {
                type: "http",
                // Invalid URL
                url: "invalid-url",
              },
            },
          },
          shouldBeValid: false,
        },
      ];

      try {
        // Write all config files
        await Promise.all(
          mixedConfigs.map(async (config) => {
            const configPath = join(configDir, config.name);
            await writeFile(configPath, JSON.stringify(config.content));
          }),
        );

        const results = await scanMcpConfigs(configDir);

        // Verify all configs are discovered
        expect(results).toHaveLength(4);

        // Verify alphabetical sorting
        expect(results[0]?.name).toBe("another-valid");
        expect(results[1]?.name).toBe("broken-config");
        expect(results[2]?.name).toBe("invalid-config");
        expect(results[3]?.name).toBe("valid-config");

        // Verify proper categorization
        const anotherValid = results.find((c) => c.name === "another-valid");
        expect(anotherValid?.valid).toBe(true);
        expect(anotherValid?.error).toBeUndefined();

        const brokenConfig = results.find((c) => c.name === "broken-config");
        expect(brokenConfig?.valid).toBe(false);
        expect(brokenConfig?.error).toBeTruthy();

        const invalidConfig = results.find((c) => c.name === "invalid-config");
        expect(invalidConfig?.valid).toBe(false);
        expect(invalidConfig?.error).toBeTruthy();

        const validConfig = results.find((c) => c.name === "valid-config");
        expect(validConfig?.valid).toBe(true);
        expect(validConfig?.error).toBeUndefined();

        // Verify that valid configs have proper descriptions
        expect(anotherValid?.description).not.toContain("Invalid config:");
        expect(validConfig?.description).not.toContain("Invalid config:");

        // Verify that invalid configs have error descriptions
        expect(brokenConfig?.description).toContain("Invalid config:");
        expect(invalidConfig?.description).toContain("Invalid config:");
      } finally {
        await rm(configDir, { recursive: true });
      }
    });
  });

  describe("File System Edge Cases", () => {
    it("should handle permission denied files gracefully", async () => {
      const configDir = join(testDir, "permission-test");
      await mkdir(configDir, { recursive: true });

      const configPath = join(configDir, "permission-denied.json");
      const validContent = JSON.stringify({
        mcpServers: {
          "test-server": {
            command: "test-command",
            args: ["--test"],
          },
        },
      });

      try {
        // Create the file first
        await writeFile(configPath, validContent);

        // Make the file unreadable using chmod 000
        await chmod(configPath, 0o000);

        const results = await scanMcpConfigs(configDir);

        // Should still discover the file but mark it as invalid
        expect(results).toHaveLength(1);
        expect(results[0]?.name).toBe("permission-denied");
        expect(results[0]?.valid).toBe(false);
        expect(results[0]?.error).toBeTruthy();
        expect(results[0]?.description).toContain("Invalid config:");

        // Error should relate to permission or access
        const errorMessage = results[0]?.error?.toLowerCase();
        expect(
          errorMessage?.includes("permission") ||
            errorMessage?.includes("access") ||
            errorMessage?.includes("eacces") ||
            errorMessage?.includes("eperm"),
        ).toBe(true);
      } finally {
        // Restore permissions before cleanup
        try {
          await chmod(configPath, 0o644);
        } catch {
          // Ignore if already cleaned up
        }
        await rm(configDir, { recursive: true });
      }
    });

    it("should handle JSON syntax errors with clear error messages", async () => {
      const configDir = join(testDir, "json-syntax-test");
      await mkdir(configDir, { recursive: true });

      // Create files with different types of JSON syntax errors
      const syntaxErrorFiles = [
        {
          name: "missing-brace.json",
          content: `{
            "mcpServers": {
              "test-server": {
                "command": "test-command"
              }
            // Missing closing brace for mcpServers
          }`,
        },
        {
          name: "trailing-comma.json",
          content: `{
            "mcpServers": {
              "test-server": {
                "command": "test-command",
                "args": ["--test"],
              },
            },
          }`,
        },
        {
          name: "unquoted-keys.json",
          content: `{
            mcpServers: {
              test-server: {
                command: "test-command"
              }
            }
          }`,
        },
      ];

      try {
        // Write all files with syntax errors
        await Promise.all(
          syntaxErrorFiles.map(async (file) => {
            const filePath = join(configDir, file.name);
            await writeFile(filePath, file.content);
          }),
        );

        const results = await scanMcpConfigs(configDir);

        // Verify all files are discovered
        expect(results).toHaveLength(3);

        // Verify alphabetical sorting
        expect(results[0]?.name).toBe("missing-brace");
        expect(results[1]?.name).toBe("trailing-comma");
        expect(results[2]?.name).toBe("unquoted-keys");

        // Verify all are marked as invalid with JSON syntax error messages
        results.forEach((config) => {
          expect(config.valid).toBe(false);
          expect(config.error).toBeTruthy();
          expect(config.description).toContain("Invalid config:");
          expect(config.path).toContain(configDir);

          // Error should mention JSON syntax
          const errorMessage = config.error?.toLowerCase();
          expect(errorMessage).toContain("json syntax error");
        });

        // Verify specific errors contain useful details
        const missingBraceConfig = results.find(
          (c) => c.name === "missing-brace",
        );
        expect(missingBraceConfig?.error).toContain("JSON syntax error:");

        const trailingCommaConfig = results.find(
          (c) => c.name === "trailing-comma",
        );
        expect(trailingCommaConfig?.error).toContain("JSON syntax error:");

        const unquotedKeysConfig = results.find(
          (c) => c.name === "unquoted-keys",
        );
        expect(unquotedKeysConfig?.error).toContain("JSON syntax error:");
      } finally {
        await rm(configDir, { recursive: true });
      }
    });

    it("should filter and only process .json files", async () => {
      const configDir = join(testDir, "file-filter-test");
      await mkdir(configDir, { recursive: true });

      // Create a mix of JSON and non-JSON files
      const files = [
        {
          name: "valid-config.json",
          content: JSON.stringify({
            mcpServers: {
              "test-server": {
                command: "test-command",
              },
            },
          }),
          shouldBeProcessed: true,
        },
        {
          name: "readme.txt",
          content: "This is a text file that should be ignored",
          shouldBeProcessed: false,
        },
        {
          name: "README.md",
          content: "# This is a markdown file that should be ignored",
          shouldBeProcessed: false,
        },
        {
          name: "config.yaml",
          content: "mcpServers:\n  test: command",
          shouldBeProcessed: false,
        },
        {
          name: "another-config.json",
          content: JSON.stringify({
            mcpServers: {
              "another-server": {
                command: "another-command",
              },
            },
          }),
          shouldBeProcessed: true,
        },
        {
          name: "script.js",
          content: "console.log('This is a JavaScript file');",
          shouldBeProcessed: false,
        },
        {
          name: "data.xml",
          content: "<config><server>test</server></config>",
          shouldBeProcessed: false,
        },
      ];

      try {
        // Write all files
        await Promise.all(
          files.map(async (file) => {
            const filePath = join(configDir, file.name);
            await writeFile(filePath, file.content);
          }),
        );

        const results = await scanMcpConfigs(configDir);

        // Should only process the 2 JSON files
        expect(results).toHaveLength(2);

        // Verify only JSON files are processed
        const processedNames = results.map((r) => r.name).sort();
        expect(processedNames).toEqual(["another-config", "valid-config"]);

        // Verify both JSON configs are valid
        results.forEach((config) => {
          expect(config.valid).toBe(true);
          expect(config.error).toBeUndefined();
          expect(config.description).toBeTruthy();
          expect(config.path).toContain(configDir);
          expect(config.name).not.toContain(".json"); // Name should not include extension
        });

        // Verify the specific configs
        const validConfig = results.find((c) => c.name === "valid-config");
        expect(validConfig?.description).toContain("test-server");

        const anotherConfig = results.find((c) => c.name === "another-config");
        expect(anotherConfig?.description).toContain("another-server");
      } finally {
        await rm(configDir, { recursive: true });
      }
    });
  });

  describe("Integration Behavior", () => {
    it("should generate proper description formats for different server configurations", async () => {
      const configDir = join(testDir, "description-test");
      await mkdir(configDir, { recursive: true });

      // Test different description generation scenarios
      const descriptionTestConfigs = [
        {
          name: "test-server.json",
          content: {
            mcpServers: {
              "test-server": {
                command: "test-command",
              },
            },
          },
          expectedDescription: "test-server", // Single server matching filename
        },
        {
          name: "config.json",
          content: {
            mcpServers: {
              "different-server": {
                command: "different-command",
              },
            },
          },
          expectedDescription: "config → different-server", // Single server not matching filename
        },
        {
          name: "multiple.json",
          content: {
            mcpServers: {
              "alpha-server": {
                command: "alpha-command",
              },
              "beta-server": {
                command: "beta-command",
              },
              "gamma-server": {
                command: "gamma-command",
              },
            },
          },
          expectedDescription:
            "multiple → alpha-server, beta-server, gamma-server", // Multiple servers
        },
      ];

      try {
        // Write all config files
        await Promise.all(
          descriptionTestConfigs.map(async (config) => {
            const configPath = join(configDir, config.name);
            await writeFile(configPath, JSON.stringify(config.content));
          }),
        );

        const results = await scanMcpConfigs(configDir);

        // Verify all configs are discovered and valid
        expect(results).toHaveLength(3);
        results.forEach((config) => {
          expect(config.valid).toBe(true);
          expect(config.error).toBeUndefined();
        });

        // Verify specific description formats
        const testServerConfig = results.find((c) => c.name === "test-server");
        expect(testServerConfig?.description).toBe("test-server");

        const configConfig = results.find((c) => c.name === "config");
        expect(configConfig?.description).toBe("config → different-server");

        const multipleConfig = results.find((c) => c.name === "multiple");
        expect(multipleConfig?.description).toBe(
          "multiple → alpha-server, beta-server, gamma-server",
        );

        // Verify alphabetical sorting is maintained
        expect(results[0]?.name).toBe("config");
        expect(results[1]?.name).toBe("multiple");
        expect(results[2]?.name).toBe("test-server");
      } finally {
        await rm(configDir, { recursive: true });
      }
    });

    it("should handle parallel processing of multiple files without issues", async () => {
      const configDir = join(testDir, "parallel-test");
      await mkdir(configDir, { recursive: true });

      // Create many config files to test parallel processing
      const parallelConfigs = Array.from({ length: 10 }, (_, i) => ({
        name: `config-${i.toString().padStart(2, "0")}.json`,
        content: {
          mcpServers: {
            [`server-${i}`]: {
              command: `command-${i}`,
              args: [`--arg-${i}`],
            },
          },
        },
      }));

      try {
        // Write all config files
        await Promise.all(
          parallelConfigs.map(async (config) => {
            const configPath = join(configDir, config.name);
            await writeFile(configPath, JSON.stringify(config.content));
          }),
        );

        const startTime = Date.now();
        const results = await scanMcpConfigs(configDir);
        const endTime = Date.now();

        // Verify all configs are discovered
        expect(results).toHaveLength(10);

        // Verify all are valid
        results.forEach((config) => {
          expect(config.valid).toBe(true);
          expect(config.error).toBeUndefined();
          expect(config.description).toBeTruthy();
        });

        // Verify alphabetical sorting is maintained
        const names = results.map((r) => r.name);
        const sortedNames = [...names].sort();
        expect(names).toEqual(sortedNames);

        // Verify parallel processing is reasonably fast (should complete well under 1 second)
        const processingTime = endTime - startTime;
        expect(processingTime).toBeLessThan(1000);

        // Verify each config has the expected server name in description
        results.forEach((config, index) => {
          const expectedServerName = `server-${index}`;
          expect(config.description).toContain(expectedServerName);
        });
      } finally {
        await rm(configDir, { recursive: true });
      }
    });
  });
});
