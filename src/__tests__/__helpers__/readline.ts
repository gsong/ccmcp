import type { Interface } from "node:readline";
import { vi } from "vitest";

/**
 * Mock readline interface for testing
 */
export interface MockReadlineInterface {
  question: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
}

/**
 * Creates a properly typed mock readline interface
 * @param questionImpl - The implementation for the question method
 * @param onImpl - Optional implementation for the on method
 * @returns Typed mock readline interface
 */
function createMockReadlineInterface(
  questionImpl: (prompt: string, callback: (answer: string) => void) => void,
  onImpl?: (event: string, callback: (...args: unknown[]) => void) => void,
): Interface {
  return {
    question: vi.fn(questionImpl),
    close: vi.fn(),
    on: vi.fn(onImpl),
    terminal: true,
    // Add required Interface properties as no-op functions
    write: vi.fn(),
    setPrompt: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    removeListener: vi.fn(),
    off: vi.fn(),
    removeAllListeners: vi.fn(),
    setMaxListeners: vi.fn(),
    getMaxListeners: vi.fn(),
    listeners: vi.fn(() => []),
    rawListeners: vi.fn(() => []),
    emit: vi.fn(),
    listenerCount: vi.fn(() => 0),
    prependListener: vi.fn(),
    prependOnceListener: vi.fn(),
    eventNames: vi.fn(() => []),
    once: vi.fn(),
    addListener: vi.fn(),
  } as unknown as Interface;
}

/**
 * Sets up readline interface mock with specified user input
 * @param input - The input string the user will provide
 * @returns Mock readline interface for additional expectations
 */
export async function setupReadlineTest(
  input: string,
): Promise<MockReadlineInterface> {
  const mockReadlineInterface = createMockReadlineInterface(
    (_prompt: string, callback: (answer: string) => void) => {
      callback(input);
    },
  );

  vi.mocked(await import("node:readline")).createInterface.mockReturnValue(
    mockReadlineInterface,
  );

  return mockReadlineInterface as unknown as MockReadlineInterface;
}

/**
 * Sets up readline mock that simulates an error
 * @param error - The error to emit
 * @returns Mock readline interface for additional expectations
 */
export async function setupReadlineError(
  error: Error,
): Promise<MockReadlineInterface> {
  const mockReadlineInterface = createMockReadlineInterface(
    vi.fn(),
    (event: string, callback: (error: Error) => void) => {
      if (event === "error") {
        setImmediate(() => callback(error));
      }
    },
  );

  vi.mocked(await import("node:readline")).createInterface.mockReturnValue(
    mockReadlineInterface,
  );

  return mockReadlineInterface as unknown as MockReadlineInterface;
}

/**
 * Sets up readline interface mock for multiple questions/inputs
 * @param inputs - Array of input strings for sequential questions
 * @returns Mock readline interface for additional expectations
 */
export async function setupReadlineMultipleInputs(
  inputs: string[],
): Promise<MockReadlineInterface> {
  let inputIndex = 0;

  const mockReadlineInterface = createMockReadlineInterface(
    (_prompt: string, callback: (answer: string) => void) => {
      const input = inputs[inputIndex] || "";
      inputIndex++;
      callback(input);
    },
  );

  vi.mocked(await import("node:readline")).createInterface.mockReturnValue(
    mockReadlineInterface,
  );

  return mockReadlineInterface as unknown as MockReadlineInterface;
}
