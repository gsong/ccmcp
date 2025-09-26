/**
 * Test helper for async operations and timing
 */

/**
 * Waits for async operations to complete with error handling
 * @param ms - Milliseconds to wait (default: 50)
 * @returns Promise that resolves after the specified time
 */
export function waitForAsync(ms = 50): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        resolve(undefined);
      } catch {
        // Expected - process.exit mock or other errors may occur
        resolve(undefined);
      }
    }, ms);
  });
}

/**
 * Waits for a condition to be true with timeout
 * @param condition - Function that returns true when condition is met
 * @param timeoutMs - Maximum time to wait in milliseconds (default: 1000)
 * @param intervalMs - Check interval in milliseconds (default: 10)
 * @returns Promise that resolves when condition is met or rejects on timeout
 */
export function waitForCondition(
  condition: () => boolean,
  timeoutMs = 1000,
  intervalMs = 10,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      if (condition()) {
        resolve();
        return;
      }

      if (Date.now() - startTime > timeoutMs) {
        reject(new Error(`Condition not met within ${timeoutMs}ms`));
        return;
      }

      setTimeout(check, intervalMs);
    };

    check();
  });
}

/**
 * Creates a delayed promise for testing timing-dependent operations
 * @param ms - Delay in milliseconds
 * @param value - Value to resolve with
 * @returns Promise that resolves with the value after the delay
 */
export function delay<T>(ms: number, value?: T): Promise<T | undefined> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });
}
