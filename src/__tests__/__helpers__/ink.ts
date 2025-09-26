import type { Instance } from "ink";
import { vi } from "vitest";

/**
 * Mock ink render result for testing
 */
export interface MockInkRender {
  waitUntilExit: ReturnType<typeof vi.fn>;
}

/**
 * Creates a properly typed mock for Ink's render function
 * @param waitUntilExitImpl - Implementation for waitUntilExit method
 * @returns Typed mock render result
 */
function createMockInkRender(
  waitUntilExitImpl?: () => Promise<void>,
): Instance {
  return {
    waitUntilExit: vi.fn(waitUntilExitImpl || (() => Promise.resolve())),
    rerender: vi.fn(),
    unmount: vi.fn(),
    cleanup: vi.fn(),
    clear: vi.fn(),
  };
}

/**
 * Sets up Ink render mock for testing
 * @param waitUntilExitImpl - Optional implementation for waitUntilExit
 * @returns Mock render function for additional expectations
 */
export async function setupInkRenderTest(
  waitUntilExitImpl?: () => Promise<void>,
): Promise<ReturnType<typeof vi.fn>> {
  const mockRender = vi.fn(() => createMockInkRender(waitUntilExitImpl));

  vi.mocked(await import("ink")).render.mockImplementation(mockRender);

  return mockRender;
}
