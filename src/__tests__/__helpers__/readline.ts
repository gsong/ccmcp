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
 * Sets up readline interface mock with specified user input
 * @param input - The input string the user will provide
 * @returns Mock readline interface for additional expectations
 */
export async function setupReadlineTest(
  input: string,
): Promise<MockReadlineInterface> {
  const mockReadlineInterface: MockReadlineInterface = {
    question: vi.fn((_prompt: string, callback: (answer: string) => void) => {
      callback(input);
    }),
    close: vi.fn(),
    on: vi.fn(),
  };

  vi.mocked(await import("node:readline")).createInterface.mockReturnValue(
    // biome-ignore lint/suspicious/noExplicitAny: mocking complex Node.js readline interface
    mockReadlineInterface as any,
  );

  return mockReadlineInterface;
}

/**
 * Sets up readline mock that simulates an error
 * @param error - The error to emit
 * @returns Mock readline interface for additional expectations
 */
export async function setupReadlineError(
  error: Error,
): Promise<MockReadlineInterface> {
  const mockReadlineInterface: MockReadlineInterface = {
    question: vi.fn(),
    close: vi.fn(),
    on: vi.fn((event: string, callback: (error: Error) => void) => {
      if (event === "error") {
        setImmediate(() => callback(error));
      }
    }),
  };

  vi.mocked(await import("node:readline")).createInterface.mockReturnValue(
    // biome-ignore lint/suspicious/noExplicitAny: mocking complex Node.js readline interface
    mockReadlineInterface as any,
  );

  return mockReadlineInterface;
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

  const mockReadlineInterface: MockReadlineInterface = {
    question: vi.fn((_prompt: string, callback: (answer: string) => void) => {
      const input = inputs[inputIndex] || "";
      inputIndex++;
      callback(input);
    }),
    close: vi.fn(),
    on: vi.fn(),
  };

  vi.mocked(await import("node:readline")).createInterface.mockReturnValue(
    // biome-ignore lint/suspicious/noExplicitAny: mocking complex Node.js readline interface
    mockReadlineInterface as any,
  );

  return mockReadlineInterface;
}
