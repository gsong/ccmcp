import { describe, expect, it } from "vitest";
import {
  formatValidationErrors,
  validateMcpConfig,
} from "../schemas/mcp-config.js";

describe("MCP Configuration Schema Validation", () => {
  describe("Valid configurations", () => {
    it("should validate STDIO server configuration", () => {
      const config = {
        mcpServers: {
          browser: {
            type: "stdio",
            command: "mcp-server-browsermcp",
            args: [],
            env: {},
          },
        },
      };

      const result = validateMcpConfig(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeTruthy();
      }
    });

    it("should validate HTTP server configuration", () => {
      const config = {
        mcpServers: {
          context7: {
            type: "http",
            url: "https://mcp.context7.com/mcp",
            headers: {
              CONTEXT7_API_KEY: "test-key",
            },
          },
        },
      };

      const result = validateMcpConfig(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeTruthy();
      }
    });

    it("should validate configuration with description", () => {
      const config = {
        description: "My MCP servers configuration",
        mcpServers: {
          test: {
            type: "stdio",
            command: "node",
            args: ["server.js"],
          },
        },
      };

      const result = validateMcpConfig(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeTruthy();
      }
    });

    it("should validate configuration with both STDIO and HTTP servers", () => {
      const config = {
        mcpServers: {
          browser: {
            type: "stdio",
            command: "mcp-server-browsermcp",
            args: [],
          },
          api: {
            type: "http",
            url: "https://api.example.com/mcp",
          },
        },
      };

      const result = validateMcpConfig(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeTruthy();
      }
    });

    it("should validate legacy STDIO server without type field", () => {
      const config = {
        mcpServers: {
          legacyServer: {
            command: "node",
            args: ["server.js"],
          },
        },
      };

      const result = validateMcpConfig(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeTruthy();
      }
      expect(result.data?.mcpServers?.legacyServer?.type).toBe("stdio");
    });

    it("should validate legacy STDIO server with environment variables", () => {
      const config = {
        mcpServers: {
          legacyServerWithEnv: {
            command: "python",
            args: ["-m", "server"],
            env: {
              PYTHONPATH: "/custom/path",
              DEBUG: "true",
            },
          },
        },
      };

      const result = validateMcpConfig(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeTruthy();
      }
      expect(result.data?.mcpServers?.legacyServerWithEnv?.type).toBe("stdio");
      expect(result.data?.mcpServers?.legacyServerWithEnv?.env).toEqual({
        PYTHONPATH: "/custom/path",
        DEBUG: "true",
      });
    });

    it("should validate mixed legacy and explicit server configurations", () => {
      const config = {
        mcpServers: {
          legacyServer: {
            command: "node",
            args: ["legacy-server.js"],
          },
          modernServer: {
            type: "stdio",
            command: "python",
            args: ["-m", "modern_server"],
          },
          httpServer: {
            type: "http",
            url: "https://api.example.com/mcp",
          },
        },
      };

      const result = validateMcpConfig(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeTruthy();
      }
      expect(result.data?.mcpServers?.legacyServer?.type).toBe("stdio");
      expect(result.data?.mcpServers?.modernServer?.type).toBe("stdio");
      expect(result.data?.mcpServers?.httpServer?.type).toBe("http");
    });
  });

  describe("Invalid configurations", () => {
    it("should accept configuration with only description (mcpServers defaults to empty)", () => {
      const config = {
        description: "Valid config with no servers",
      };

      const result = validateMcpConfig(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeTruthy();
      }
      expect(result.data?.mcpServers).toEqual({});
    });

    it("should reject STDIO server without command", () => {
      const config = {
        mcpServers: {
          invalid: {
            type: "stdio",
            args: [],
          },
        },
      };

      const result = validateMcpConfig(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeTruthy();
      }
      expect(
        result.errors?.some(
          (error) =>
            error.path.includes("command") ||
            error.message.includes("expected string"),
        ),
      ).toBe(true);
    });

    it("should reject STDIO server with empty command", () => {
      const config = {
        mcpServers: {
          invalid: {
            type: "stdio",
            command: "",
            args: [],
          },
        },
      };

      const result = validateMcpConfig(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeTruthy();
      }
      expect(
        result.errors?.some((error) =>
          error.message.includes("Command cannot be empty"),
        ),
      ).toBe(true);
    });

    it("should reject HTTP server without url", () => {
      const config = {
        mcpServers: {
          invalid: {
            type: "http",
          },
        },
      };

      const result = validateMcpConfig(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeTruthy();
      }
      expect(
        result.errors?.some(
          (error) =>
            error.path.includes("url") ||
            error.message.includes("expected string"),
        ),
      ).toBe(true);
    });

    it("should reject HTTP server with invalid url", () => {
      const config = {
        mcpServers: {
          invalid: {
            type: "http",
            url: "not-a-valid-url",
          },
        },
      };

      const result = validateMcpConfig(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeTruthy();
      }
      expect(
        result.errors?.some((error) =>
          error.message.includes("Must be a valid URL"),
        ),
      ).toBe(true);
    });

    it("should reject server with invalid type", () => {
      const config = {
        mcpServers: {
          invalid: {
            type: "invalid-type",
            command: "test",
          },
        },
      };

      const result = validateMcpConfig(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeTruthy();
      }
    });

    it("should reject legacy STDIO server with empty command", () => {
      const config = {
        mcpServers: {
          invalid: {
            command: "",
            args: [],
          },
        },
      };

      const result = validateMcpConfig(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeTruthy();
      }
      expect(
        result.errors?.some((error) =>
          error.message.includes("Command cannot be empty"),
        ),
      ).toBe(true);
    });

    it("should reject legacy STDIO server without command", () => {
      const config = {
        mcpServers: {
          invalid: {
            args: ["--flag"],
          },
        },
      };

      const result = validateMcpConfig(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeTruthy();
      }
      expect(
        result.errors?.some(
          (error) =>
            error.path.includes("command") ||
            error.message.includes("expected string"),
        ),
      ).toBe(true);
    });

    it("should reject non-object configuration", () => {
      const result = validateMcpConfig("invalid");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeTruthy();
      }
    });

    it("should reject null configuration", () => {
      const result = validateMcpConfig(null);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeTruthy();
      }
    });

    it("should accept empty object configuration", () => {
      const result = validateMcpConfig({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeTruthy();
      }
      expect(result.data?.mcpServers).toEqual({});
    });
  });

  describe("Error message formatting", () => {
    it("should format single validation error", () => {
      const config = {
        mcpServers: {
          invalid: {
            type: "stdio",
            command: "",
          },
        },
      };

      const result = validateMcpConfig(config);
      expect(result.success).toBe(false);

      if (!result.success && result.errors) {
        const formattedError = formatValidationErrors(result.errors);
        expect(typeof formattedError).toBe("string");
        expect(formattedError.length).toBeGreaterThan(0);
        expect(formattedError).not.toContain("Multiple validation errors");
      }
    });

    it("should format multiple validation errors", () => {
      const config = {
        mcpServers: {
          invalid1: {
            type: "stdio",
            command: "",
          },
          invalid2: {
            type: "http",
            url: "invalid-url",
          },
        },
      };

      const result = validateMcpConfig(config);
      expect(result.success).toBe(false);

      if (!result.success && result.errors && result.errors.length > 1) {
        const formattedError = formatValidationErrors(result.errors);
        expect(formattedError).toContain("Multiple validation errors");
        expect(formattedError).toContain("  - ");
      }
    });

    it("should format empty errors array", () => {
      const formattedError = formatValidationErrors([]);
      expect(formattedError).toBe("Unknown validation error");
    });
  });

  describe("Edge cases", () => {
    it("should handle args field with various types", () => {
      const config = {
        mcpServers: {
          test: {
            type: "stdio",
            command: "node",
            args: ["--flag", "value", "123"],
          },
        },
      };

      const result = validateMcpConfig(config);
      expect(result.success).toBe(true);
    });

    it("should handle env field with string values only", () => {
      const config = {
        mcpServers: {
          test: {
            type: "stdio",
            command: "node",
            env: {
              STRING_VAL: "value",
              NUMBER_AS_STRING: "123",
              BOOLEAN_AS_STRING: "true",
            },
          },
        },
      };

      const result = validateMcpConfig(config);
      expect(result.success).toBe(true);
    });
  });
});
