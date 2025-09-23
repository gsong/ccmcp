import { Box, Text } from "ink";
import type React from "react";
import type { McpConfig } from "../mcp-scanner.js";

interface ErrorDisplayProps {
  config: McpConfig;
  expanded?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  config,
  expanded = false,
}) => {
  if (config.valid) {
    return null;
  }

  return (
    <Box flexDirection="column" marginLeft={2}>
      <Box>
        <Text color="red">✗ {config.name}</Text>
        <Text color="blue"> - {config.description}</Text>
        {!expanded && (
          <Text color="magenta"> (Press 'e' to see error details)</Text>
        )}
      </Box>
      {expanded && config.error && (
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
            <Text color="yellow">Path: {config.path}</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};
