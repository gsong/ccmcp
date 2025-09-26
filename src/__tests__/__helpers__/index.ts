/**
 * Test helpers for ccmcp test suite
 *
 * This module provides reusable test utilities to reduce code duplication
 * and improve test maintainability across the test suite.
 */

// Async operation helpers
export { delay, waitForAsync, waitForCondition } from "./async.js";
// Child process mocking helpers
export {
  asMockChildProcess,
  createMockChildProcess,
  createMockChildProcessWithError,
  createMockChildProcessWithEvents,
  type MockChildProcess,
} from "./child-process.js";
// Ink mocking helpers
export { type MockInkRender, setupInkRenderTest } from "./ink.js";
// Readline mocking helpers
export {
  type MockReadlineInterface,
  setupReadlineError,
  setupReadlineMultipleInputs,
  setupReadlineTest,
} from "./readline.js";
// Temporary directory helpers
export {
  cleanupTempDir,
  createUniqueTestDir,
  withTempDir,
} from "./temp-dir.js";
// TTY environment helpers
export {
  setupFullTTYEnvironment,
  setupNonTTYEnvironment,
  setupTTYEnvironment,
} from "./tty.js";
