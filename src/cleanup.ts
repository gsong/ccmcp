import {
  access,
  readdir,
  readFile,
  readlink,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { getCacheDir, type SelectionCache } from "./selection-cache.js";

export interface CleanupOptions {
  configDir: string;
  dryRun?: boolean;
  yes?: boolean;
  verbose?: boolean;
}

export interface CleanupResult {
  staleCacheEntries: number;
  invalidServerReferences: number;
  brokenSymlinks: number;
  totalCacheFilesBefore: number;
  totalCacheFilesAfter: number;
  errors: string[];
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function isSymlinkBroken(filePath: string): Promise<boolean> {
  try {
    const stats = await stat(filePath);
    if (!stats.isSymbolicLink()) {
      return false;
    }

    const target = await readlink(filePath);
    const targetPath = target.startsWith("/")
      ? target
      : join(filePath, "..", target);

    return !(await fileExists(targetPath));
  } catch {
    return true;
  }
}

async function getAllCacheFiles(): Promise<string[]> {
  const cacheDir = getCacheDir();
  try {
    const files = await readdir(cacheDir);
    return files
      .filter(
        (file) => file.startsWith("selections-") && file.endsWith(".json"),
      )
      .map((file) => join(cacheDir, file));
  } catch {
    return [];
  }
}

async function loadCacheFile(filePath: string): Promise<SelectionCache | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    const cache: SelectionCache = JSON.parse(content);

    if (cache.version !== 1) {
      return null;
    }

    return cache;
  } catch {
    return null;
  }
}

async function promptUser(message: string): Promise<boolean> {
  const readline = await import("node:readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} [Y/n] `, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === "" || normalized === "y" || normalized === "yes");
    });
  });
}

async function cleanupStaleCacheEntries(
  options: CleanupOptions,
  result: CleanupResult,
): Promise<void> {
  const cacheFiles = await getAllCacheFiles();
  const staleFiles: Array<{ path: string; projectDir: string }> = [];

  for (const filePath of cacheFiles) {
    const cache = await loadCacheFile(filePath);
    if (!cache) continue;

    const projectExists = await fileExists(cache.projectDir);
    if (!projectExists) {
      staleFiles.push({ path: filePath, projectDir: cache.projectDir });
    }
  }

  if (staleFiles.length === 0) {
    if (options.verbose) {
      console.log("No stale cache entries found.");
    }
    return;
  }

  if (!options.yes) {
    console.log(
      `\nFound ${staleFiles.length} stale cache ${staleFiles.length === 1 ? "entry" : "entries"}:`,
    );
    for (const { projectDir } of staleFiles) {
      console.log(`  - ${projectDir} (doesn't exist)`);
    }
    console.log("");

    if (options.dryRun) {
      console.log("[DRY RUN] Would remove these cache entries");
      result.staleCacheEntries = staleFiles.length;
      return;
    }

    const shouldProceed = await promptUser("Remove these cache entries?");
    if (!shouldProceed) {
      console.log("Skipped removing stale cache entries.");
      return;
    }
  }

  if (options.dryRun) {
    console.log(
      `[DRY RUN] Would remove ${staleFiles.length} stale cache ${staleFiles.length === 1 ? "entry" : "entries"}`,
    );
    result.staleCacheEntries = staleFiles.length;
    return;
  }

  for (const { path } of staleFiles) {
    try {
      await rm(path, { force: true });
      result.staleCacheEntries++;
      if (options.verbose) {
        console.log(`Removed: ${path}`);
      }
    } catch (error) {
      result.errors.push(`Failed to remove ${path}: ${error}`);
    }
  }

  if (options.verbose && result.staleCacheEntries > 0) {
    console.log(
      `Removed ${result.staleCacheEntries} stale cache ${result.staleCacheEntries === 1 ? "entry" : "entries"}.`,
    );
  }
}

