/**
 * Test helper for TTY environment setup and cleanup
 */

/**
 * Sets up TTY environment for testing
 * @param stdin - Whether stdin should be TTY (default: false)
 * @param stdout - Whether stdout should be TTY (default: false)
 * @returns Cleanup function to restore original TTY state
 */
export function setupTTYEnvironment(stdin = false, stdout = false): () => void {
  const originalStdinTTY = process.stdin.isTTY;
  const originalStdoutTTY = process.stdout.isTTY;

  Object.defineProperty(process.stdin, "isTTY", {
    value: stdin,
    configurable: true,
  });
  Object.defineProperty(process.stdout, "isTTY", {
    value: stdout,
    configurable: true,
  });

  return () => {
    if (originalStdinTTY !== undefined) {
      Object.defineProperty(process.stdin, "isTTY", {
        value: originalStdinTTY,
        configurable: true,
      });
    }
    if (originalStdoutTTY !== undefined) {
      Object.defineProperty(process.stdout, "isTTY", {
        value: originalStdoutTTY,
        configurable: true,
      });
    }
  };
}

/**
 * Sets up non-TTY environment (both stdin and stdout set to false)
 * @returns Cleanup function to restore original TTY state
 */
export function setupNonTTYEnvironment(): () => void {
  return setupTTYEnvironment(false, false);
}

/**
 * Sets up full TTY environment (both stdin and stdout set to true)
 * @returns Cleanup function to restore original TTY state
 */
export function setupFullTTYEnvironment(): () => void {
  return setupTTYEnvironment(true, true);
}
