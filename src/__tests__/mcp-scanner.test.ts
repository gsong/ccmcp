import assert from "node:assert";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { MissingConfigDirectoryError, scanMcpConfigs } from "../mcp-scanner.js";

test("MCP Scanner", async (t) => {
  // Create a unique test directory
  const testDir = join(
    tmpdir(),
    `ccmcp-test-${Date.now()}-${Math.random().toString(36).substring(7)}`,
  );

  await t.test(
    "should throw MissingConfigDirectoryError when directory doesn't exist",
    async () => {
      const nonExistentDir = join(testDir, "nonexistent");

      await assert.rejects(
        async () => {
          await scanMcpConfigs(nonExistentDir);
        },
        {
          name: "MissingConfigDirectoryError",
          message: `Config directory not found: ${nonExistentDir}`,
        },
      );

      // Verify it's the correct error type
      try {
        await scanMcpConfigs(nonExistentDir);
        assert.fail("Expected MissingConfigDirectoryError to be thrown");
      } catch (error) {
        assert.ok(error instanceof MissingConfigDirectoryError);
        assert.strictEqual(error.directoryPath, nonExistentDir);
      }
    },
  );

  await t.test(
    "should return empty array when directory exists but is empty",
    async () => {
      const emptyDir = join(testDir, "empty");
      await mkdir(emptyDir, { recursive: true });

      try {
        const configs = await scanMcpConfigs(emptyDir);
        assert.strictEqual(Array.isArray(configs), true);
        assert.strictEqual(configs.length, 0);
      } finally {
        await rm(emptyDir, { recursive: true });
      }
    },
  );

  await t.test(
    "should return configs when directory exists and has valid config files",
    async () => {
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
        assert.strictEqual(Array.isArray(configs), true);
        assert.strictEqual(configs.length, 1);
        assert.strictEqual(configs[0]?.name, "test");
        assert.strictEqual(configs[0]?.valid, true);
      } finally {
        await rm(configDir, { recursive: true });
      }
    },
  );

  await t.test("MissingConfigDirectoryError properties", async () => {
    const testPath = "/some/test/path";
    const error = new MissingConfigDirectoryError(testPath);

    assert.strictEqual(error.name, "MissingConfigDirectoryError");
    assert.strictEqual(
      error.message,
      `Config directory not found: ${testPath}`,
    );
    assert.strictEqual(error.directoryPath, testPath);
    assert.ok(error instanceof Error);
    assert.ok(error instanceof MissingConfigDirectoryError);
  });
});