async function cleanupInvalidServerReferences(
  options: CleanupOptions,
  result: CleanupResult,
): Promise<void> {
  const cacheFiles = await getAllCacheFiles();
  const filesToUpdate: Array<{
    path: string;
    cache: SelectionCache;
    invalidConfigs: string[];
  }> = [];

  for (const filePath of cacheFiles) {
    const cache = await loadCacheFile(filePath);
    if (!cache) continue;

    const projectExists = await fileExists(cache.projectDir);
    if (!projectExists) continue;

    const invalidConfigs: string[] = [];
    for (const configName of cache.selectedConfigs) {
      const configPath = join(cache.configDir, `${configName}.json`);
      const exists = await fileExists(configPath);
      if (!exists) {
        invalidConfigs.push(configName);
      }
    }

    if (invalidConfigs.length > 0) {
      filesToUpdate.push({ path: filePath, cache, invalidConfigs });
    }
  }

  if (filesToUpdate.length === 0) {
    if (options.verbose) {
      console.log("No invalid server references found.");
    }
    return;
  }

  if (!options.yes) {
    console.log(
      `\nFound invalid server references in ${filesToUpdate.length} cache ${filesToUpdate.length === 1 ? "file" : "files"}:`,
    );
    for (const { cache, invalidConfigs } of filesToUpdate) {
      console.log(`  - ${cache.projectDir}:`);
      for (const config of invalidConfigs) {
        console.log(`    • ${config} (config file doesn't exist)`);
      }
    }
    console.log("");

    if (options.dryRun) {
      const totalInvalid = filesToUpdate.reduce(
        (sum, f) => sum + f.invalidConfigs.length,
        0,
      );
      console.log(
        `[DRY RUN] Would remove ${totalInvalid} invalid ${totalInvalid === 1 ? "reference" : "references"}`,
      );
      result.invalidServerReferences = totalInvalid;
      return;
    }

    const shouldProceed = await promptUser(
      "Update cache files to remove invalid references?",
    );
    if (!shouldProceed) {
      console.log("Skipped removing invalid server references.");
      return;
    }
  }

  if (options.dryRun) {
    const totalInvalid = filesToUpdate.reduce(
      (sum, f) => sum + f.invalidConfigs.length,
      0,
    );
    console.log(
      `[DRY RUN] Would remove ${totalInvalid} invalid ${totalInvalid === 1 ? "reference" : "references"}`,
    );
    result.invalidServerReferences = totalInvalid;
    return;
  }

  for (const { path, cache, invalidConfigs } of filesToUpdate) {
    try {
      const validConfigs = cache.selectedConfigs.filter(
        (config) => !invalidConfigs.includes(config),
      );

      if (validConfigs.length === 0) {
        await rm(path, { force: true });
        if (options.verbose) {
          console.log(
            `Removed cache file (no valid configs remaining): ${path}`,
          );
        }
      } else {
        const updatedCache: SelectionCache = {
          ...cache,
          selectedConfigs: validConfigs,
          lastModified: new Date().toISOString(),
        };
        await writeFile(path, JSON.stringify(updatedCache, null, 2), "utf-8");
        if (options.verbose) {
          console.log(
            `Updated: ${path} (removed ${invalidConfigs.length} invalid ${invalidConfigs.length === 1 ? "reference" : "references"})`,
          );
        }
      }

      result.invalidServerReferences += invalidConfigs.length;
    } catch (error) {
      result.errors.push(`Failed to update ${path}: ${error}`);
    }
  }

  if (options.verbose && result.invalidServerReferences > 0) {
    console.log(
      `Removed ${result.invalidServerReferences} invalid server ${result.invalidServerReferences === 1 ? "reference" : "references"}.`,
    );
  }
}

async function cleanupBrokenSymlinks(
  options: CleanupOptions,
  result: CleanupResult,
): Promise<void> {
  try {
    const files = await readdir(options.configDir);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));
    const brokenLinks: string[] = [];

    for (const file of jsonFiles) {
      const filePath = join(options.configDir, file);
      const isBroken = await isSymlinkBroken(filePath);
      if (isBroken) {
        brokenLinks.push(filePath);
      }
    }

    if (brokenLinks.length === 0) {
      if (options.verbose) {
        console.log("No broken symlinks found.");
      }
      return;
    }

    if (!options.yes) {
      console.log(
        `\nFound ${brokenLinks.length} broken ${brokenLinks.length === 1 ? "symlink" : "symlinks"}:`,
      );
      for (const link of brokenLinks) {
        console.log(`  - ${link}`);
      }
      console.log("");

      if (options.dryRun) {
        console.log(
          `[DRY RUN] Would remove ${brokenLinks.length} broken ${brokenLinks.length === 1 ? "symlink" : "symlinks"}`,
        );
        result.brokenSymlinks = brokenLinks.length;
        return;
      }

      const shouldProceed = await promptUser("Remove these broken symlinks?");
      if (!shouldProceed) {
        console.log("Skipped removing broken symlinks.");
        return;
      }
    }

    if (options.dryRun) {
      console.log(
        `[DRY RUN] Would remove ${brokenLinks.length} broken ${brokenLinks.length === 1 ? "symlink" : "symlinks"}`,
      );
      result.brokenSymlinks = brokenLinks.length;
      return;
    }

    for (const link of brokenLinks) {
      try {
        await rm(link, { force: true });
        result.brokenSymlinks++;
        if (options.verbose) {
          console.log(`Removed: ${link}`);
        }
      } catch (error) {
        result.errors.push(`Failed to remove ${link}: ${error}`);
      }
    }

    if (options.verbose && result.brokenSymlinks > 0) {
      console.log(
        `Removed ${result.brokenSymlinks} broken ${result.brokenSymlinks === 1 ? "symlink" : "symlinks"}.`,
      );
    }
  } catch (error) {
    if (options.verbose) {
      console.log(`Could not scan config directory: ${error}`);
    }
  }
}

export async function cleanupCache(
  options: CleanupOptions,
): Promise<CleanupResult> {
  const result: CleanupResult = {
    staleCacheEntries: 0,
    invalidServerReferences: 0,
    brokenSymlinks: 0,
    totalCacheFilesBefore: 0,
    totalCacheFilesAfter: 0,
    errors: [],
  };

  const cacheFilesBefore = await getAllCacheFiles();
  result.totalCacheFilesBefore = cacheFilesBefore.length;

  if (options.verbose) {
    console.log(`Starting cleanup${options.dryRun ? " (DRY RUN)" : ""}...`);
    console.log(`Config directory: ${options.configDir}`);
    console.log(`Cache directory: ${getCacheDir()}`);
    console.log(`Current cache files: ${result.totalCacheFilesBefore}\n`);
  }

  await cleanupStaleCacheEntries(options, result);
  await cleanupInvalidServerReferences(options, result);
  await cleanupBrokenSymlinks(options, result);

  const cacheFilesAfter = await getAllCacheFiles();
  result.totalCacheFilesAfter = cacheFilesAfter.length;

  return result;
}
