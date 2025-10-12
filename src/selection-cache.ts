import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { join } from "node:path";

export interface SelectionCache {
  version: 1;
  projectDir: string;
  configDir: string;
  lastModified: string;
  selectedConfigs: string[];
}

export function getCacheDir(): string {
  const platformName = platform();

  if (platformName === "win32") {
    return join(
      process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"),
      "ccmcp",
    );
  }

  const xdgCache = process.env.XDG_CACHE_HOME;
  if (xdgCache) {
    return join(xdgCache, "ccmcp");
  }

  return join(homedir(), ".cache", "ccmcp");
}

export function getProjectDir(): string {
  try {
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return gitRoot;
  } catch {
    return process.cwd();
  }
}

function getCacheKey(projectDir: string, configDir: string): string {
  const combined = `${projectDir}::${configDir}`;
  return createHash("sha256").update(combined).digest("hex").substring(0, 16);
}

function getCacheFilePath(projectDir: string, configDir: string): string {
  const key = getCacheKey(projectDir, configDir);
  return join(getCacheDir(), `selections-${key}.json`);
}

export async function loadSelections(
  projectDir: string,
  configDir: string,
): Promise<Set<string>> {
  const filePath = getCacheFilePath(projectDir, configDir);

  try {
    const content = await readFile(filePath, "utf-8");
    const cache: SelectionCache = JSON.parse(content);

    if (cache.version !== 1) {
      return new Set();
    }

    if (cache.projectDir !== projectDir || cache.configDir !== configDir) {
      return new Set();
    }

    return new Set(cache.selectedConfigs);
  } catch {
    return new Set();
  }
}

export async function saveSelections(
  projectDir: string,
  configDir: string,
  selectedConfigs: string[],
): Promise<void> {
  const filePath = getCacheFilePath(projectDir, configDir);

  if (selectedConfigs.length === 0) {
    await rm(filePath, { force: true });
    return;
  }

  const cacheDir = getCacheDir();
  await mkdir(cacheDir, { recursive: true });

  const cache: SelectionCache = {
    version: 1,
    projectDir,
    configDir,
    lastModified: new Date().toISOString(),
    selectedConfigs,
  };

  await writeFile(filePath, JSON.stringify(cache, null, 2), "utf-8");
}

export async function clearCache(): Promise<void> {
  const cacheDir = getCacheDir();
  try {
    const files = await readdir(cacheDir);
    const cacheFiles = files.filter((file) => file.startsWith("selections-"));
    await Promise.all(
      cacheFiles.map((file) => rm(join(cacheDir, file), { force: true })),
    );
  } catch {
    // Ignore errors if cache directory doesn't exist
  }
}
