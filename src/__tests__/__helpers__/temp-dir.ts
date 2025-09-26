import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Creates a unique test directory path
 * @param prefix - Prefix for the directory name (default: 'ccmcp-test')
 * @returns Unique directory path
 */
export function createUniqueTestDir(prefix = "ccmcp-test"): string {
  return join(
    tmpdir(),
    `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
  );
}

/**
 * Executes a test function with a temporary directory, ensuring cleanup
 * @param testFn - Test function that receives the temp directory path
 * @param prefix - Prefix for the directory name (default: 'ccmcp-test')
 * @returns Result of the test function
 */
export async function withTempDir<T>(
  testFn: (dir: string) => Promise<T>,
  prefix?: string,
): Promise<T> {
  const testDir = createUniqueTestDir(prefix);
  try {
    return await testFn(testDir);
  } finally {
    try {
      await rm(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors - directory might not exist or be accessible
    }
  }
}

/**
 * Cleanup helper for removing temporary directories
 * @param dir - Directory to remove
 */
export async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await rm(dir, { recursive: true });
  } catch {
    // Ignore cleanup errors - directory might not exist or be accessible
  }
}
