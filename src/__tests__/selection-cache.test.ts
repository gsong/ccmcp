import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import {
  clearCache,
  getCacheDir,
  getProjectDir,
  loadSelections,
  saveSelections,
} from "../selection-cache.js";

describe("getCacheDir", () => {
  test("returns a valid cache directory path", () => {
    const result = getCacheDir();
    expect(result).toBeTruthy();
    expect(result).toContain("ccmcp");
  });
});

describe("getProjectDir", () => {
  test("returns a valid project directory", () => {
    const result = getProjectDir();
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });
});

describe("loadSelections and saveSelections", () => {
  const testProjectDir = join(tmpdir(), "ccmcp-test-project");
  const testConfigDir = join(tmpdir(), "ccmcp-test-config");

  afterEach(async () => {
    // Clean up any cache files created during tests
    try {
      await clearCache();
    } catch {
      // Ignore cleanup errors
    }
  });

  test("saves and loads selections correctly", async () => {
    const selections = ["config1", "config2", "config3"];

    await saveSelections(testProjectDir, testConfigDir, selections);
    const loaded = await loadSelections(testProjectDir, testConfigDir);

    expect(loaded).toEqual(new Set(selections));
  });

  test("returns empty set when cache file does not exist", async () => {
    const loaded = await loadSelections(testProjectDir, testConfigDir);
    expect(loaded).toEqual(new Set());
  });

  test("returns empty set when cache file is corrupted", async () => {
    const cacheDir = getCacheDir();
    await mkdir(cacheDir, { recursive: true });

    // Manually create a corrupted cache file
    const hash = "abc123";
    const filePath = join(cacheDir, `selections-${hash}.json`);
    await writeFile(filePath, "corrupted json", "utf-8");

    const loaded = await loadSelections(testProjectDir, testConfigDir);
    expect(loaded).toEqual(new Set());

    await rm(filePath, { force: true });
  });

  test("returns empty set when projectDir does not match", async () => {
    await saveSelections(testProjectDir, testConfigDir, ["config1"]);
    const loaded = await loadSelections("/different/project", testConfigDir);
    expect(loaded).toEqual(new Set());
  });

  test("returns empty set when configDir does not match", async () => {
    await saveSelections(testProjectDir, testConfigDir, ["config1"]);
    const loaded = await loadSelections(testProjectDir, "/different/config");
    expect(loaded).toEqual(new Set());
  });

  test("creates cache directory if it does not exist", async () => {
    const cacheDir = getCacheDir();
    await rm(cacheDir, { recursive: true, force: true });
    await saveSelections(testProjectDir, testConfigDir, ["config1"]);

    const loaded = await loadSelections(testProjectDir, testConfigDir);
    expect(loaded).toEqual(new Set(["config1"]));
  });

  test("different projects have different cache files", async () => {
    const project1 = "/project1";
    const project2 = "/project2";

    await saveSelections(project1, testConfigDir, ["config1"]);
    await saveSelections(project2, testConfigDir, ["config2"]);

    const loaded1 = await loadSelections(project1, testConfigDir);
    const loaded2 = await loadSelections(project2, testConfigDir);

    expect(loaded1).toEqual(new Set(["config1"]));
    expect(loaded2).toEqual(new Set(["config2"]));
  });

  test("deletes cache file when saving empty selections", async () => {
    await saveSelections(testProjectDir, testConfigDir, ["config1", "config2"]);
    const loaded1 = await loadSelections(testProjectDir, testConfigDir);
    expect(loaded1.size).toBe(2);

    await saveSelections(testProjectDir, testConfigDir, []);
    const loaded2 = await loadSelections(testProjectDir, testConfigDir);
    expect(loaded2).toEqual(new Set());
  });
});

describe("clearCache", () => {
  test("removes all cache files", async () => {
    await saveSelections("/project1", "/config1", ["config1"]);
    await saveSelections("/project2", "/config2", ["config2"]);

    await clearCache();

    const loaded1 = await loadSelections("/project1", "/config1");
    const loaded2 = await loadSelections("/project2", "/config2");

    expect(loaded1).toEqual(new Set());
    expect(loaded2).toEqual(new Set());
  });

  test("does not throw when cache directory does not exist", async () => {
    const cacheDir = getCacheDir();
    await rm(cacheDir, { recursive: true, force: true });
    await expect(clearCache()).resolves.not.toThrow();
  });

  test("only removes selection cache files", async () => {
    const cacheDir = getCacheDir();
    await mkdir(cacheDir, { recursive: true });

    const otherFile = join(cacheDir, "other-file.json");
    await writeFile(otherFile, "test", "utf-8");
    await saveSelections("/project1", "/config1", ["config1"]);

    await clearCache();

    const otherFileExists = await readFile(otherFile, "utf-8").then(
      () => true,
      () => false,
    );
    expect(otherFileExists).toBe(true);

    await rm(otherFile, { force: true });
  });
});
