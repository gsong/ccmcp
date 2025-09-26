import type { ChildProcess } from "node:child_process";
import { vi } from "vitest";

/**
 * Mock child process interface for testing
 */
export interface MockChildProcess {
  on: ReturnType<typeof vi.fn>;
  stdout: { on: ReturnType<typeof vi.fn> };
  stderr: { on: ReturnType<typeof vi.fn> };
}

/**
 * Creates a mock child process that exits successfully
 * @param exitCode - Exit code to simulate (default: 0)
 * @param signal - Signal to simulate (default: null)
 * @returns Mock child process
 */
export function createMockChildProcess(
  exitCode = 0,
  signal: string | null = null,
): MockChildProcess {
  const mockChild: MockChildProcess = {
    on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      if (event === "exit") {
        setImmediate(() => callback(exitCode, signal));
      }
      return mockChild;
    }),
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
  };

  return mockChild;
}

/**
 * Creates a mock child process that emits an error
 * @param error - Error to emit
 * @returns Mock child process
 */
export function createMockChildProcessWithError(
  error: Error,
): MockChildProcess {
  const mockChild: MockChildProcess = {
    on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      if (event === "error") {
        setImmediate(() => callback(error));
      }
      return mockChild;
    }),
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
  };

  return mockChild;
}

/**
 * Creates a mock child process with custom event handling
 * @param eventHandlers - Map of event names to handler functions
 * @returns Mock child process
 */
export function createMockChildProcessWithEvents(
  eventHandlers: Record<string, (...args: unknown[]) => void>,
): MockChildProcess {
  const mockChild: MockChildProcess = {
    on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      const handler = eventHandlers[event];
      if (handler) {
        setImmediate(() => handler(callback));
      }
      return mockChild;
    }),
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
  };

  return mockChild;
}

/**
 * Converts mock child process to ChildProcess type for compatibility
 * @param mockChild - Mock child process
 * @returns Mock child process cast as ChildProcess
 */
export function asMockChildProcess(mockChild: MockChildProcess): ChildProcess {
  return mockChild as unknown as ChildProcess;
}
