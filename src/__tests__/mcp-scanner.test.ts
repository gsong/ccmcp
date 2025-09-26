import { mkdir, rm, writeFile } from "node:fs/promises";
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
});
