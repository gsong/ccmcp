import { mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanupCache } from "../cleanup.js";
import { clearCache, getCacheDir, saveSelections } from "../selection-cache.js";

describe.sequential("cleanupCache", () => {
  let testConfigDir: string;
  let originalCacheHome: string | undefined;

  beforeEach(async () => {
    // Isolate cache directory for this test file
    originalCacheHome = process.env.XDG_CACHE_HOME;
    process.env.XDG_CACHE_HOME = join(
      tmpdir(),
      `ccmcp-cache-cleanup-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    );

    await clearCache();
    testConfigDir = join(tmpdir(), `ccmcp-cleanup-test-${Date.now()}`);
    await mkdir(testConfigDir, { recursive: true });

    const cacheDir = getCacheDir();
    await mkdir(cacheDir, { recursive: true });
  });

  afterEach(async () => {
    await clearCache();
    // Restore original cache home
    if (originalCacheHome === undefined) {
      delete process.env.XDG_CACHE_HOME;
    } else {
      process.env.XDG_CACHE_HOME = originalCacheHome;
    }
  });

  test("removes stale cache entries for non-existent projects", async () => {
    const testBase = join(tmpdir(), `ccmcp-test-${Date.now()}`);
    await mkdir(testBase, { recursive: true });

    const existingProject = join(testBase, "existing");
    const deletedProject = join(testBase, "deleted");

    await mkdir(existingProject, { recursive: true });

    const config1 = join(testConfigDir, "config1.json");
    const config2 = join(testConfigDir, "config2.json");
    await writeFile(config1, JSON.stringify({ mcpServers: {} }), "utf-8");
    await writeFile(config2, JSON.stringify({ mcpServers: {} }), "utf-8");

    await saveSelections(existingProject, testConfigDir, ["config1"]);
    await saveSelections(deletedProject, testConfigDir, ["config2"]);

    const result = await cleanupCache({
      configDir: testConfigDir,
      dryRun: false,
      yes: true,
      verbose: false,
    });

    expect(result.staleCacheEntries).toBe(1);
    expect(result.totalCacheFilesBefore).toBe(2);
    expect(result.totalCacheFilesAfter).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  test("removes cache file when all server references are invalid", async () => {
    const testBase = join(
      tmpdir(),
      `ccmcp-test-all-invalid-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    );
    await mkdir(testBase, { recursive: true });
    const testProject = join(testBase, "project");
    await mkdir(testProject, { recursive: true });

    await saveSelections(testProject, testConfigDir, ["invalid1", "invalid2"]);

    const cacheCountBefore = (
      await cleanupCache({
        configDir: testConfigDir,
        dryRun: true,
        yes: true,
        verbose: false,
      })
    ).totalCacheFilesBefore;

    await saveSelections(testProject, testConfigDir, ["invalid1", "invalid2"]);

    const result = await cleanupCache({
      configDir: testConfigDir,
      dryRun: false,
      yes: true,
      verbose: false,
    });

    expect(result.totalCacheFilesAfter).toBeLessThanOrEqual(cacheCountBefore);
    expect(result.errors).toHaveLength(0);
  });

  test("detects and removes broken symlinks", async () => {
    const brokenLink = join(testConfigDir, "broken.json");
    const nonExistentTarget = join(tmpdir(), "non-existent.json");

    await symlink(nonExistentTarget, brokenLink);

    const result = await cleanupCache({
      configDir: testConfigDir,
      dryRun: false,
      yes: true,
      verbose: false,
    });

    expect(result.brokenSymlinks).toBe(1);
  });

  test("does not remove valid symlinks", async () => {
    const validTarget = join(tmpdir(), `valid-target-${Date.now()}.json`);
    const validLink = join(testConfigDir, "valid.json");

    await writeFile(validTarget, JSON.stringify({ mcpServers: {} }), "utf-8");
    await symlink(validTarget, validLink);

    const result = await cleanupCache({
      configDir: testConfigDir,
      dryRun: false,
      yes: true,
      verbose: false,
    });

    expect(result.brokenSymlinks).toBe(0);
  });

  test("handles empty cache directory gracefully", async () => {
    const result = await cleanupCache({
      configDir: testConfigDir,
      dryRun: false,
      yes: true,
      verbose: false,
    });

    expect(result.brokenSymlinks).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  test("handles non-existent config directory gracefully", async () => {
    const nonExistentDir = join(tmpdir(), `non-existent-${Date.now()}`);

    const result = await cleanupCache({
      configDir: nonExistentDir,
      dryRun: false,
      yes: true,
      verbose: false,
    });

    expect(result.brokenSymlinks).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  test("preserves valid cache entries", async () => {
    const validProject = join(tmpdir(), `valid-${Date.now()}`);
    await mkdir(validProject, { recursive: true });

    const validConfig = join(testConfigDir, "valid.json");
    await writeFile(validConfig, JSON.stringify({ mcpServers: {} }), "utf-8");

    await saveSelections(validProject, testConfigDir, ["valid"]);

    const result = await cleanupCache({
      configDir: testConfigDir,
      dryRun: false,
      yes: true,
      verbose: false,
    });

    expect(result.totalCacheFilesAfter).toBeGreaterThanOrEqual(1);
    expect(result.errors).toHaveLength(0);
  });

  test("reports multiple types of issues in single run", async () => {
    const validProject = join(tmpdir(), `valid-${Date.now()}`);
    const deletedProject = join(tmpdir(), `deleted-${Date.now()}`);

    await mkdir(validProject, { recursive: true });

    const validConfig = join(testConfigDir, "valid.json");
    await writeFile(validConfig, JSON.stringify({ mcpServers: {} }), "utf-8");

    await saveSelections(validProject, testConfigDir, ["valid", "invalid"]);
    await saveSelections(deletedProject, testConfigDir, ["config"]);

    const brokenLink = join(testConfigDir, "broken.json");
    const nonExistentTarget = join(tmpdir(), "non-existent.json");
    await symlink(nonExistentTarget, brokenLink);

    const result = await cleanupCache({
      configDir: testConfigDir,
      dryRun: false,
      yes: true,
      verbose: false,
    });

    expect(result.staleCacheEntries).toBe(1);
    expect(result.invalidServerReferences).toBe(1);
    expect(result.brokenSymlinks).toBe(1);
    expect(result.errors).toHaveLength(0);
  });
});
