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
        <Text dimColor>Select a config to preview</Text>
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
        <Text bold>{config.name}</Text>
        <Text dimColor> - {config.description}</Text>
      </Box>

      {loading ? (
        <Text dimColor>Loading...</Text>
      ) : (
        <Box flexDirection="column" flexGrow={1} overflow="hidden">
          {content
            .split("\n")
            .slice(0, height - 3)
            .map((line, index) => (
              <Text key={`${index}-${line.slice(0, 20)}`} wrap="truncate">
                {line.length > width - 4
                  ? `${line.slice(0, width - 7)}...`
                  : line}
              </Text>
            ))}
          {content.split("\n").length > height - 3 && <Text dimColor>...</Text>}
        </Box>
      )}
    </Box>
  );
};
