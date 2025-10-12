import { readFile } from "node:fs/promises";
import { Box, Text } from "ink";
import type React from "react";
import { useEffect, useState } from "react";
import type { McpConfig } from "../mcp-scanner.js";

interface ConfigPreviewProps {
  config: McpConfig | null;
  width?: number;
  height?: number;
}

export const ConfigPreview: React.FC<ConfigPreviewProps> = ({
  config,
  width = 40,
  height = 10,
}) => {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!config || !config.valid) {
      setContent("");
      return;
    }

    setLoading(true);
    readFile(config.path, "utf-8")
      .then((fileContent) => {
        try {
          const parsed = JSON.parse(fileContent);
          setContent(JSON.stringify(parsed, null, 2));
        } catch {
          setContent(fileContent);
        }
      })
      .catch((error) => {
        setContent(`Error reading file: ${error.message}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [config]);

  if (!config) {
    return (
      <Box
        width={width}
        height={height}
        borderStyle="single"
        borderColor="gray"
        padding={1}
        flexDirection="column"
      >
        <Text color="cyan">Select a config to preview</Text>
      </Box>
    );
  }

  return (
    <Box
      width={width}
      height={height}
      borderStyle="single"
      borderColor={config.valid ? "green" : "red"}
      padding={1}
      flexDirection="column"
    >
      <Box marginBottom={1}>
        <Text bold color="blue">
          {config.description}
        </Text>
      </Box>

      {loading ? (
        <Text color="cyan">Loading...</Text>
      ) : (
        <Box flexDirection="column" flexGrow={1} overflow="hidden">
          {content
            .split("\n")
            .slice(0, height - 3)
            .map((line, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static file content that won't reorder
              <Text key={`preview-line-${index}`} wrap="truncate">
                {line.length > width - 4
                  ? `${line.slice(0, width - 7)}...`
                  : line}
              </Text>
            ))}
          {content.split("\n").length > height - 3 && (
            <Text color="blue">...</Text>
          )}
        </Box>
      )}
    </Box>
  );
};
