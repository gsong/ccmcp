import type { Instance } from "ink";
import { vi } from "vitest";

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
 * Installs a mock for Ink's render function
 * @param waitUntilExitImpl - Optional implementation for waitUntilExit
 * @returns Mock render function for additional expectations
 */
export async function mockInkRender(
  waitUntilExitImpl?: () => Promise<void>,
): Promise<ReturnType<typeof vi.fn>> {
  const mockRender = vi.fn(() => createMockInkRender(waitUntilExitImpl));

  vi.mocked(await import("ink")).render.mockImplementation(mockRender);

  return mockRender;
}
