import assert from "node:assert";
import { describe, it } from "node:test";
import { formatErrorMessage } from "../utils.js";

describe("Utility Functions", () => {
  describe("formatErrorMessage", () => {
    it("should return error message for Error instances", () => {
      const error = new Error("Test error message");
      const result = formatErrorMessage(error);
      assert.strictEqual(result, "Test error message");
    });

    it("should return 'Unknown error' for non-Error values", () => {
      const result = formatErrorMessage("string error");
      assert.strictEqual(result, "Unknown error");
    });

    it("should return 'Unknown error' for null", () => {
      const result = formatErrorMessage(null);
      assert.strictEqual(result, "Unknown error");
    });

    it("should return 'Unknown error' for undefined", () => {
      const result = formatErrorMessage(undefined);
      assert.strictEqual(result, "Unknown error");
    });

    it("should return 'Unknown error' for objects", () => {
      const result = formatErrorMessage({ message: "error" });
      assert.strictEqual(result, "Unknown error");
    });
  });
});
