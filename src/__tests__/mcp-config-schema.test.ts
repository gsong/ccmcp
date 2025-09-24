import assert from "node:assert";
import { describe, it } from "node:test";
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
      assert.strictEqual(result.success, true);
      assert.ok(result.data);
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
      assert.strictEqual(result.success, true);
      assert.ok(result.data);
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
      assert.strictEqual(result.success, true);
      assert.ok(result.data);
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
      assert.strictEqual(result.success, true);
      assert.ok(result.data);
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
      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.mcpServers?.legacyServer?.type, "stdio");
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
      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(
        result.data.mcpServers?.legacyServerWithEnv?.type,
        "stdio",
      );
      assert.deepStrictEqual(result.data.mcpServers?.legacyServerWithEnv?.env, {
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
      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.mcpServers?.legacyServer?.type, "stdio");
      assert.strictEqual(result.data.mcpServers?.modernServer?.type, "stdio");
      assert.strictEqual(result.data.mcpServers?.httpServer?.type, "http");
    });
  });

  describe("Invalid configurations", () => {
    it("should accept configuration with only description (mcpServers defaults to empty)", () => {
      const config = {
        description: "Valid config with no servers",
      };

      const result = validateMcpConfig(config);
      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.deepStrictEqual(result.data.mcpServers, {});
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
      assert.strictEqual(result.success, false);
      assert.ok(result.errors);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path.includes("command") ||
            error.message.includes("expected string"),
        ),
      );
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
      assert.strictEqual(result.success, false);
      assert.ok(result.errors);
      assert.ok(
        result.errors.some((error) =>
          error.message.includes("Command cannot be empty"),
        ),
      );
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
      assert.strictEqual(result.success, false);
      assert.ok(result.errors);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path.includes("url") ||
            error.message.includes("expected string"),
        ),
      );
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
      assert.strictEqual(result.success, false);
      assert.ok(result.errors);
      assert.ok(
        result.errors.some((error) =>
          error.message.includes("Must be a valid URL"),
        ),
      );
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
      assert.strictEqual(result.success, false);
      assert.ok(result.errors);
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
      assert.strictEqual(result.success, false);
      assert.ok(result.errors);
      assert.ok(
        result.errors.some((error) =>
          error.message.includes("Command cannot be empty"),
        ),
      );
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
      assert.strictEqual(result.success, false);
      assert.ok(result.errors);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path.includes("command") ||
            error.message.includes("expected string"),
        ),
      );
    });

    it("should reject non-object configuration", () => {
      const result = validateMcpConfig("invalid");
      assert.strictEqual(result.success, false);
      assert.ok(result.errors);
    });

    it("should reject null configuration", () => {
      const result = validateMcpConfig(null);
      assert.strictEqual(result.success, false);
      assert.ok(result.errors);
    });

    it("should accept empty object configuration", () => {
      const result = validateMcpConfig({});
      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.deepStrictEqual(result.data.mcpServers, {});
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
      assert.strictEqual(result.success, false);

      if (result.errors) {
        const formattedError = formatValidationErrors(result.errors);
        assert.ok(typeof formattedError === "string");
        assert.ok(formattedError.length > 0);
        assert.ok(!formattedError.includes("Multiple validation errors"));
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
      assert.strictEqual(result.success, false);

      if (result.errors && result.errors.length > 1) {
        const formattedError = formatValidationErrors(result.errors);
        assert.ok(formattedError.includes("Multiple validation errors"));
        assert.ok(formattedError.includes("  - "));
      }
    });

    it("should format empty errors array", () => {
      const formattedError = formatValidationErrors([]);
      assert.strictEqual(formattedError, "Unknown validation error");
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
      assert.strictEqual(result.success, true);
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
      assert.strictEqual(result.success, true);
    });
  });
});
