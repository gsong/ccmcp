import { Box, Text, useInput } from "ink";
import type React from "react";
import { useState } from "react";
import type { McpConfig } from "../mcp-scanner.js";

interface ErrorDisplayProps {
  config: McpConfig;
  expanded?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  config,
  expanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);

  useInput((_input: string, key: { return?: boolean }) => {
    if (key.return && !config.valid) {
      setIsExpanded(!isExpanded);
    }
  });

  if (config.valid) {
    return null;
  }

  return (
    <Box flexDirection="column" marginLeft={2}>
      <Box>
        <Text color="red">✗ {config.name}</Text>
        <Text dimColor> - {config.description}</Text>
        {!isExpanded && (
          <Text dimColor> (Press Enter to see error details)</Text>
        )}
      </Box>
      {isExpanded && config.error && (
        <Box
          marginTop={1}
          paddingLeft={2}
          borderStyle="single"
          borderColor="red"
        >
          <Box flexDirection="column">
            <Text color="red" bold>
              Error Details:
            </Text>
            <Text color="red">{config.error}</Text>
            <Text dimColor>Path: {config.path}</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};
