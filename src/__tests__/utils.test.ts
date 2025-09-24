import assert from "node:assert";
import { describe, it } from "node:test";
import { formatConfigDisplayName, formatErrorMessage } from "../utils.js";

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

  describe("formatConfigDisplayName", () => {
    it("should return base filename when no servers exist", () => {
      const result = formatConfigDisplayName("my-config.json", []);
      assert.strictEqual(result, "my-config");
    });

    it("should return only server name when single server matches filename", () => {
      const result = formatConfigDisplayName("my-config.json", ["my-config"]);
      assert.strictEqual(result, "my-config");
    });

    it("should return filename → server-name for single server not matching filename", () => {
      const result = formatConfigDisplayName("postgres.json", [
        "postgres-local",
      ]);
      assert.strictEqual(result, "postgres → postgres-local");
    });

    it("should return filename → server1, server2 for multiple servers", () => {
      const result = formatConfigDisplayName("development.json", [
        "filesystem",
        "github",
      ]);
      assert.strictEqual(result, "development → filesystem, github");
    });

    it("should handle case-insensitive .json extension removal", () => {
      const result = formatConfigDisplayName("My-Config.JSON", ["my-config"]);
      assert.strictEqual(result, "My-Config → my-config");
    });

    it("should handle filename without .json extension", () => {
      const result = formatConfigDisplayName("postgres", ["postgres-local"]);
      assert.strictEqual(result, "postgres → postgres-local");
    });

    it("should handle multiple servers with same filename base", () => {
      const result = formatConfigDisplayName("servers.json", ["servers"]);
      assert.strictEqual(result, "servers");
    });

    it("should handle many servers", () => {
      const result = formatConfigDisplayName("all.json", [
        "server1",
        "server2",
        "server3",
        "server4",
      ]);
      assert.strictEqual(result, "all → server1, server2, server3, server4");
    });

    it("should handle empty string filename", () => {
      const result = formatConfigDisplayName("", ["server1"]);
      assert.strictEqual(result, " → server1");
    });

    it("should handle server names with spaces", () => {
      const result = formatConfigDisplayName("config.json", [
        "my server",
        "another server",
      ]);
      assert.strictEqual(result, "config → my server, another server");
    });
  });
});
