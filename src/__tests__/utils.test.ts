import { describe, expect, it } from "vitest";
import { formatConfigDisplayName, formatErrorMessage } from "../utils.js";

describe("Utility Functions", () => {
  describe("formatErrorMessage", () => {
    it("should return error message for Error instances", () => {
      const error = new Error("Test error message");
      const result = formatErrorMessage(error);
      expect(result).toBe("Test error message");
    });

    it("should return 'Unknown error' for non-Error values", () => {
      const result = formatErrorMessage("string error");
      expect(result).toBe("Unknown error");
    });

    it("should return 'Unknown error' for null", () => {
      const result = formatErrorMessage(null);
      expect(result).toBe("Unknown error");
    });

    it("should return 'Unknown error' for undefined", () => {
      const result = formatErrorMessage(undefined);
      expect(result).toBe("Unknown error");
    });

    it("should return 'Unknown error' for objects", () => {
      const result = formatErrorMessage({ message: "error" });
      expect(result).toBe("Unknown error");
    });
  });

  describe("formatConfigDisplayName", () => {
    it("should return base filename when no servers exist", () => {
      const result = formatConfigDisplayName("my-config.json", []);
      expect(result).toBe("my-config");
    });

    it("should return only server name when single server matches filename", () => {
      const result = formatConfigDisplayName("my-config.json", ["my-config"]);
      expect(result).toBe("my-config");
    });

    it("should return filename → server-name for single server not matching filename", () => {
      const result = formatConfigDisplayName("postgres.json", [
        "postgres-local",
      ]);
      expect(result).toBe("postgres → postgres-local");
    });

    it("should return filename → server1, server2 for multiple servers", () => {
      const result = formatConfigDisplayName("development.json", [
        "filesystem",
        "github",
      ]);
      expect(result).toBe("development → filesystem, github");
    });

    it("should handle case-insensitive .json extension removal", () => {
      const result = formatConfigDisplayName("My-Config.JSON", ["my-config"]);
      expect(result).toBe("My-Config → my-config");
    });

    it("should handle filename without .json extension", () => {
      const result = formatConfigDisplayName("postgres", ["postgres-local"]);
      expect(result).toBe("postgres → postgres-local");
    });

    it("should handle multiple servers with same filename base", () => {
      const result = formatConfigDisplayName("servers.json", ["servers"]);
      expect(result).toBe("servers");
    });

    it("should handle many servers", () => {
      const result = formatConfigDisplayName("all.json", [
        "server1",
        "server2",
        "server3",
        "server4",
      ]);
      expect(result).toBe("all → server1, server2, server3, server4");
    });

    it("should handle empty string filename", () => {
      const result = formatConfigDisplayName("", ["server1"]);
      expect(result).toBe(" → server1");
    });

    it("should handle server names with spaces", () => {
      const result = formatConfigDisplayName("config.json", [
        "my server",
        "another server",
      ]);
      expect(result).toBe("config → my server, another server");
    });
  });
});
